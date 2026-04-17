/**
 * cleanup-drafts.ts — AGGRESSIVE style cleanup
 *
 * Deletes Etsy draft AND deactivated listings that don't match the store's
 * style direction: Retro/Vintage, Punk/Gothic, Bohemian/Artisan, Steampunk,
 * Vintage Gentleman.
 *
 * For each qualifying product:
 *   1. Classifies as KEEP or DELETE based on hardcoded ID overrides,
 *      category rules, and title keyword rules
 *   2. Calls Etsy DELETE API for DELETE products
 *   3. Updates local DB status to 'removed'
 *
 * DOES NOT touch products with status='listed'.
 *
 * Usage:
 *   node dist/tasks/cleanup-drafts.js
 *   node dist/tasks/cleanup-drafts.js --dry-run
 */
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { ensureValidAccessToken } from '../etsy/access-token';
import { v3AuthHeaders } from '../etsy/client';
import { loadConfig } from '../config';
import { closeDatabase, getPool } from '../database/db';
import type { RowDataPacket } from 'mysql2/promise';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_BASE = 'https://api.etsy.com/v3/application';

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── HARDCODED OVERRIDES ──────────────────────────────────────────────

/** These product IDs are ALWAYS kept regardless of any other rule */
const FORCE_KEEP_IDS = new Set<number>([
  108, // retro cowboy baseball cap
  111, // retro western denim hat (cowboy hats)
  112, // American retro western hat (cowboy hats)
  113, // Western cowboy hat (cowboy hats)
  151, // skull and cross wallet (PUNK)
  177, // French retro style shoes
  255, // Y2K Japanese Subculture socks
  266, // White Hollow Knitted Shawl Russian style (BOHEMIAN)
  270, // Elegant Decorative Ribbon Sash Belt (vintage)
  277, // Retro camera shoulder strap
  139, // round frame sunglasses (retro)
  340, // Vintage Style Waist Sash Belt
  343, // Classic Fabric Sash Belt (vintage)
]);

/** These product IDs are ALWAYS deleted regardless of any other rule */
const FORCE_DELETE_IDS = new Set<number>([
  129, // optical frames (deactivated)
  289, // Chinese title cufflinks (deactivated)
]);

/** PocketSquares with English titles — KEEP (Vintage Gentleman) */
const KEEP_POCKET_SQUARE_IDS = new Set<number>([269, 308, 318, 319, 320, 322, 324]);

/** SuspendersBracesPostureCor with English titles — KEEP */
const KEEP_SUSPENDERS_IDS = new Set<number>([328, 329, 333, 338, 376]);

/** TieBucklesCufflinks with English titles — KEEP */
const KEEP_CUFFLINKS_IDS = new Set<number>([291, 362, 365]);

/** TieClip with English titles — KEEP */
const KEEP_TIECLIP_IDS = new Set<number>([350]);

/** Ties with English titles — KEEP */
const KEEP_TIES_IDS = new Set<number>([367]);

/** Handkerchiefs that are tie/pocket square sets — KEEP */
const KEEP_HANDKERCHIEF_IDS = new Set<number>([352, 355, 369, 370, 373]);

/** Sashes — keep only vintage-style ones */
const KEEP_SASH_IDS = new Set<number>([270, 340, 343]);

// ── STYLE KEYWORDS ──────────────────────────────────────────────────

/** Keywords in title that indicate product matches a style pillar → KEEP */
const STYLE_KEYWORDS = [
  'retro', 'vintage', 'gothic', 'punk', 'skull', 'steampunk',
  'bohemian', 'artisan', 'victorian', 'antique', 'medieval',
  'subculture', 'y2k',
];

// ── CATEGORY RULES ──────────────────────────────────────────────────

/** Categories that are ENTIRELY deleted (no exceptions unless in FORCE_KEEP_IDS) */
const DELETE_CATEGORIES = new Set<string>([
  'water bottles',
  'waist packs',
  'family matching outfits',
  'Oversleeve',
  'sneakers',
  'mens casual shoes',
  'sun scarves',
  'blue light glasses',
  'reading glasses',
  'optical frames',
  'fitness gloves',
  'yoga mats',
  'coin purses',
  'bucket hats',
  'beanies',
  'winter scarves',
  'digital watches',
  'Cummerbunds',
  'CollarStays',
  'GarmentAccessories',
]);

/** Categories where only specific IDs are kept */
const SELECTIVE_KEEP_CATEGORIES: Record<string, Set<number>> = {
  'baseball caps': new Set([108]),
  'KneeSleeveLegWarmer': new Set([255]),
  'womens fashion shoes': new Set([177]),
  'fashion wallets': new Set([151]),
  'polarized sunglasses': new Set([139]),
  'ShoulderStrap': new Set([277]),
  'Sashes': KEEP_SASH_IDS,
  'PocketSquares': KEEP_POCKET_SQUARE_IDS,
  'SuspendersBracesPostureCor': KEEP_SUSPENDERS_IDS,
  'TieBucklesCufflinks': KEEP_CUFFLINKS_IDS,
  'TieClip': KEEP_TIECLIP_IDS,
  'Ties': KEEP_TIES_IDS,
  'Handkerchiefs': KEEP_HANDKERCHIEF_IDS,
};

