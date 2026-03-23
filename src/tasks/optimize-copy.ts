/**
 * optimize-copy.ts
 *
 * Etsy Copy Optimizer: takes imported products and rewrites
 * title, description, and tags for Etsy SEO.
 *
 * Input:  etsy_autostore.products with status='imported'
 * Output: products_en.title_etsy, description_etsy, tags_json; status → 'optimized'
 *
 * Usage:
 *   node dist/tasks/optimize-copy.js
 *   node dist/tasks/optimize-copy.js --limit 50
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { CATEGORY_TAXONOMY_MAP } from '../models/product';

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

// ─── Title Optimization ──────────────────────────────────────────────

const TITLE_CATEGORY_PREFIXES: Record<string, string[]> = {
  jewelry:          ['Handpicked', 'Elegant', 'Minimalist', 'Dainty', 'Statement'],
  necklaces:        ['Layering', 'Delicate', 'Everyday', 'Pendant', 'Dainty'],
  earrings:         ['Elegant', 'Minimalist', 'Drop', 'Dangle', 'Statement'],
  rings:            ['Stackable', 'Minimalist', 'Dainty', 'Adjustable', 'Fashion'],
  bracelets:        ['Charm', 'Delicate', 'Layering', 'Adjustable', 'Beaded'],
  bags:             ['Versatile', 'Everyday', 'Classic', 'Trendy', 'Chic'],
  handbags:         ['Elegant', 'Everyday', 'Designer-Inspired', 'Classic', 'Chic'],
  backpacks:        ['Stylish', 'Travel-Ready', 'Everyday', 'Lightweight', 'Casual'],
  wallets:          ['Slim', 'Classic', 'Minimalist', 'Compact', 'Everyday'],
  'hair accessories': ['Trendy', 'Elegant', 'Everyday', 'Statement', 'Chic'],
  'hair clips':     ['Trendy', 'Elegant', 'Pearl', 'Vintage-Style', 'Fashion'],
  scarves:          ['Soft', 'Lightweight', 'Versatile', 'Elegant', 'Cozy'],
  hats:             ['Stylish', 'Classic', 'Cozy', 'Trendy', 'Everyday'],
  'womens fashion shoes': ['Elegant', 'Comfortable', 'Trendy', 'Stylish', 'Chic'],
  'mens casual shoes': ['Classic', 'Comfortable', 'Everyday', 'Stylish', 'Versatile'],
  'fashion wallets': ['Slim', 'Classic', 'Minimalist', 'Compact', 'Everyday'],
  'fashion bracelets': ['Charm', 'Delicate', 'Layering', 'Adjustable', 'Beaded'],
  'hair accessories set': ['Trendy', 'Elegant', 'Everyday', 'Statement', 'Chic'],
  'polarized sunglasses': ['Retro', 'Classic', 'UV Protection', 'Polarized', 'Vintage-Style'],
  'optical frames':   ['Lightweight', 'Classic', 'Retro', 'Fashion', 'Comfortable'],
  'coin purses':      ['Compact', 'Cute', 'Everyday', 'Minimalist', 'Portable'],
  'waist packs':      ['Versatile', 'Travel-Ready', 'Everyday', 'Sporty', 'Trendy'],
  sunglasses:       ['Retro', 'Classic', 'UV Protection', 'Fashion', 'Vintage-Style'],
  watches:          ['Elegant', 'Classic', 'Minimalist', 'Fashion', 'Everyday'],
  belts:            ['Classic', 'Versatile', 'Fashion', 'Adjustable', 'Everyday'],
  socks:            ['Cozy', 'Fun', 'Colorful', 'Comfortable', 'Novelty'],
  gloves:           ['Warm', 'Elegant', 'Touchscreen', 'Winter', 'Fashion'],
};

/**
 * Rewrite a plain English title for Etsy SEO.
 * Etsy titles: max 140 chars, keyword-front-loaded, lifestyle-oriented.
 */
