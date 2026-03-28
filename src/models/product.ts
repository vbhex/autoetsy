/**
 * Etsy-eligible categories — brand-safe accessories + Etsy-friendly products.
 *
 * Includes both Phase 1 brand-safe craft/DIY categories AND broader accessories
 * that are authorized through the pipeline and sell well on Etsy.
 */

export const ETSY_BRAND_SAFE_CATEGORIES: Set<string> = new Set([
  // ── Phase 1 brand-safe (craft / DIY / components) ──

  // Phone cases / accessories
  'phone cases',
  'phone case',
  'phone accessories',
  'phone holders',
  'phone straps',

  // DIY / craft supplies
  'craft supplies',
  'diy craft supplies',
  'beads',
  'buttons',
  'lace',
  'lace trim',
  'ribbon',
  'fabric',

  // Jewelry findings / components
  'jewelry findings',
  'jewelry components',
  'jewelry supplies',
  'diy jewelry materials',

  // Hair accessories
  'hair accessories',
  'hair clips',
  'hair claws',
  'hair pins',
  'headbands',
  'scrunchies',
  'hair accessories set',
  // Retro / punk / vintage hair
  'retro hair clips',
  'punk hair accessories',
  'vintage headbands',

  // Shoe accessories
  'shoe accessories',
  'insoles',
  'shoelaces',
  'shoe decorations',
  'shoe charms',

  // Sewing notions
  'sewing notions',
  'zippers',
  'snaps',
  'elastic',
  'thread',

  // Stickers / patches / iron-ons
  'stickers',
  'patches',
  'iron-ons',
  'embroidered patches',
  'punk patches',
  'retro patches',

  // Keychains / bag charms
  'keychains',
  'bag charms',
  'retro keychains',
  'punk keychains',

  // Retro / punk jewelry & findings
  'vintage brooches',
  'punk jewelry findings',
  'retro body chain',
  'retro enamel pins',
  'punk chokers',
  'punk earrings',
  'retro earrings',
  'punk rings',
  'punk bracelets',
  'boho anklets',
  'steampunk accessories',

  // Candles / home fragrance / decor
  'candles',
  'home fragrance',
  'gothic candles',
  'gothic home decor',

  // Retro stationery & craft supplies
  'vintage washi tape',
  'retro bookmarks',
  'vintage journals',
  'vintage pencil case',

  // Retro phone cases
  'retro phone cases',

  // Retro socks
  'retro socks',

  // Retro bags
  'vintage coin purses',
  'retro tote bags',

  // Storage / organizers
  'storage',
  'organizers',
  'storage organizers',

  // Pet accessories
  'pet accessories',
  'pet collars',
  'pet toys',
  'pet bows',

  // Painting / art supplies
  'art supplies',
  'painting supplies',
  'paint brushes',
  'paint',
  'canvas',

  // Eyewear accessories
  'eyewear accessories',
  'glasses cases',
  'glasses chains',
  'nose pads',
  'lens cloths',

  // Watch accessories
  'watch accessories',
  'watch bands',
  'watch boxes',
  'watch repair tools',

  // Scarf accessories
  'scarf accessories',
  'scarf rings',
  'scarf clips',

  // Disposable items
  'disposable items',
  'disposable masks',
  'disposable slippers',

  // Stationery
  'stationery',
  'washi tape',
  'pen holders',

  // ── Expanded Etsy-friendly accessories ──

  // Hats & caps
  'bucket hats',
  'baseball caps',
  'beanies',
  'cowboy hats',

  // Scarves
  'winter scarves',
  'sun scarves',
  'silk scarves',

  // Sunglasses & eyewear
  'polarized sunglasses',
  'blue light glasses',
  'optical frames',
  'reading glasses',
  'sports sunglasses',

  // Bags & wallets
  'fashion wallets',
  'waist packs',
  'coin purses',

  // Finished jewelry
  'fashion earrings',
  'fashion bracelets',
  'fashion necklaces',
  'fashion rings',

  // Watches
  'quartz watches',
  'digital watches',

  // Shoes
  'sneakers',
  'mens casual shoes',
  'womens fashion shoes',

  // Apparel accessories (from 1688 pipeline)
  'suspendersbracesposturecor',
  'handkerchiefs',
  'pocketsquares',
  'sashes',
  'cummerbunds',
  'kneesleevelegwarmer',
  'tiebucklescufflinks',
  'tiechains',
  'oversleeve',
  'collarstays',
  'tieclip',
  'tieclipcufflinks',
  'tieset',
  'ties',
  'shoulderstrap',
  'garmentaccessories',
  'accessories',

  // Fitness / yoga
  'yoga mats',
  'fitness gloves',

  // Water bottles
  'water bottles',

  // Family matching
  'family matching outfits',
]);

