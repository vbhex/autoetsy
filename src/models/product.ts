/**
 * Etsy-eligible 1688 categories and their Etsy taxonomy mapping.
 *
 * Taxonomy IDs will be populated once we fetch the Etsy taxonomy tree
 * via the API (setup-taxonomy task). For now, store category names
 * and placeholder IDs — the import task uses this to filter eligible products.
 */

export const ETSY_ELIGIBLE_CATEGORIES: Set<string> = new Set([
  // Jewelry — Etsy's #1 physical product category (38% US e-commerce GMV)
  'jewelry', 'necklaces', 'earrings', 'rings', 'bracelets', 'anklets',
  'fashion jewelry', 'pendant necklaces', 'stud earrings', 'hoop earrings',
  'chain necklaces', 'charm bracelets', 'fashion bracelets',

  // Bags & Purses
  'bags', 'handbags', 'backpacks', 'wallets', 'crossbody bags', 'tote bags',
  'clutches', 'coin purses', 'waist packs', 'shoulder bags', 'messenger bags',
  'fashion wallets',

  // Accessories — Hair, Scarves, Hats
  'hair accessories', 'hair clips', 'hair claws', 'headbands', 'scrunchies',
  'scarves', 'hats', 'beanies', 'caps', 'bucket hats', 'sun hats',
  'winter hats', 'silk scarves', 'bandanas', 'hair accessories set',

  // Eyewear
  'sunglasses', 'eyewear', 'reading glasses', 'blue light glasses',
  'fashion glasses', 'polarized sunglasses', 'optical frames',

  // Watches
  'watches', 'quartz watches', 'couple watches', 'digital watches',
  'wristwatches', 'fashion watches', 'vintage watches',

  // Belts
  'belts', 'leather belts', 'canvas belts', 'chain belts',
  'waist belts', 'dress belts',

  // Shoes — strong Etsy category
  'womens fashion shoes', 'mens casual shoes', 'womens shoes', 'mens shoes',
  'sandals', 'flats', 'loafers', 'boots', 'sneakers',

  // Socks & Gloves (low-risk accessories)
  'socks', 'gloves', 'mittens', 'winter gloves', 'fashion socks',
]);

/**
 * Maps 1688 category strings to Etsy taxonomy info.
 * taxonomy_id is 0 = "fetch from API later" placeholder.
 */
