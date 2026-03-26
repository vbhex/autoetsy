import * as path from 'path';
import { loadConfig } from '../config';
import { refreshAccessToken } from './client';
import { readTokens, writeTokens, tokensPath } from './token-store';
import type { EtsyTokensFile } from './types';

function projectRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

/** Ensure a valid OAuth access token; refresh using refresh_token when near expiry. */
export async function ensureValidAccessToken(): Promise<EtsyTokensFile> {
  const cfg = loadConfig();
  const root = projectRoot();
  let t = readTokens(root);
  if (!t?.refresh_token) {
    throw new Error(`No Etsy tokens at ${tokensPath(root)} — run: npm run task:auth login`);
  }
  const refreshIfBefore = Date.now() + 120_000;
  if (t.expires_at_ms <= refreshIfBefore) {
    const tokenRes = await refreshAccessToken(cfg.etsy.apiKey, t.refresh_token);
    t = {
      ...t,
      access_token: tokenRes.access_token,
      refresh_token: tokenRes.refresh_token,
      expires_at_ms: Date.now() + tokenRes.expires_in * 1000 - 60_000,
      updated_at: new Date().toISOString(),
    };
    writeTokens(root, t);
  }
  return t;
}