/**
 * Maps 1688 category strings to Etsy taxonomy info.
 * taxonomy_id is 0 = "fetch from API later" placeholder.
 */
export const CATEGORY_TAXONOMY_MAP: Record<string, { taxonomyId: number; etsyCategory: string }> = {
  // Hair accessories
  'hair accessories':   { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories' },
  'hair clips':         { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Hair Clips' },
  'hair claws':         { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Hair Claws & Clips' },
  'headbands':          { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Headbands' },
  'scrunchies':         { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Scrunchies' },

  // DB category variants (matching exact strings from 1688_source)
  'fashion wallets':    { taxonomyId: 0, etsyCategory: 'Bags & Purses > Wallets & Money Clips' },
  'fashion bracelets':  { taxonomyId: 0, etsyCategory: 'Jewelry > Bracelets' },
  'hair accessories set': { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories' },

  // Phone cases / accessories
  'phone case':         { taxonomyId: 0, etsyCategory: 'Electronics & Accessories > Cases & Covers > Phone Cases' },
  'phone cases':        { taxonomyId: 0, etsyCategory: 'Electronics & Accessories > Cases & Covers > Phone Cases' },
  'phone accessories':  { taxonomyId: 0, etsyCategory: 'Electronics & Accessories > Phone Accessories' },
  'phone holders':      { taxonomyId: 0, etsyCategory: 'Electronics & Accessories > Phone Accessories' },
  'phone straps':       { taxonomyId: 0, etsyCategory: 'Electronics & Accessories > Phone Accessories' },

  // Craft / DIY supplies
  'craft supplies':     { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools' },
  'diy craft supplies': { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools' },
  'beads':              { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Beads, Gems & Cabochons' },
  'buttons':            { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Buttons' },
  'lace':               { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Trim' },
  'lace trim':          { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Trim' },
  'ribbon':             { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Trim' },
  'fabric':             { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Fabric' },

  // Jewelry findings / components
  'jewelry findings':   { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Jewelry & Beauty Supplies > Jewelry Findings' },
  'jewelry components': { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Jewelry & Beauty Supplies > Jewelry Findings' },
  'jewelry supplies':   { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Jewelry & Beauty Supplies' },
  'diy jewelry materials': { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Jewelry & Beauty Supplies' },

  // Shoe accessories
  'shoe accessories':   { taxonomyId: 0, etsyCategory: 'Accessories' },
  'insoles':            { taxonomyId: 0, etsyCategory: 'Accessories' },
  'shoelaces':          { taxonomyId: 0, etsyCategory: 'Accessories' },
  'shoe decorations':   { taxonomyId: 0, etsyCategory: 'Accessories' },
  'shoe charms':        { taxonomyId: 0, etsyCategory: 'Accessories' },

  // Sewing notions
  'sewing notions':     { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions' },
  'zippers':            { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions' },
  'snaps':              { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions' },
  'elastic':            { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions' },
  'thread':             { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions' },

  // Stickers / patches / iron-ons
  'stickers':           { taxonomyId: 0, etsyCategory: 'Paper & Party Supplies > Paper > Stickers, Labels & Tags' },
  'patches':            { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Patches' },
  'iron-ons':           { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Patches' },
  'embroidered patches': { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Fabric & Notions > Patches' },

  // Keychains / bag charms
  'keychains':          { taxonomyId: 0, etsyCategory: 'Accessories > Keychains & Lanyards' },
  'bag charms':         { taxonomyId: 0, etsyCategory: 'Accessories > Keychains & Lanyards' },

  // Candles / home fragrance
  'candles':            { taxonomyId: 0, etsyCategory: 'Home & Living > Home Fragrances > Candles' },
  'home fragrance':     { taxonomyId: 0, etsyCategory: 'Home & Living > Home Fragrances' },

  // Storage / organizers
  'storage':            { taxonomyId: 0, etsyCategory: 'Home & Living > Storage & Organization' },
  'organizers':         { taxonomyId: 0, etsyCategory: 'Home & Living > Storage & Organization' },
  'storage organizers': { taxonomyId: 0, etsyCategory: 'Home & Living > Storage & Organization' },

  // Pet accessories
  'pet accessories':    { taxonomyId: 0, etsyCategory: 'Pet Supplies' },
  'pet collars':        { taxonomyId: 0, etsyCategory: 'Pet Supplies > Pet Collars & Leashes' },
  'pet toys':           { taxonomyId: 0, etsyCategory: 'Pet Supplies > Pet Toys' },
  'pet bows':           { taxonomyId: 0, etsyCategory: 'Pet Supplies > Pet Clothing & Accessories' },

  // Painting / art supplies
  'art supplies':       { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Paints, Inks & Dyes' },
  'painting supplies':  { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Paints, Inks & Dyes' },
  'paint brushes':      { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Tools & Equipment' },
  'paint':              { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Paints, Inks & Dyes' },
  'canvas':             { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Canvas & Surfaces' },

  // Eyewear accessories
  'eyewear accessories': { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyewear Cases & Accessories' },
  'glasses cases':      { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyewear Cases & Accessories' },
  'glasses chains':     { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyewear Cases & Accessories' },
  'nose pads':          { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyewear Cases & Accessories' },
  'lens cloths':        { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyewear Cases & Accessories' },

  // Watch accessories
  'watch accessories':  { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Watch Bands & Straps' },
  'watch bands':        { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Watch Bands & Straps' },
  'watch boxes':        { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Watch Storage' },
  'watch repair tools': { taxonomyId: 0, etsyCategory: 'Craft Supplies & Tools > Tools & Equipment' },

  // Scarf accessories
  'scarf accessories':  { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Scarf Rings & Clips' },
  'scarf rings':        { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Scarf Rings & Clips' },
  'scarf clips':        { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Scarf Rings & Clips' },

  // Disposable items
  'disposable items':   { taxonomyId: 0, etsyCategory: 'Bath & Beauty' },
  'disposable masks':   { taxonomyId: 0, etsyCategory: 'Bath & Beauty' },
  'disposable slippers': { taxonomyId: 0, etsyCategory: 'Bath & Beauty' },

  // Stationery
  'stationery':         { taxonomyId: 0, etsyCategory: 'Paper & Party Supplies' },
  'washi tape':         { taxonomyId: 0, etsyCategory: 'Paper & Party Supplies > Paper > Stickers, Labels & Tags' },
  'pen holders':        { taxonomyId: 0, etsyCategory: 'Home & Living > Office > Office Storage' },

  // ── Expanded categories ──

  // Hats & caps
  'bucket hats':        { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Bucket Hats' },
  'baseball caps':      { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Baseball & Trucker Caps' },
  'beanies':            { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Winter Hats' },
  'cowboy hats':        { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Cowboy Hats' },

  // Scarves
  'winter scarves':     { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Scarves' },
  'sun scarves':        { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Scarves' },
  'silk scarves':       { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Scarves' },

  // Sunglasses & eyewear
  'polarized sunglasses': { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Sunglasses' },
  'blue light glasses': { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyeglasses' },
  'optical frames':     { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyeglasses' },
  'reading glasses':    { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyeglasses' },
  'sports sunglasses':  { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Sunglasses' },

  // Bags & wallets
  'waist packs':        { taxonomyId: 0, etsyCategory: 'Bags & Purses > Fanny Packs' },
  'coin purses':        { taxonomyId: 0, etsyCategory: 'Bags & Purses > Wallets & Money Clips > Coin Purses' },

  // Finished jewelry
  'fashion earrings':   { taxonomyId: 0, etsyCategory: 'Jewelry > Earrings' },
  'fashion necklaces':  { taxonomyId: 0, etsyCategory: 'Jewelry > Necklaces' },
  'fashion rings':      { taxonomyId: 0, etsyCategory: 'Jewelry > Rings' },

  // Watches
  'quartz watches':     { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Wrist Watches' },
  'digital watches':    { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Wrist Watches' },

  // Shoes
  'sneakers':           { taxonomyId: 0, etsyCategory: 'Shoes > Athletic Shoes > Sneakers' },
  'mens casual shoes':  { taxonomyId: 0, etsyCategory: 'Shoes > Men\'s Shoes' },
  'womens fashion shoes': { taxonomyId: 0, etsyCategory: 'Shoes > Women\'s Shoes' },

  // Apparel accessories
  'suspendersbracesposturecor': { taxonomyId: 0, etsyCategory: 'Accessories > Belts & Suspenders > Suspenders' },
  'handkerchiefs':      { taxonomyId: 0, etsyCategory: 'Accessories > Handkerchiefs' },
  'pocketsquares':      { taxonomyId: 0, etsyCategory: 'Accessories > Handkerchiefs' },
  'sashes':             { taxonomyId: 0, etsyCategory: 'Accessories > Belts & Suspenders' },
  'cummerbunds':        { taxonomyId: 0, etsyCategory: 'Accessories > Belts & Suspenders' },
  'kneesleevelegwarmer': { taxonomyId: 0, etsyCategory: 'Accessories > Leg Warmers' },
  'tiebucklescufflinks': { taxonomyId: 0, etsyCategory: 'Accessories > Ties > Cuff Links & Tie Clips' },
  'tiechains':          { taxonomyId: 0, etsyCategory: 'Accessories > Ties > Cuff Links & Tie Clips' },
  'oversleeve':         { taxonomyId: 0, etsyCategory: 'Accessories > Gloves & Mittens' },
  'collarstays':        { taxonomyId: 0, etsyCategory: 'Accessories > Ties > Cuff Links & Tie Clips' },
  'tieclip':            { taxonomyId: 0, etsyCategory: 'Accessories > Ties > Cuff Links & Tie Clips' },
  'tieclipcufflinks':   { taxonomyId: 0, etsyCategory: 'Accessories > Ties > Cuff Links & Tie Clips' },
  'tieset':             { taxonomyId: 0, etsyCategory: 'Accessories > Ties' },
  'ties':               { taxonomyId: 0, etsyCategory: 'Accessories > Ties' },
  'shoulderstrap':      { taxonomyId: 0, etsyCategory: 'Bags & Purses > Bag Accessories' },
  'garmentaccessories': { taxonomyId: 0, etsyCategory: 'Accessories' },
  'accessories':        { taxonomyId: 0, etsyCategory: 'Accessories' },

  // Fitness / yoga
  'yoga mats':          { taxonomyId: 0, etsyCategory: 'Home & Living > Spirituality & Religion > Meditation' },
  'fitness gloves':     { taxonomyId: 0, etsyCategory: 'Accessories > Gloves & Mittens' },

  // Water bottles
  'water bottles':      { taxonomyId: 0, etsyCategory: 'Home & Living > Kitchen & Dining > Drink & Barware > Drinkware' },

  // Family matching
  'family matching outfits': { taxonomyId: 0, etsyCategory: 'Clothing > Family Matching Outfits' },
};

export interface ProductRecord {
  id: number;
  id_1688: string;
  status: string;
  url: string;
  title_zh: string;
  category: string;
  thumbnail_url: string;
  etsy_listing_id: string | null;
}

export interface ProductEN {
  product_id: number;
  title_en: string;
  description_en: string;
  title_etsy: string | null;
  description_etsy: string | null;
  tags_json: string | null;
  specifications_en: string;
  price_usd: number;
  etsy_taxonomy_id: number | null;
}

export interface ProductVariantEN {
  product_id: number;
  option_name_en: string;
  option_value_en: string;
  option_value_zh: string;
  price_usd: number;
  color_family: string;
  sort_order: number;
}