function optimizeTitle(titleEn: string, category: string): string {
  if (!titleEn) return '';

  // Clean up common machine-translation and 1688 B2B artifacts
  let title = titleEn
    .replace(/\s+/g, ' ')
    // Remove 1688 wholesale/B2B language
    .replace(/manufacturer'?s?\s*direct\s*supply\s*(of)?/gi, '')
    .replace(/cross[- ]?border\s*(exclusive\s*)?/gi, '')
    .replace(/drop\s*shipping\s*/gi, '')
    .replace(/wholesale\s*/gi, '')
    .replace(/factory\s*direct\s*(sales?)?\s*/gi, '')
    .replace(/best[- ]?selling\s*/gi, '')
    .replace(/hot[- ]?selling\s*/gi, '')
    .replace(/new\s*arrivals?\s*/gi, '')
    .replace(/export\s*(quality\s*)?/gi, '')
    .replace(/foreign\s*trade\s*/gi, '')
    .replace(/large[- ]?scale\s*/gi, '')
    .replace(/source\s*factory\s*/gi, '')
    .replace(/supply\s*chain\s*/gi, '')
    .replace(/one\s*piece\s*drop\s*ship(ping)?\s*/gi, '')
    .replace(/european\s*and\s*american\s*(style\s*)?/gi, '')
    .replace(/japanese\s*and\s*korean\s*(style\s*)?/gi, '')
    .replace(/korean\s*version\s*(of\s*)?/gi, '')
    .replace(/tiktok\s*/gi, '')
    .replace(/douyin\s*/gi, '')
    .replace(/plus[- ]?size\s+yeezy/gi, 'Plus-Size')
    .replace(/\byeezy\b/gi, '')
    // Remove leading/trailing connectors
    .replace(/^(new|hot|sale|fashion|,)\s+/i, '')
    .replace(/\s+(new|hot sale|free shipping|,)$/i, '')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize each word
  title = title.replace(/\b\w/g, c => c.toUpperCase());

  // Add category-specific lifestyle prefix
  const catKey = category?.toLowerCase() || '';
  let prefixes = TITLE_CATEGORY_PREFIXES[catKey];
  if (!prefixes) {
    const match = Object.keys(TITLE_CATEGORY_PREFIXES).find(k => catKey.includes(k) || k.includes(catKey));
    prefixes = match ? TITLE_CATEGORY_PREFIXES[match] : TITLE_CATEGORY_PREFIXES['jewelry'] || [];
  }
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)] || '';

  if (prefix && !title.toLowerCase().startsWith(prefix.toLowerCase())) {
    title = `${prefix} ${title}`;
  }

  // Add gift-appeal suffix if space allows
  const giftSuffixes = [
    ' - Perfect Gift',
    ' - Gift for Her',
    ' - Gift for Him',
    ' - Birthday Gift',
    ' | Gift Idea',
  ];

  if (title.length < 110) {
    const suffix = giftSuffixes[Math.floor(Math.random() * giftSuffixes.length)];
    if (title.length + suffix.length <= 140) {
      title += suffix;
    }
  }

  // Hard cap at 140 chars
  if (title.length > 140) {
    title = title.substring(0, 137).trim() + '...';
  }

  return title;
}

// ─── Description Optimization ────────────────────────────────────────

function optimizeDescription(descEn: string, titleEn: string, specs: any, category: string): string {
  const sections: string[] = [];

  // Opening hook
  const cleanTitle = (titleEn || '').replace(/\s+/g, ' ').trim();
  sections.push(`✨ ${cleanTitle}\n`);

  // Main description (cleaned up)
  if (descEn) {
    const cleaned = descEn
      .replace(/<[^>]+>/g, '')       // strip HTML
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);           // Etsy allows long descriptions but keep readable
    if (cleaned.length > 20) {
      sections.push(`📋 ABOUT THIS ITEM\n${cleaned}\n`);
    }
  }

  // Specifications section
  if (specs) {
    let specList: Array<{ name: string; value: string }> = [];
    try {
      const parsed = typeof specs === 'string' ? JSON.parse(specs) : specs;
      if (Array.isArray(parsed)) {
        specList = parsed.filter((s: any) => s.name && s.value);
      }
    } catch { /* ignore parse errors */ }

    if (specList.length > 0) {
      const specLines = specList
        .slice(0, 10)
        .map(s => `• ${s.name}: ${s.value}`)
        .join('\n');
      sections.push(`📐 SPECIFICATIONS\n${specLines}\n`);
    }
  }

  // Category-specific sections
  const catLower = (category || '').toLowerCase();
  if (['jewelry', 'necklaces', 'earrings', 'rings', 'bracelets'].some(c => catLower.includes(c))) {
    sections.push(
      `💝 PERFECT FOR\n` +
      `• Birthday & anniversary gifts\n` +
      `• Everyday elegant wear\n` +
      `• Bridesmaid & wedding accessories\n` +
      `• Treating yourself\n`
    );
  } else if (['bags', 'handbags', 'backpacks', 'wallets'].some(c => catLower.includes(c))) {
    sections.push(
      `👜 GREAT FOR\n` +
      `• Daily commute & work\n` +
      `• Weekend outings & travel\n` +
      `• Gift for her or him\n`
    );
  } else if (['watches'].some(c => catLower.includes(c))) {
    sections.push(
      `⌚ IDEAL FOR\n` +
      `• Everyday wear\n` +
      `• Couple matching sets\n` +
      `• Birthday & holiday gifts\n`
    );
  } else if (['shoes', 'sandals', 'boots', 'loafers', 'flats'].some(c => catLower.includes(c))) {
    sections.push(
      `👟 PERFECT FOR\n` +
      `• Everyday comfort & style\n` +
      `• Work & casual outings\n` +
      `• Gift for her or him\n`
    );
  } else if (['sunglasses', 'eyewear', 'optical', 'glasses'].some(c => catLower.includes(c))) {
    sections.push(
      `🕶️ GREAT FOR\n` +
      `• UV protection & style\n` +
      `• Outdoor activities & travel\n` +
      `• Everyday fashion accessory\n`
    );
  }

  // Care instructions
  sections.push(
    `🔧 CARE INSTRUCTIONS\n` +
    `• Store in a cool, dry place\n` +
    `• Avoid contact with water, perfume, and chemicals\n` +
    `• Clean gently with a soft cloth\n`
  );

  // Shipping note
  sections.push(
    `📦 SHIPPING\n` +
    `• Ships from our warehouse within 1-3 business days\n` +
    `• Delivery typically takes 10-25 business days\n` +
    `• Tracking number provided\n`
  );

  return sections.join('\n');
}