/** Categories that are generic → DELETE unless title has style keywords */
const GENERIC_DELETE_CATEGORIES = new Set<string>([
  'fashion earrings',
  'fashion necklaces',
  'fashion rings',
  'fashion bracelets',
  'Accessories',
  'accessories',
  'quartz watches',
]);

// ── CLASSIFICATION ──────────────────────────────────────────────────

/** Detect broken encoding / Chinese-only titles */
function hasChinese(title: string): boolean {
  // Match CJK Unified Ideographs range
  return /[\u4e00-\u9fff]/.test(title);
}

function isBrokenOrChineseTitle(title: string): boolean {
  if (!title || title.trim().length === 0) return true;
  // Count question marks — broken encoding shows as ?????
  const questionMarks = (title.match(/\?/g) || []).length;
  if (questionMarks > title.length * 0.2) return true;
  // Contains Chinese characters
  if (hasChinese(title)) return true;
  // Mostly non-Latin characters
  const latinChars = (title.match(/[a-zA-Z0-9]/g) || []).length;
  if (latinChars < title.length * 0.3 && title.length > 5) return true;
  return false;
}

function hasStyleKeyword(title: string): boolean {
  const lower = title.toLowerCase();
  return STYLE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface ClassifyResult {
  action: 'KEEP' | 'DELETE';
  reason: string;
}

function classifyProduct(id: number, title: string, category: string): ClassifyResult {
  // 1. Force overrides (highest priority)
  if (FORCE_DELETE_IDS.has(id)) {
    return { action: 'DELETE', reason: 'Force delete (hardcoded ID)' };
  }
  if (FORCE_KEEP_IDS.has(id)) {
    return { action: 'KEEP', reason: 'Force keep (hardcoded ID)' };
  }

  // 2. Broken/Chinese title → DELETE (even for keep categories)
  if (isBrokenOrChineseTitle(title)) {
    return { action: 'DELETE', reason: 'Broken encoding / Chinese-only title' };
  }

  // 3. Categories that are entirely deleted
  if (DELETE_CATEGORIES.has(category)) {
    return { action: 'DELETE', reason: `Delete category: ${category}` };
  }

  // 4. Selective keep categories — only specific IDs survive
  if (category in SELECTIVE_KEEP_CATEGORIES) {
    const keepIds = SELECTIVE_KEEP_CATEGORIES[category];
    if (keepIds.has(id)) {
      return { action: 'KEEP', reason: `Selective keep (ID ${id} in ${category})` };
    }
    // Check style keywords as fallback for items not in the explicit list
    if (hasStyleKeyword(title)) {
      return { action: 'KEEP', reason: `Style keyword in selective category: ${category}` };
    }
    return { action: 'DELETE', reason: `Not in keep list for ${category}` };
  }

  // 5. Generic categories — delete unless style keyword in title
  if (GENERIC_DELETE_CATEGORIES.has(category)) {
    if (hasStyleKeyword(title)) {
      return { action: 'KEEP', reason: `Style keyword saves generic category: ${category}` };
    }
    return { action: 'DELETE', reason: `Generic commodity category: ${category} (no style keywords)` };
  }

  // 6. Cowboy hats are always keep (style pillar)
  if (category === 'cowboy hats') {
    return { action: 'KEEP', reason: 'Keep category: cowboy hats (Western aesthetic)' };
  }

  // 7. TieChains, TieSet — Vintage Gentleman, keep if English title
  if (['TieChains', 'TieSet'].includes(category)) {
    return { action: 'KEEP', reason: `Keep category: ${category} (Vintage Gentleman)` };
  }

  // 8. Hair claws — generic, delete
  if (category === 'hair claws') {
    if (hasStyleKeyword(title)) {
      return { action: 'KEEP', reason: 'Style keyword in hair claws' };
    }
    return { action: 'DELETE', reason: 'Generic hair claws (no style keywords)' };
  }

  // 9. Style keywords in any remaining category → KEEP
  if (hasStyleKeyword(title)) {
    return { action: 'KEEP', reason: `Style keyword match in title` };
  }

  // 10. Remaining — if title looks like a generic placeholder "Stylish Fashion Accessory - Style NNN" → DELETE
  if (/style\s*-?\s*style\s*\d+/i.test(title) || /^(Stylish|Trendy|Dainty|Elegant|Classic)\s+Fashion\s+Accessory\s*-?\s*Style\s+\d+$/i.test(title)) {
    return { action: 'DELETE', reason: 'Generic placeholder title' };
  }
  if (/^(Stylish|Trendy|Dainty|Elegant|Classic)\s+Fashion\s+Accessory\s+Set\s*-?\s*Style\s+\d+$/i.test(title)) {
    return { action: 'DELETE', reason: 'Generic placeholder title (set)' };
  }

  // 11. Default: KEEP (not in any delete rule)
  return { action: 'KEEP', reason: 'Not in delete list — default keep' };
}

// ── Main ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const cfg = loadConfig();
  if (!cfg.etsy.apiKey || !cfg.etsy.sharedSecret) {
    throw new Error('Set ETSY_API_KEY and ETSY_SHARED_SECRET in .env');
  }

  log(dryRun ? 'DRY RUN — no API calls, no DB changes' : 'LIVE RUN — will delete listings');

  const tokens = await ensureValidAccessToken();
  const accessToken = tokens.access_token;
  const { apiKey, sharedSecret } = cfg.etsy;

  const pool = await getPool();

  // Query ALL non-listed products that have an etsy_listing_id
  // Include etsy_draft + deactivated + inactive (but NOT 'listed' or 'removed')
  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT p.id, p.id_1688, p.etsy_listing_id, p.status, p.category,
           pe.title_en, pe.title_etsy
    FROM products p
    LEFT JOIN products_en pe ON pe.product_id = p.id
    WHERE p.etsy_listing_id IS NOT NULL
      AND p.etsy_listing_id != ''
      AND p.status IN ('etsy_draft', 'deactivated', 'inactive')
  `);

  log(`Found ${rows.length} listings to evaluate (drafts + deactivated + inactive)`);

  const kept: Array<{ id: number; id_1688: string; title: string; reason: string }> = [];
  const deleted: Array<{ id: number; id_1688: string; title: string; reason: string }> = [];
  let errors = 0;
  let apiCalls = 0;

  for (const row of rows) {
    const productId = row.id as number;
    const title = (row.title_etsy || row.title_en || '').trim();
    const category = (row.category || '').trim();
    const listingId = String(row.etsy_listing_id).trim();
    const id1688 = String(row.id_1688);
    const status = (row.status || '').trim();
    const result = classifyProduct(productId, title, category);

    if (result.action === 'KEEP') {
      kept.push({ id: productId, id_1688: id1688, title, reason: result.reason });
      log(`KEEP   #${productId} | ${result.reason} | ${title.substring(0, 80)}`);
      continue;
    }

    // DELETE
    log(`DELETE #${productId} [${status}] | ${result.reason} | ${title.substring(0, 80)}`);

    if (dryRun) {
      deleted.push({ id: productId, id_1688: id1688, title, reason: result.reason });
      continue;
    }

    try {
      // Call Etsy API to delete the listing
      const headers = v3AuthHeaders(accessToken, apiKey, sharedSecret);
      const res = await axios.delete(`${API_BASE}/listings/${listingId}`, {
        headers,
        validateStatus: () => true,
      });
      apiCalls++;

      if (res.status >= 400 && res.status !== 404) {
        log(`  API error ${res.status}: ${JSON.stringify(res.data)}`);
        errors++;
        // Still update DB even if API fails (listing may already be gone)
      }

      if (res.status === 404) {
        log(`  Listing ${listingId} already gone (404) — updating DB only`);
      } else if (res.status < 400) {
        log(`  API OK (${res.status}) — listing ${listingId} deleted`);
      }

      // Update local DB
      await pool.execute(
        `UPDATE products SET status = 'removed', skip_reason = ? WHERE id = ?`,
        ['Style cleanup - not retro/vintage/punk/gothic/bohemian', productId]
      );

      // Update platform_listings if exists
      await pool.execute(
        `UPDATE platform_listings SET status = 'removed' WHERE product_id = ? AND platform = 'etsy'`,
        [productId]
      );

      deleted.push({ id: productId, id_1688: id1688, title, reason: result.reason });

      // Rate limit: 200ms between API calls
      await sleep(200);
    } catch (e) {
      log(`  ERROR deleting #${productId}: ${(e as Error).message}`);
      errors++;
    }
  }

  // ── Summary ──
  log('');
  log('═══════════════════════════════════════════════════════════════');
  log(`SUMMARY${dryRun ? ' (DRY RUN — nothing changed)' : ''}`);
  log('═══════════════════════════════════════════════════════════════');
  log(`Total evaluated:  ${rows.length}`);
  log(`Deleted:          ${deleted.length}`);
  log(`Kept:             ${kept.length}`);
  log(`API calls:        ${apiCalls}`);
  log(`Errors:           ${errors}`);
  log('');

  if (kept.length > 0) {
    log('── KEPT PRODUCTS ──────────────────────────────────────────');
    for (const k of kept) {
      log(`  #${k.id} [${k.id_1688}] ${k.title.substring(0, 90)}`);
      log(`    → ${k.reason}`);
    }
  }

  if (deleted.length > 0) {
    log('');
    log('── DELETED PRODUCTS ───────────────────────────────────────');
    for (const d of deleted) {
      log(`  #${d.id} [${d.id_1688}] ${d.title.substring(0, 90)}`);
      log(`    → ${d.reason}`);
    }
  }

  log('═══════════════════════════════════════════════════════════════');

  await closeDatabase();
}

main().catch((e) => {
  console.error('[cleanup-drafts] FATAL:', (e as Error).message);
  process.exit(1);
});
