/**
 * import-from-1688source.ts
 *
 * Bridge script: imports listing-ready products from 1688_source DB
 * into etsy_autostore DB with status='imported', ready for copy optimization.
 *
 * Key differences from aliexpress/import-from-1688source.ts:
 *   - Reads ae_enriched AND ae_exported (same product can list on both platforms)
 *   - JOINs authorized_products for brand safety
 *   - Does NOT update 1688_source.products.status (non-destructive)
 *   - Filters to Etsy-eligible categories only
 *   - Maps categories via CATEGORY_TAXONOMY_MAP instead of CATEGORY_SHEET_MAP
 *
 * Run on Main Computer (local DB) or China MacBook:
 *   node dist/tasks/import-from-1688source.js
 *   node dist/tasks/import-from-1688source.js --limit 50
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { ETSY_ELIGIBLE_CATEGORIES, CATEGORY_TAXONOMY_MAP } from '../models/product';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.MYSQL_PORT || '3306');
const DB_USER = process.env.MYSQL_USER || 'root';
const DB_PASS = process.env.MYSQL_PASSWORD || '';

function log(msg: string, data?: any) {
  const ts = new Date().toLocaleTimeString();
  if (data) console.log(`[${ts}] ${msg}`, typeof data === 'string' ? data : JSON.stringify(data));
  else console.log(`[${ts}] ${msg}`);
}

function parseArgs(): { limit: number } {
  const args = process.argv.slice(2);
  let limit = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]);
    }
  }
  return { limit };
}

function isEtsyEligible(category: string): boolean {
  if (!category) return false;
  const lower = category.toLowerCase().trim();
  return ETSY_ELIGIBLE_CATEGORIES.has(lower);
}

async function main() {
  const { limit } = parseArgs();
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    charset: 'utf8mb4',
    multipleStatements: false,
  });

  log(`Connected to MySQL at ${DB_HOST}:${DB_PORT}`);

  // Ensure etsy_autostore database exists
  await conn.execute(`CREATE DATABASE IF NOT EXISTS etsy_autostore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  log('Database etsy_autostore ready');

  let imported = 0, skipped = 0, failed = 0, categorySkipped = 0;

  try {
    // Get all listing-ready products: ae_enriched OR ae_exported, AND authorized
    const limitClause = limit > 0 ? `LIMIT ${limit}` : '';
    const [sourceProducts] = await conn.execute<any[]>(
      `SELECT p.id, p.id_1688, p.category, p.url, p.title_zh, p.thumbnail_url
       FROM 1688_source.products p
       JOIN 1688_source.authorized_products ap ON ap.product_id = p.id AND ap.active = TRUE
       WHERE p.status IN ('ae_enriched', 'ae_exported', 'brand_verified', 'translated')
       ORDER BY p.id
       ${limitClause}`
    );

    log(`Found ${sourceProducts.length} authorized listing-ready products in 1688_source`);

    for (const src of sourceProducts) {
      try {
        // Filter: Etsy-eligible categories only
        if (!isEtsyEligible(src.category)) {
          categorySkipped++;
          continue;
        }

        // Skip if already in etsy_autostore
        const [existing] = await conn.execute<any[]>(
          `SELECT id FROM etsy_autostore.products WHERE id_1688 = ?`,
          [src.id_1688]
        );
        if (existing.length > 0) {
          log(`  [SKIP] Already imported: ${src.id_1688}`);
          skipped++;
          continue;
        }

        // Get translated data
        const [enRows] = await conn.execute<any[]>(
          `SELECT title_en, description_en, specifications_en, price_usd, category AS src_category
           FROM 1688_source.products_en WHERE product_id = ?`,
          [src.id]
        );
        if (enRows.length === 0) {
          log(`  [SKIP] No products_en for id_1688=${src.id_1688}`);
          skipped++;
          continue;
        }
        const en = enRows[0];

        // Get raw data
        const [rawRows] = await conn.execute<any[]>(
          `SELECT price_cny, min_order_qty, seller_name, seller_rating, title_zh, description_zh, specifications_zh
           FROM 1688_source.products_raw WHERE product_id = ?`,
          [src.id]
        );
        const raw = rawRows[0] || { price_cny: 0, min_order_qty: 1, seller_name: '', seller_rating: 0 };

        // Determine images (same logic as aliexpress import)
        const [aeMatch] = await conn.execute<any[]>(
          `SELECT has_chinese_images, ae_images FROM 1688_source.products_ae_match WHERE product_id = ?`,
          [src.id]
        );

        let imageUrls: string[] = [];

        const [cleanImgRows] = await conn.execute<any[]>(
          `SELECT io.image_url
           FROM 1688_source.products_images_ok io
           WHERE io.product_id = ? AND io.passed = 1 AND io.image_type = 'gallery'
           ORDER BY io.sort_order`,
          [src.id]
        );
        const clean1688Urls: string[] = cleanImgRows.map((r: any) => r.image_url);

        if (aeMatch.length > 0 && aeMatch[0].has_chinese_images && aeMatch[0].ae_images) {
          const parsed = typeof aeMatch[0].ae_images === 'string'
            ? JSON.parse(aeMatch[0].ae_images)
            : aeMatch[0].ae_images;
          const aeUrls: string[] = Array.isArray(parsed) ? parsed : [];
          const seen = new Set(aeUrls);
          for (const url of clean1688Urls) {
            if (!seen.has(url)) { aeUrls.push(url); seen.add(url); }
          }
          imageUrls = aeUrls;
        } else {
          imageUrls = clean1688Urls;
        }

        if (imageUrls.length < 1) {
          log(`  [SKIP] No usable images for ${src.id_1688}`);
          skipped++;
          continue;
        }

        // Determine Etsy category
        const catMapping = CATEGORY_TAXONOMY_MAP[src.category?.toLowerCase()] || null;
        const etsyCategory = catMapping?.etsyCategory || src.category || '';

        // Insert into etsy_autostore.products
        const [prodResult] = await conn.execute<any>(
          `INSERT INTO etsy_autostore.products
             (id_1688, status, url, title_zh, category, thumbnail_url)
           VALUES (?, 'imported', ?, ?, ?, ?)`,
          [src.id_1688, src.url || '', src.title_zh || '', src.category || '', imageUrls[0] || '']
        );
        const newProductId: number = prodResult.insertId;

        // Insert products_raw
        await conn.execute(
          `INSERT INTO etsy_autostore.products_raw
             (product_id, title_zh, description_zh, specifications_zh, price_cny, min_order_qty, seller_name, seller_rating)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newProductId,
            raw.title_zh || src.title_zh || '',
            raw.description_zh || '',
            raw.specifications_zh ? JSON.stringify(raw.specifications_zh) : '{}',
            raw.price_cny || 0,
            raw.min_order_qty || 1,
            raw.seller_name || '',
            raw.seller_rating || 0,
          ]
        );

        // Insert images
        for (let i = 0; i < imageUrls.length; i++) {
          const [rawImgResult] = await conn.execute<any>(
            `INSERT INTO etsy_autostore.products_images_raw
               (product_id, image_url, image_type, sort_order)
             VALUES (?, ?, 'gallery', ?)`,
            [newProductId, imageUrls[i], i]
          );
          const rawImageId: number = rawImgResult.insertId;

          await conn.execute(
            `INSERT INTO etsy_autostore.products_images_ok
               (product_id, raw_image_id, image_url, image_type, sort_order, has_chinese_text, has_watermark, passed)
             VALUES (?, ?, ?, 'gallery', ?, 0, 0, 1)`,
            [newProductId, rawImageId, imageUrls[i], i]
          );
        }

        // Insert products_en with Etsy-specific fields
        const specsJson = typeof en.specifications_en === 'string'
          ? en.specifications_en
          : JSON.stringify(en.specifications_en || []);

        await conn.execute(
          `INSERT INTO etsy_autostore.products_en
             (product_id, title_en, description_en, specifications_en, price_usd, etsy_category)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            newProductId,
            en.title_en || '',
            en.description_en || '',
            specsJson,
            en.price_usd || 0,
            etsyCategory,
          ]
        );

        // Import flat variants
        const [variants] = await conn.execute<any[]>(
          `SELECT option_name_en, option_value_en, option_value_zh, price_usd, color_family, sort_order
           FROM 1688_source.products_variants_en WHERE product_id = ?
           ORDER BY sort_order`,
          [src.id]
        );
        for (const v of variants) {
          await conn.execute(
            `INSERT INTO etsy_autostore.products_variants_en
               (product_id, option_name_en, option_value_en, option_value_zh, price_usd, color_family, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newProductId, v.option_name_en, v.option_value_en, v.option_value_zh, v.price_usd, v.color_family, v.sort_order]
          );
        }

        // Import normalized variants
        const [srcVariants] = await conn.execute<any[]>(
          `SELECT id, variant_name_zh, variant_name_en, sort_order
           FROM 1688_source.product_variants WHERE product_id = ?
           ORDER BY sort_order`,
          [src.id]
        );
        for (const sv of srcVariants) {
          const [pvResult] = await conn.execute<any>(
            `INSERT INTO etsy_autostore.product_variants
               (product_id, variant_name_zh, variant_name_en, sort_order)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), variant_name_en=VALUES(variant_name_en)`,
            [newProductId, sv.variant_name_zh, sv.variant_name_en || null, sv.sort_order]
          );
          const newVariantId = pvResult.insertId;

          const [srcValues] = await conn.execute<any[]>(
            `SELECT value_name_zh, value_name_en, image_url, sort_order
             FROM 1688_source.variant_values WHERE variant_id = ?
             ORDER BY sort_order`,
            [sv.id]
          );
          for (const vv of srcValues) {
            await conn.execute(
              `INSERT INTO etsy_autostore.variant_values
                 (variant_id, value_name_zh, value_name_en, image_url, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [newVariantId, vv.value_name_zh, vv.value_name_en || null, vv.image_url || null, vv.sort_order]
            );
          }
        }

        // Import variant_skus
        const [srcSkus] = await conn.execute<any[]>(
          `SELECT sku_code, variant_values_json, price_cny, stock, available, image_url
           FROM 1688_source.variant_skus WHERE product_id = ?`,
          [src.id]
        );
        for (const sk of srcSkus) {
          const valuesJson = typeof sk.variant_values_json === 'string'
            ? sk.variant_values_json
            : JSON.stringify(sk.variant_values_json || {});
          await conn.execute(
            `INSERT INTO etsy_autostore.variant_skus
               (product_id, sku_code, variant_values_json, price_cny, stock, available, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [newProductId, sk.sku_code || null, valuesJson, sk.price_cny || 0, sk.stock || 0, sk.available ? 1 : 0, sk.image_url || null]
          );
        }

        // NOTE: We do NOT update 1688_source.products.status — non-destructive import
        log(`  [OK] Imported ${src.id_1688} (${src.category}) → etsy_autostore id=${newProductId}, images=${imageUrls.length}, variants=${variants.length}, skus=${srcSkus.length}`);
        imported++;

      } catch (err: any) {
        log(`  [ERROR] Failed for id_1688=${src.id_1688}: ${err.message}`);
        failed++;
      }
    }

  } finally {
    await conn.end();
  }

  console.log(`\n========================================`);
  console.log(`Etsy Import complete:`);
  console.log(`  imported=${imported}`);
  console.log(`  skipped=${skipped} (already imported or missing data)`);
  console.log(`  category_filtered=${categorySkipped} (not Etsy-eligible)`);
  console.log(`  failed=${failed}`);
  console.log(`========================================`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
