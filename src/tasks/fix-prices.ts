/**
 * fix-prices.ts
 *
 * One-time fix: the original create-draft-listings sent price in cents
 * but Etsy API expects a float in USD. This updates all listed drafts.
 *
 * Usage:
 *   node dist/tasks/fix-prices.js
 *   node dist/tasks/fix-prices.js --dry-run
 */
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { ensureValidAccessToken } from '../etsy/access-token';
import { v3AuthHeaders } from '../etsy/client';
import { loadConfig } from '../config';
import { closeDatabase, getPool } from '../database/db';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'https://openapi.etsy.com/v3/application';

function log(msg: string, extra?: unknown): void {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[${ts}] ${msg}`, typeof extra === 'string' ? extra : JSON.stringify(extra));
  } else {
    console.log(`[${ts}] ${msg}`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const cfg = loadConfig();
  if (!cfg.etsy.apiKey || !cfg.etsy.sharedSecret) {
    throw new Error('Set ETSY_API_KEY and ETSY_SHARED_SECRET in .env');
  }

  const tokens = await ensureValidAccessToken();
  const shopId = (cfg.etsy.shopId || tokens.shop_id || '').trim();
  if (!shopId) throw new Error('Set ETSY_SHOP_ID in .env');

  const accessToken = tokens.access_token;
  const { apiKey, sharedSecret } = cfg.etsy;

  const pool = await getPool();

  // Get all products that have an etsy_listing_id and a price_usd
  const [rows] = await pool.execute(
    `SELECT p.id, p.id_1688, p.etsy_listing_id, en.price_usd
     FROM products p
     JOIN products_en en ON p.id = en.product_id
     WHERE p.etsy_listing_id IS NOT NULL AND p.etsy_listing_id != ''
       AND en.price_usd IS NOT NULL AND en.price_usd > 0
     ORDER BY p.id`
  );

  const listings = rows as any[];
  log(`Found ${listings.length} listings to fix prices${dryRun ? ' (dry-run)' : ''}`);

  if (listings.length === 0) {
    await closeDatabase();
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const row of listings) {
    const listingId = row.etsy_listing_id;
    const priceUsd = Number(row.price_usd).toFixed(2);

    if (dryRun) {
      log(`DRY-RUN: listing ${listingId} → $${priceUsd}`);
      ok++;
      continue;
    }

    try {
      const params = new URLSearchParams();
      params.append('price', priceUsd);

      const { status, data } = await axios.patch(
        `${API_BASE}/shops/${shopId}/listings/${listingId}`,
        params.toString(),
        {
          headers: {
            ...v3AuthHeaders(accessToken, apiKey, sharedSecret),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          validateStatus: () => true,
        }
      );

      if (status >= 400) {
        log(`FAIL listing ${listingId}: ${status}`, data);
        fail++;
      } else {
        log(`OK listing ${listingId} → $${priceUsd}`);
        ok++;
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      log(`ERROR listing ${listingId}: ${err.message}`);
      fail++;
    }
  }

  log(`Done. OK=${ok} FAIL=${fail}`);
  await closeDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
