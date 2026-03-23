# Etsy Auto-Lister

Etsy product listing automation — imports authorized products from `1688_source`, optimizes copy for Etsy SEO, and lists via Etsy Open API v3.

## Pipeline

```
1688_source (ae_enriched/ae_exported + authorized_products)
    ↓
Import → etsy_autostore (status: imported)
    ↓
Copy Optimizer → title_etsy, description_etsy, tags_json (status: optimized)
    ↓
[Future] API Lister → createDraftListing + uploadListingImage + updateListingInventory (status: listed)
```

## Tasks

### import-from-1688source.ts
- **Input**: `1688_source.products` with `status IN ('ae_enriched', 'ae_exported')` + `authorized_products`
- **Output**: Rows in `etsy_autostore.products` with `status = 'imported'`
- **Non-destructive**: Does NOT update status in `1688_source` (same product can be on AliExpress + Etsy)
- **Filter**: Only Etsy-eligible categories (jewelry, accessories, bags, watches, eyewear, belts)

```bash
node dist/tasks/import-from-1688source.js
```

### optimize-copy.ts
- **Input**: `etsy_autostore.products` with `status = 'imported'`
- **Output**: `products_en.title_etsy`, `description_etsy`, `tags_json`; `status = 'optimized'`
- **What it does**: Rewrites English title for Etsy SEO (140 chars), formats description with lifestyle sections, generates 13 tags

```bash
node dist/tasks/optimize-copy.js
```

## Database: etsy_autostore

| Table | Purpose |
|-------|---------|
| products | Core table; tracks status flow (imported → optimized → listed) |
| products_raw | Chinese title/desc/specs, price_cny |
| products_en | English + Etsy-optimized title/desc, tags, price_usd, etsy_taxonomy_id |
| products_images_raw | Raw image URLs |
| products_images_ok | Passed images for listing |
| products_variants_en | Flat translated variants |
| product_variants | Normalized variant dimensions |
| variant_values | Normalized option values |
| variant_skus | SKU combinations (Size × Color) |
| platform_listings | Maps product_id → etsy listing_id |

## Status Flow

```
imported → optimized → listed
```

## Build & Run

```bash
./node_modules/.bin/tsc          # Build (NOT npx tsc)
node dist/tasks/import-from-1688source.js
node dist/tasks/optimize-copy.js
```

## Etsy API (Future — needs API credentials)

- **Auth**: OAuth 2.0 with PKCE (scopes: listings_r, listings_w, shops_r, shops_w)
- **Create listing**: POST /v3/application/shops/{shop_id}/listings (createDraftListing)
- **Upload image**: POST /v3/application/shops/{shop_id}/listings/{listing_id}/images
- **Set inventory**: PUT /v3/application/listings/{listing_id}/inventory
- **Activate**: PATCH /v3/application/shops/{shop_id}/listings/{listing_id} (state: active)
- **Required fields**: quantity, title, description, price, who_made, when_made, taxonomy_id, shipping_profile_id, readiness_state_id

## Etsy-Specific Rules

- `who_made`: "someone_else" (products made by another company)
- `when_made`: "2020_2026"
- Titles: max 140 characters, keyword-front-loaded
- Tags: exactly 13 per listing, long-tail keywords
- Descriptions: lifestyle storytelling > spec dumps
- Fees: $0.20/listing (4-month renew) + 6.5% transaction + ~3% payment processing

## Blue Ocean Categories

See `documents/etsy-store/etsy-blue-ocean-categories.md`

| Priority | Category | Why |
|----------|----------|-----|
| 1 | Jewelry | 38% US e-commerce share on Etsy |
| 2 | Bags & Purses | High AOV, strong gifting |
| 3 | Hair/Scarves/Hats | Trending accessories |
| 4 | Eyewear | No certs needed, high margin |
| 5 | Watches | Gift positioning works well |
| 6 | Belts | Niche but consistent demand |
