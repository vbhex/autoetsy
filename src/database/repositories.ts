import { RowDataPacket } from 'mysql2/promise';
import { getPool } from './db';

export async function getProductsByStatus(status: string, limit?: number): Promise<any[]> {
  const p = await getPool();
  const limitClause = limit ? `LIMIT ${Math.max(1, Math.floor(limit))}` : '';
  const [rows] = await p.execute<RowDataPacket[]>(
    `SELECT p.id, p.id_1688, p.status, p.url, p.title_zh, p.category, p.thumbnail_url
     FROM products p
     WHERE p.status = ?
     ORDER BY p.id ASC
     ${limitClause}`,
    [status]
  );
  return rows as any[];
}

/** Optimized copy ready, not yet linked to an Etsy listing. */
export async function getOptimizedProductsWithoutEtsyListing(limit?: number): Promise<any[]> {
  const p = await getPool();
  const limitClause = limit ? `LIMIT ${Math.max(1, Math.floor(limit))}` : '';
  const [rows] = await p.execute<RowDataPacket[]>(
    `SELECT p.id, p.id_1688, p.status, p.url, p.title_zh, p.category, p.thumbnail_url
     FROM products p
     WHERE p.status = 'optimized'
       AND (p.etsy_listing_id IS NULL OR p.etsy_listing_id = '')
     ORDER BY p.id ASC
     ${limitClause}`
  );
  return rows as any[];
}

export async function getProductEN(productId: number): Promise<any | null> {
  const p = await getPool();
  const [rows] = await p.execute<RowDataPacket[]>(
    `SELECT product_id, title_en, description_en, title_etsy, description_etsy,
            tags_json, specifications_en, price_usd, etsy_taxonomy_id, etsy_category
     FROM products_en
     WHERE product_id = ?`,
    [productId]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getProductImages(productId: number): Promise<any[]> {
  const p = await getPool();
  const [rows] = await p.execute<RowDataPacket[]>(
    `SELECT image_url, sort_order
     FROM products_images_ok
     WHERE product_id = ? AND passed = 1 AND image_type = 'gallery'
     ORDER BY sort_order`,
    [productId]
  );
  return rows as any[];
}

export async function getProductVariantsEN(productId: number): Promise<any[]> {
  const p = await getPool();
  const [rows] = await p.execute<RowDataPacket[]>(
    `SELECT option_name_en, option_value_en, option_value_zh, price_usd, color_family, sort_order
     FROM products_variants_en
     WHERE product_id = ?
     ORDER BY sort_order`,
    [productId]
  );
  return rows as any[];
}

export async function updateProductEN(
  productId: number,
  updates: {
    title_etsy?: string;
    description_etsy?: string;
    tags_json?: string;
    etsy_category?: string;
  }
): Promise<void> {
  const p = await getPool();
  const sets: string[] = [];
  const values: any[] = [];

  if (updates.title_etsy !== undefined) {
    sets.push('title_etsy = ?');
    values.push(updates.title_etsy);
  }
  if (updates.description_etsy !== undefined) {
    sets.push('description_etsy = ?');
    values.push(updates.description_etsy);
  }
  if (updates.tags_json !== undefined) {
    sets.push('tags_json = ?');
    values.push(updates.tags_json);
  }
  if (updates.etsy_category !== undefined) {
    sets.push('etsy_category = ?');
    values.push(updates.etsy_category);
  }

  if (sets.length === 0) return;

  values.push(productId);
  await p.execute(
    `UPDATE products_en SET ${sets.join(', ')} WHERE product_id = ?`,
    values
  );
}