// ─── Tag Generation ──────────────────────────────────────────────────

const CATEGORY_TAGS: Record<string, string[]> = {
  jewelry:          ['jewelry', 'fashion jewelry', 'gift for her', 'minimalist jewelry', 'everyday jewelry'],
  necklaces:        ['necklace', 'pendant necklace', 'layering necklace', 'dainty necklace', 'gift for women'],
  earrings:         ['earrings', 'drop earrings', 'stud earrings', 'fashion earrings', 'elegant earrings'],
  rings:            ['ring', 'fashion ring', 'stackable ring', 'minimalist ring', 'adjustable ring'],
  bracelets:        ['bracelet', 'charm bracelet', 'beaded bracelet', 'friendship bracelet', 'gift bracelet'],
  bags:             ['bag', 'handbag', 'fashion bag', 'everyday bag', 'gift for her'],
  handbags:         ['handbag', 'shoulder bag', 'women bag', 'leather bag', 'crossbody bag'],
  backpacks:        ['backpack', 'travel backpack', 'casual backpack', 'school bag', 'everyday backpack'],
  wallets:          ['wallet', 'slim wallet', 'card holder', 'minimalist wallet', 'leather wallet'],
  'hair accessories': ['hair accessory', 'hair clip', 'hair claw', 'hair jewelry', 'trendy hair'],
  'hair clips':     ['hair clip', 'hair claw', 'hair barrette', 'fashion hair clip', 'pearl hair clip'],
  scarves:          ['scarf', 'silk scarf', 'lightweight scarf', 'fashion scarf', 'gift scarf'],
  hats:             ['hat', 'beanie', 'bucket hat', 'sun hat', 'fashion hat'],
  sunglasses:       ['sunglasses', 'vintage sunglasses', 'retro sunglasses', 'UV protection', 'fashion eyewear'],
  watches:          ['watch', 'wristwatch', 'fashion watch', 'minimalist watch', 'gift watch'],
  belts:            ['belt', 'leather belt', 'fashion belt', 'dress belt', 'waist belt'],
  socks:            ['socks', 'cozy socks', 'fun socks', 'novelty socks', 'cotton socks'],
  gloves:           ['gloves', 'winter gloves', 'touchscreen gloves', 'warm gloves', 'fashion gloves'],
  'womens fashion shoes': ['womens shoes', 'fashion shoes', 'heels', 'flats', 'gift for her'],
  'mens casual shoes': ['mens shoes', 'casual shoes', 'loafers', 'comfortable shoes', 'everyday shoes'],
  'fashion wallets':  ['wallet', 'slim wallet', 'card holder', 'minimalist wallet', 'gift wallet'],
  'fashion bracelets': ['bracelet', 'charm bracelet', 'beaded bracelet', 'friendship bracelet', 'gift bracelet'],
  'hair accessories set': ['hair accessory', 'hair clip set', 'hair jewelry', 'trendy hair', 'gift for her'],
  'polarized sunglasses': ['sunglasses', 'polarized', 'UV protection', 'retro sunglasses', 'fashion eyewear'],
  'optical frames':   ['eyeglasses', 'optical frames', 'blue light', 'fashion glasses', 'reading glasses'],
  'coin purses':      ['coin purse', 'small wallet', 'card holder', 'mini purse', 'cute wallet'],
  'waist packs':      ['fanny pack', 'belt bag', 'waist bag', 'travel bag', 'crossbody bag'],
};

/**
 * Generate up to 13 Etsy tags from title keywords + category tags.
 * Each tag max 20 chars.
 */
