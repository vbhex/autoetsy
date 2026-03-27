/**
 * create-draft-listings.ts
 *
 * Creates Etsy draft listings (Open API v3) for products with status=optimized
 * and no etsy_listing_id. Uploads up to 10 gallery images per listing.
 * Listings stay draft until activated in Shop Manager.
 *
 * Prerequisites:
 *   npm run task:auth login
 *   ETSY_SHOP_ID (or shop_id in data/etsy-tokens.json)
 *   taxonomy: per-row etsy_taxonomy_id or ETSY_DEFAULT_TAXONOMY_ID
 *   shipping_profile_id / readiness_state_id: auto from API or set in .env
 *
 * Usage:
 *   node dist/tasks/create-draft-listings.js
 *   node dist/tasks/create-draft-listings.js --limit 5
 *   node dist/tasks/create-draft-listings.js --dry-run
 *   node dist/tasks/create-draft-listings.js --skip-images
 */
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { ensureValidAccessToken } from '../etsy/access-token';
import {
  createDraftListing,
  getShopReadinessStateDefinitions,
  getShopShippingProfiles,
  uploadListingImage,
} from '../etsy/client';
import { loadConfig } from '../config';
import { closeDatabase, getPool, recordEtsyDraftListing } from '../database/db';
import {
  getOptimizedProductsWithoutEtsyListing,
  getProductEN,
  getProductImages,
} from '../database/repositories';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MAX_IMAGES = 10;
const TITLE_MAX = 140;
const DESC_MAX = 49000;