export const CATEGORY_TAXONOMY_MAP: Record<string, { taxonomyId: number; etsyCategory: string }> = {
  // Jewelry
  'jewelry':            { taxonomyId: 0, etsyCategory: 'Jewelry' },
  'necklaces':          { taxonomyId: 0, etsyCategory: 'Jewelry > Necklaces' },
  'earrings':           { taxonomyId: 0, etsyCategory: 'Jewelry > Earrings' },
  'rings':              { taxonomyId: 0, etsyCategory: 'Jewelry > Rings' },
  'bracelets':          { taxonomyId: 0, etsyCategory: 'Jewelry > Bracelets' },
  'fashion jewelry':    { taxonomyId: 0, etsyCategory: 'Jewelry' },
  'pendant necklaces':  { taxonomyId: 0, etsyCategory: 'Jewelry > Necklaces > Pendant Necklaces' },
  'stud earrings':      { taxonomyId: 0, etsyCategory: 'Jewelry > Earrings > Stud Earrings' },
  'hoop earrings':      { taxonomyId: 0, etsyCategory: 'Jewelry > Earrings > Hoop Earrings' },
  'chain necklaces':    { taxonomyId: 0, etsyCategory: 'Jewelry > Necklaces > Chain Necklaces' },
  'charm bracelets':    { taxonomyId: 0, etsyCategory: 'Jewelry > Bracelets > Charm Bracelets' },

  // Bags & Purses
  'bags':               { taxonomyId: 0, etsyCategory: 'Bags & Purses' },
  'handbags':           { taxonomyId: 0, etsyCategory: 'Bags & Purses > Handbags' },
  'backpacks':          { taxonomyId: 0, etsyCategory: 'Bags & Purses > Backpacks' },
  'wallets':            { taxonomyId: 0, etsyCategory: 'Bags & Purses > Wallets & Money Clips' },
  'crossbody bags':     { taxonomyId: 0, etsyCategory: 'Bags & Purses > Crossbody Bags' },
  'tote bags':          { taxonomyId: 0, etsyCategory: 'Bags & Purses > Tote Bags' },
  'clutches':           { taxonomyId: 0, etsyCategory: 'Bags & Purses > Clutches & Evening Bags' },
  'waist packs':        { taxonomyId: 0, etsyCategory: 'Bags & Purses > Fanny Packs' },
  'shoulder bags':      { taxonomyId: 0, etsyCategory: 'Bags & Purses > Shoulder Bags' },
  'messenger bags':     { taxonomyId: 0, etsyCategory: 'Bags & Purses > Messenger Bags' },

  // Accessories
  'hair accessories':   { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories' },
  'hair clips':         { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Hair Clips' },
  'hair claws':         { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Hair Claws & Clips' },
  'headbands':          { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Headbands' },
  'scrunchies':         { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories > Scrunchies' },
  'scarves':            { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps' },
  'hats':               { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps' },
  'beanies':            { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Winter Hats' },
  'caps':               { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Baseball & Trucker Caps' },
  'bucket hats':        { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Bucket Hats' },
  'sun hats':           { taxonomyId: 0, etsyCategory: 'Accessories > Hats & Caps > Sun Hats & Visors' },
  'bandanas':           { taxonomyId: 0, etsyCategory: 'Accessories > Scarves & Wraps > Bandanas' },

  // Eyewear
  'sunglasses':         { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Sunglasses' },
  'polarized sunglasses': { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Sunglasses' },
  'eyewear':            { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear' },
  'optical frames':     { taxonomyId: 0, etsyCategory: 'Accessories > Sunglasses & Eyewear > Eyeglasses' },

  // Watches
  'watches':            { taxonomyId: 0, etsyCategory: 'Jewelry > Watches' },
  'quartz watches':     { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Wrist Watches' },
  'couple watches':     { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Wrist Watches' },
  'digital watches':    { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Wrist Watches' },
  'fashion watches':    { taxonomyId: 0, etsyCategory: 'Jewelry > Watches > Wrist Watches' },

  // Belts
  'belts':              { taxonomyId: 0, etsyCategory: 'Accessories > Belts & Suspenders > Belts' },
  'leather belts':      { taxonomyId: 0, etsyCategory: 'Accessories > Belts & Suspenders > Belts' },
  'chain belts':        { taxonomyId: 0, etsyCategory: 'Accessories > Belts & Suspenders > Belts' },

  // Shoes
  'womens fashion shoes': { taxonomyId: 0, etsyCategory: 'Shoes > Women\'s Shoes' },
  'mens casual shoes':  { taxonomyId: 0, etsyCategory: 'Shoes > Men\'s Shoes' },
  'womens shoes':       { taxonomyId: 0, etsyCategory: 'Shoes > Women\'s Shoes' },
  'mens shoes':         { taxonomyId: 0, etsyCategory: 'Shoes > Men\'s Shoes' },
  'sandals':            { taxonomyId: 0, etsyCategory: 'Shoes > Sandals' },
  'boots':              { taxonomyId: 0, etsyCategory: 'Shoes > Boots' },

  // Socks & Gloves
  'socks':              { taxonomyId: 0, etsyCategory: 'Clothing > Socks' },
  'gloves':             { taxonomyId: 0, etsyCategory: 'Accessories > Gloves & Mittens' },

  // DB category variants (matching exact strings from 1688_source)
  'fashion wallets':    { taxonomyId: 0, etsyCategory: 'Bags & Purses > Wallets & Money Clips' },
  'fashion bracelets':  { taxonomyId: 0, etsyCategory: 'Jewelry > Bracelets' },
  'hair accessories set': { taxonomyId: 0, etsyCategory: 'Accessories > Hair Accessories' },
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