function generateTags(titleEn: string, category: string, specs: any): string[] {
  const tags: Set<string> = new Set();

  // 1. Category-specific base tags (5 max)
  // Try exact match first, then partial match on category keywords
  const catKey = category?.toLowerCase() || '';
  let catTags = CATEGORY_TAGS[catKey];
  if (!catTags) {
    const match = Object.keys(CATEGORY_TAGS).find(k => catKey.includes(k) || k.includes(catKey));
    catTags = match ? CATEGORY_TAGS[match] : CATEGORY_TAGS['jewelry'];
  }
  for (const tag of catTags.slice(0, 5)) {
    if (tag.length <= 20) tags.add(tag);
  }

  // 2. Extract keywords from title
  const titleWords = (titleEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Build bigrams for long-tail tags
  for (let i = 0; i < titleWords.length - 1 && tags.size < 13; i++) {
    const bigram = `${titleWords[i]} ${titleWords[i + 1]}`;
    if (bigram.length <= 20) tags.add(bigram);
  }

  // Single meaningful words
  for (const word of titleWords) {
    if (tags.size >= 13) break;
    if (word.length >= 4 && word.length <= 20) tags.add(word);
  }

  // 3. Material/color from specs
  try {
    const parsed = typeof specs === 'string' ? JSON.parse(specs) : specs;
    if (Array.isArray(parsed)) {
      for (const spec of parsed) {
        if (tags.size >= 13) break;
        const name = (spec.name || '').toLowerCase();
        const value = (spec.value || '').toLowerCase();
        if (name.includes('material') && value.length <= 20) tags.add(value);
        if (name.includes('color') && value.length <= 20) tags.add(value);
      }
    }
  } catch { /* ignore */ }

  // 4. Universal gift/occasion tags to fill remaining slots
  const fillers = ['gift idea', 'birthday gift', 'handpicked', 'trendy', 'unique gift'];
  for (const filler of fillers) {
    if (tags.size >= 13) break;
    tags.add(filler);
  }

  return [...tags].slice(0, 13);
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was',
  'were', 'been', 'have', 'has', 'had', 'does', 'did', 'will', 'its',
  'our', 'your', 'his', 'her', 'they', 'them', 'their', 'not', 'but',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'than', 'too', 'very', 'just', 'also', 'new', 'hot', 'sale', 'free',
  'shipping', 'piece', 'pieces', 'pcs', 'lot', 'set', 'style',
]);

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const { limit } = parseArgs();
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: 'etsy_autostore',
    charset: 'utf8mb4',
    multipleStatements: false,
  });

  log(`Connected to etsy_autostore at ${DB_HOST}:${DB_PORT}`);

  let optimized = 0, skipped = 0, failed = 0;

  try {
    const limitClause = limit > 0 ? `LIMIT ${limit}` : '';
    const [products] = await conn.execute<any[]>(
      `SELECT p.id, p.id_1688, p.category
       FROM products p
       WHERE p.status = 'imported'
       ORDER BY p.id ASC
       ${limitClause}`
    );

    log(`Found ${products.length} imported products to optimize`);

    for (const prod of products) {
      try {
        // Get English data
        const [enRows] = await conn.execute<any[]>(
          `SELECT title_en, description_en, specifications_en, price_usd, etsy_category
           FROM products_en WHERE product_id = ?`,
          [prod.id]
        );
        if (enRows.length === 0) {
          log(`  [SKIP] No products_en for id=${prod.id}`);
          skipped++;
          continue;
        }
        const en = enRows[0];

        if (!en.title_en) {
          log(`  [SKIP] Empty title_en for id=${prod.id}`);
          skipped++;
          continue;
        }

        // Optimize
        const titleEtsy = optimizeTitle(en.title_en, prod.category);
        const descEtsy = optimizeDescription(en.description_en, en.title_en, en.specifications_en, prod.category);
        const tags = generateTags(en.title_en, prod.category, en.specifications_en);
        const tagsJson = JSON.stringify(tags);

        // Save
        await conn.execute(
          `UPDATE products_en
           SET title_etsy = ?, description_etsy = ?, tags_json = ?
           WHERE product_id = ?`,
          [titleEtsy, descEtsy, tagsJson, prod.id]
        );

        await conn.execute(
          `UPDATE products SET status = 'optimized' WHERE id = ?`,
          [prod.id]
        );

        log(`  [OK] Optimized id=${prod.id} (${prod.category}): "${titleEtsy.substring(0, 60)}..." [${tags.length} tags]`);
        optimized++;

      } catch (err: any) {
        log(`  [ERROR] Failed for id=${prod.id}: ${err.message}`);
        failed++;
      }
    }

  } finally {
    await conn.end();
  }

  console.log(`\n========================================`);
  console.log(`Etsy Copy Optimization complete:`);
  console.log(`  optimized=${optimized}`);
  console.log(`  skipped=${skipped}`);
  console.log(`  failed=${failed}`);
  console.log(`========================================`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
