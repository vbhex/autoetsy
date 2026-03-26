/**
 * Etsy OAuth 2.0 + PKCE — verify API key, obtain tokens, resolve shop_id.
 *
 * Usage:
 *   node dist/tasks/setup-auth.js ping
 *   node dist/tasks/setup-auth.js login
 *   node dist/tasks/setup-auth.js refresh
 *   node dist/tasks/setup-auth.js status
 *
 * Before `login`: register ETSY_OAUTH_REDIRECT_URI exactly in Etsy app settings.
 * Use http://localhost:PORT/... — Etsy often returns 400 when saving 127.0.0.1.
 */
import * as http from 'http';
import * as path from 'path';
import { URL } from 'url';
import { loadConfig } from '../config';
import {
  exchangeAuthorizationCode,
  getMe,
  getShop,
  getShopsForUser,
  openapiPing,
  pickShop,
  refreshAccessToken,
  userIdFromAccessToken,
} from '../etsy/client';
import { generatePkcePair, randomState } from '../etsy/pkce';
import { clearPending, readPending, readTokens, tokensPath, writePending, writeTokens } from '../etsy/token-store';
import type { EtsyTokensFile } from '../etsy/types';

const SCOPES = ['listings_r', 'listings_w', 'listings_d', 'shops_r', 'shops_w'].join(' ');

function projectRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function cmdPing(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.etsy.apiKey || !cfg.etsy.sharedSecret) {
    throw new Error('Set ETSY_API_KEY and ETSY_SHARED_SECRET in .env');
  }
  const data = await openapiPing(cfg.etsy.apiKey, cfg.etsy.sharedSecret);
  log(`API key OK — openapi-ping: ${JSON.stringify(data)}`);
}

function buildAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const u = new URL('https://www.etsy.com/oauth/connect');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', SCOPES);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('state', state);
  u.searchParams.set('code_challenge', codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

async function saveTokensFromResponse(
  cfg: ReturnType<typeof loadConfig>,
  tokenRes: { access_token: string; refresh_token: string; expires_in: number }
): Promise<void> {
  const userId = userIdFromAccessToken(tokenRes.access_token);
  const me = await getMe(tokenRes.access_token, cfg.etsy.apiKey, cfg.etsy.sharedSecret);

  let shopId: string | undefined = me.shop_id != null ? String(me.shop_id) : undefined;
  let shopName: string | undefined = me.shop_name;

  if (!shopId || cfg.etsy.shopSlug) {
    const shops = await getShopsForUser(userId, tokenRes.access_token, cfg.etsy.apiKey, cfg.etsy.sharedSecret);
    const picked = pickShop(shops, cfg.etsy.shopSlug);
    if (picked) {
      shopId = String(picked.shop_id);
      shopName = picked.shop_name || picked.title || shopName;
    }
  }

  if (!shopId) {
    throw new Error(
      `No shop_id for Etsy user_id=${userId}. ` +
        `Use the Etsy account that **opened Shop Manager** for ${cfg.etsy.shopSlug || 'your shop'} (etsy.com/sell), ` +
        `or finish opening your shop, then run login again.`
    );
  }

  if (!shopName) {
    try {
      const detail = await getShop(shopId, tokenRes.access_token, cfg.etsy.apiKey, cfg.etsy.sharedSecret);
      shopName = detail.shop_name || detail.title;
    } catch {
      /* keep undefined */
    }
  }
  if (!shopName && cfg.etsy.shopSlug) {
    shopName = cfg.etsy.shopSlug;
  }

  const file: EtsyTokensFile = {
    access_token: tokenRes.access_token,
    refresh_token: tokenRes.refresh_token,
    expires_at_ms: Date.now() + tokenRes.expires_in * 1000 - 60_000,
    user_id: userId,
    shop_id: shopId,
    shop_name: shopName,
    updated_at: new Date().toISOString(),
  };
  writeTokens(projectRoot(), file);
  log(`Saved tokens → ${tokensPath(projectRoot())}`);
  log(`Add to .env: ETSY_SHOP_ID=${file.shop_id}`);
  log(`Shop: ${file.shop_name || '(no name)'} (id ${file.shop_id})`);
}

async function cmdLogin(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.etsy.apiKey || !cfg.etsy.sharedSecret) {
    throw new Error('Set ETSY_API_KEY and ETSY_SHARED_SECRET in .env');
  }
  const redirectUri =
    process.env.ETSY_OAUTH_REDIRECT_URI || 'http://localhost:3456/oauth/callback';
  const urlObj = new URL(redirectUri);
  const port = parseInt(process.env.ETSY_OAUTH_PORT || urlObj.port || '3456', 10);
  if (!urlObj.hostname || !urlObj.pathname) {
    throw new Error('Invalid ETSY_OAUTH_REDIRECT_URI');
  }

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = randomState();
  writePending(projectRoot(), {
    state,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    created_at: new Date().toISOString(),
  });

  const authUrl = buildAuthorizeUrl(cfg.etsy.apiKey, redirectUri, state, codeChallenge);

  log('');
  log('=== Etsy OAuth ===');
  log(`1) In Etsy Developer "Manage your apps", add this EXACT Redirect URI:`);
  log(`   ${redirectUri}`);
  log(`2) Open this URL in a browser (logged in as the shop owner):`);
  log('');
  console.log(authUrl);
  log('');
  log(`3) Waiting for redirect on port ${port} ...`);

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400);
          res.end();
          return;
        }
        const host = req.headers.host || `localhost:${port}`;
        const fullUrl = new URL(req.url, `http://${host}`);
        const expectedPath = new URL(redirectUri).pathname;
        if (fullUrl.pathname !== expectedPath) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const code = fullUrl.searchParams.get('code');
        const returnedState = fullUrl.searchParams.get('state');
        const err = fullUrl.searchParams.get('error');
        const errDesc = fullUrl.searchParams.get('error_description');

        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<h1>OAuth error</h1><p>${err}: ${errDesc || ''}</p>`);
          server.close();
          reject(new Error(`${err}: ${errDesc || ''}`));
          return;
        }

        const pending = readPending(projectRoot());
        if (!pending || returnedState !== pending.state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Invalid state</h1><p>Start login again.</p>');
          server.close();
          reject(new Error('OAuth state mismatch'));
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Missing code</h1>');
          server.close();
          reject(new Error('Missing authorization code'));
          return;
        }

        const tokenRes = await exchangeAuthorizationCode(
          cfg.etsy.apiKey,
          pending.redirect_uri,
          code,
          pending.code_verifier
        );

        await saveTokensFromResponse(cfg, tokenRes);
        clearPending(projectRoot());

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<h1>Etsy connected</h1><p>You can close this tab and return to the terminal.</p>'
        );
        server.close();
        resolve();
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Error</h1><pre>${(e as Error).message}</pre>`);
        server.close();
        reject(e);
      }
    });

    // Omit host so :: / 0.0.0.0 works when the browser resolves "localhost" to IPv6 or IPv4
    server.listen(port, () => {
      log(`Listening on port ${port} — redirect must match exactly: ${redirectUri}`);
    });
    server.on('error', reject);
  });
}

async function cmdRefresh(): Promise<void> {
  const cfg = loadConfig();
  const existing = readTokens(projectRoot());
  if (!existing?.refresh_token) {
    throw new Error(`No refresh token. Run: node dist/tasks/setup-auth.js login`);
  }
  const tokenRes = await refreshAccessToken(cfg.etsy.apiKey, existing.refresh_token);
  await saveTokensFromResponse(cfg, tokenRes);
}

async function cmdStatus(): Promise<void> {
  const t = readTokens(projectRoot());
  if (!t) {
    log('No tokens file. Run login.');
    return;
  }
  log(`user_id=${t.user_id} shop_id=${t.shop_id} shop_name=${t.shop_name || ''}`);
  log(`access expires ~ ${new Date(t.expires_at_ms).toISOString()}`);
}

function main(): void {
  const cmd = (process.argv[2] || '').toLowerCase();
  const run = async (): Promise<void> => {
    if (cmd === 'ping') await cmdPing();
    else if (cmd === 'login') await cmdLogin();
    else if (cmd === 'refresh') await cmdRefresh();
    else if (cmd === 'status') await cmdStatus();
    else {
      console.error(`Usage: node setup-auth.js ping|login|refresh|status`);
      process.exit(1);
    }
  };
  run().catch((e) => {
    console.error('[setup-auth]', (e as Error).message);
    process.exit(1);
  });
}

main();