function log(msg: string, extra?: unknown): void {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[${ts}] ${msg}`, typeof extra === 'string' ? extra : JSON.stringify(extra));
  } else {
    console.log(`[${ts}] ${msg}`);
  }
}

function parseArgs(): { limit: number; dryRun: boolean; skipImages: boolean } {
  const args = process.argv.slice(2);
  let limit = 0;
  let dryRun = false;
  let skipImages = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) limit = parseInt(args[i + 1], 10);
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--skip-images') skipImages = true;
  }
  return { limit, dryRun, skipImages };
}

function pickNumericId(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  return undefined;
}

function parseTags(tagsJson: unknown): string[] {
  if (tagsJson == null || tagsJson === '') return [];
  try {
    const raw = typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson;
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => String(x).trim()).filter(Boolean).slice(0, 13);
  } catch {
    return [];
  }
}

function usdToMinorUnits(usd: number): number {
  const n = Number(usd);
  if (!Number.isFinite(n) || n <= 0) return 599;
  return Math.max(100, Math.round(n * 100));
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

async function downloadImage(url: string): Promise<{ buf: Buffer; filename: string }> {
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 120_000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BlueIdeaGoods-EtsyLister/1.0)',
      Accept: 'image/*,*/*',
    },
  });
  if (res.status >= 400) {
    throw new Error(`HTTP ${res.status} loading image`);
  }
  const ctype = String(res.headers['content-type'] || '').toLowerCase();
  let ext = 'jpg';
  if (ctype.includes('png')) ext = 'png';
  else if (ctype.includes('webp')) ext = 'webp';
  return { buf: Buffer.from(res.data), filename: `photo.${ext}` };
}

async function resolveShippingProfileId(
  shopId: string,
  accessToken: string,
  apiKey: string,
  secret: string
): Promise<number> {
  const e = process.env.ETSY_SHIPPING_PROFILE_ID;
  if (e && /^\d+$/.test(e.trim())) return parseInt(e.trim(), 10);
  const rows = await getShopShippingProfiles(shopId, accessToken, apiKey, secret);
  const id = rows.length ? pickNumericId(rows[0], 'shipping_profile_id', 'shippingProfileId') : undefined;
  if (id == null) {
    throw new Error(
      'No shop shipping profiles from API. Create one in Etsy Shop Manager or set ETSY_SHIPPING_PROFILE_ID in .env'
    );
  }
  return id;
}

async function resolveReadinessStateId(
  shopId: string,
  accessToken: string,
  apiKey: string,
  secret: string
): Promise<number> {
  const e = process.env.ETSY_READINESS_STATE_ID;
  if (e && /^\d+$/.test(e.trim())) return parseInt(e.trim(), 10);
  const rows = await getShopReadinessStateDefinitions(shopId, accessToken, apiKey, secret);
  const mto = rows.find((r) => String(r.readiness_state || r.readinessState || '') === 'made_to_order');
  const row = mto || rows[0];
  const id = row ? pickNumericId(row, 'readiness_state_id', 'readinessStateId', 'id') : undefined;
  if (id == null) {
    throw new Error(
      'No readiness_state definitions from API. Set ETSY_READINESS_STATE_ID or create processing profiles in Shop Manager'
    );
  }
  return id;
}

async function main(): Promise<void> {
  const { limit, dryRun, skipImages } = parseArgs();
  const cfg = loadConfig();
  if (!cfg.etsy.apiKey || !cfg.etsy.sharedSecret) {
    throw new Error('Set ETSY_API_KEY and ETSY_SHARED_SECRET in .env');
  }

  const tokens = await ensureValidAccessToken();
  const shopId = (cfg.etsy.shopId || tokens.shop_id || '').trim();
  if (!shopId) throw new Error('Set ETSY_SHOP_ID in .env (or re-run task:auth login)');

  const accessToken = tokens.access_token;
  const { apiKey, sharedSecret } = cfg.etsy;

  await getPool();

  const shippingProfileId = await resolveShippingProfileId(shopId, accessToken, apiKey, sharedSecret);
  const readinessStateId = await resolveReadinessStateId(shopId, accessToken, apiKey, sharedSecret);
  log(`Using shipping_profile_id=${shippingProfileId} readiness_state_id=${readinessStateId}`);

  const defaultTaxonomy = parseInt(process.env.ETSY_DEFAULT_TAXONOMY_ID || '0', 10);
  const whenMade = (process.env.ETSY_WHEN_MADE || 'made_to_order').trim();
  const defaultQty = Math.min(
    999,
    Math.max(1, parseInt(process.env.ETSY_DEFAULT_QUANTITY || '99', 10) || 99)
  );

  const products = await getOptimizedProductsWithoutEtsyListing(limit > 0 ? limit : undefined);
  log(`Products to draft-list: ${products.length}${dryRun ? ' (dry-run)' : ''}`);

  let ok = 0;
  let fail = 0;

  for (const p of products) {
    const id1688 = String(p.id_1688);
    try {
      const en = await getProductEN(p.id);
      if (!en) {
        log(`SKIP ${id1688}: no products_en`);
        fail++;
        continue;
      }

      const titleRaw = (en.title_etsy || en.title_en || '').trim();
      const title = truncate(titleRaw, TITLE_MAX);
      if (!title) {
        log(`SKIP ${id1688}: empty title`);
        fail++;
        continue;
      }

      const desc = truncate((en.description_etsy || en.description_en || '').trim(), DESC_MAX);
      if (!desc) {
        log(`SKIP ${id1688}: empty description`);
        fail++;
        continue;
      }

      let taxonomyId = Number(en.etsy_taxonomy_id) || 0;
      if (!taxonomyId || taxonomyId <= 0) taxonomyId = defaultTaxonomy;
      if (!taxonomyId || taxonomyId <= 0) {
        log(`SKIP ${id1688}: set etsy_taxonomy_id in DB or ETSY_DEFAULT_TAXONOMY_ID in .env`);
        fail++;
        continue;
      }

      const priceMinor = usdToMinorUnits(Number(en.price_usd));
      const tags = parseTags(en.tags_json);

      const params = new URLSearchParams();
      params.append('quantity', String(defaultQty));
      params.append('title', title);
      params.append('description', desc);
      params.append('price', String(priceMinor));
      params.append('who_made', 'i_did');
      params.append('when_made', whenMade);
      params.append('taxonomy_id', String(taxonomyId));
      params.append('shipping_profile_id', String(shippingProfileId));
      params.append('readiness_state_id', String(readinessStateId));
      params.append('is_supply', 'false');
      for (const t of tags) {
        params.append('tags', t);
      }

      if (dryRun) {
        log(`DRY-RUN ${id1688}`, { title, tags, priceMinor, taxonomyId });
        ok++;
        continue;
      }

      const { listing_id } = await createDraftListing(shopId, params, accessToken, apiKey, sharedSecret);
      log(`Created draft listing_id=${listing_id} for id_1688=${id1688}`);

      if (!skipImages) {
        const imgs = await getProductImages(p.id);
        let up = 0;
        for (const row of imgs.slice(0, MAX_IMAGES)) {
          const u = String(row.image_url || '').trim();
          if (!u) continue;
          try {
            const { buf, filename } = await downloadImage(u);
            await uploadListingImage(shopId, listing_id, buf, filename, accessToken, apiKey, sharedSecret);
            up++;
          } catch (e) {
            log(`  image fail: ${(e as Error).message}`);
          }
        }
        log(`  uploaded ${up} images`);
      }

      await recordEtsyDraftListing(id1688, String(listing_id), shopId);
      ok++;
    } catch (e) {
      log(`FAIL ${id1688}: ${(e as Error).message}`);
      fail++;
    }
  }

  log(`Done. ok=${ok} fail=${fail}`);
  await closeDatabase();
}

main().catch((e) => {
  console.error('[create-draft-listings]', (e as Error).message);
  process.exit(1);
});
