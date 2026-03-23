import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { config } from '../config';
import { log, logError } from '../utils/logger';

let pool: Pool | null = null;

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });

    await initializeSchema();
    log('Database pool initialized');
  }
  return pool;
}

async function initializeSchema(): Promise<void> {
  const connection = await pool!.getConnection();

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_1688 VARCHAR(50) UNIQUE NOT NULL,
        etsy_listing_id VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'imported',
        skip_reason TEXT,
        url VARCHAR(500) DEFAULT '',
        title_zh VARCHAR(500) DEFAULT '',
        category VARCHAR(100) DEFAULT '',
        thumbnail_url VARCHAR(500) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_id_1688 (id_1688),
        INDEX idx_etsy_listing_id (etsy_listing_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products_raw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL UNIQUE,
        title_zh TEXT,
        description_zh LONGTEXT,
        specifications_zh JSON,
        price_cny DECIMAL(10,2),
        min_order_qty INT DEFAULT 1,
        seller_name VARCHAR(200),
        seller_rating DECIMAL(3,1),
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products_images_raw (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        image_url VARCHAR(1000) NOT NULL,
        image_type ENUM('gallery', 'description', 'variant') DEFAULT 'gallery',
        sort_order INT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products_images_ok (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        raw_image_id INT NOT NULL,
        image_url VARCHAR(1000) NOT NULL,
        image_type ENUM('gallery', 'description', 'variant') DEFAULT 'gallery',
        sort_order INT DEFAULT 0,
        has_chinese_text BOOLEAN DEFAULT FALSE,
        has_watermark BOOLEAN DEFAULT FALSE,
        passed BOOLEAN DEFAULT TRUE,
        analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (raw_image_id) REFERENCES products_images_raw(id) ON DELETE CASCADE,
        INDEX idx_product_passed (product_id, passed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products_en (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL UNIQUE,
        title_en VARCHAR(500),
        description_en LONGTEXT,
        title_etsy VARCHAR(200) COMMENT 'Etsy-optimized title (max 140 chars)',
        description_etsy LONGTEXT COMMENT 'Etsy-optimized description with lifestyle sections',
        tags_json JSON COMMENT 'Array of up to 13 Etsy tags',
        specifications_en JSON,
        price_usd DECIMAL(10,2),
        etsy_taxonomy_id INT COMMENT 'Etsy seller taxonomy node ID',
        etsy_category VARCHAR(200) COMMENT 'Etsy category path string',
        translated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products_variants_en (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        option_name_en VARCHAR(50),
        option_value_en VARCHAR(200),
        option_value_zh VARCHAR(200),
        price_usd DECIMAL(10,2),
        color_family VARCHAR(50),
        sort_order INT DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        variant_name_zh VARCHAR(100) NOT NULL,
        variant_name_en VARCHAR(100),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product (product_id),
        UNIQUE KEY unique_variant (product_id, variant_name_zh)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS variant_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        variant_id INT NOT NULL,
        value_name_zh VARCHAR(200) NOT NULL,
        value_name_en VARCHAR(200),
        image_url VARCHAR(1000),
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
        INDEX idx_variant (variant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS variant_skus (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        sku_code VARCHAR(100),
        variant_values_json JSON NOT NULL,
        price_cny DECIMAL(10,2),
        stock INT DEFAULT 0,
        available BOOLEAN DEFAULT TRUE,
        image_url VARCHAR(1000),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product (product_id),
        INDEX idx_available (product_id, available)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS platform_listings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        platform ENUM('aliexpress','amazon','etsy','ebay') NOT NULL,
        platform_product_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'active',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_product_platform (product_id, platform),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS processing_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    log('Database schema initialized');
  } finally {
    connection.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    log('Database connection closed');
  }
}

export async function updateProductStatus(
  productId: number,
  status: string,
  skipReason?: string
): Promise<void> {
  const p = await getPool();
  await p.execute(
    `UPDATE products SET status = ?, skip_reason = ? WHERE id = ?`,
    [status, skipReason || null, productId]
  );
}

export async function upsertPlatformListing(
  id1688: string,
  platform: 'aliexpress' | 'amazon' | 'etsy' | 'ebay',
  platformProductId: string | null
): Promise<void> {
  const p = await getPool();

  await p.execute(
    `INSERT INTO platform_listings (product_id, platform, platform_product_id, status)
     SELECT id, ?, ?, 'active' FROM products WHERE id_1688 = ?
     ON DUPLICATE KEY UPDATE platform_product_id = COALESCE(VALUES(platform_product_id), platform_product_id), updated_at = NOW()`,
    [platform, platformProductId, id1688]
  );

  if (platform === 'etsy' && platformProductId) {
    await p.execute(
      `UPDATE products SET etsy_listing_id = ?, status = 'listed' WHERE id_1688 = ? AND (etsy_listing_id IS NULL OR etsy_listing_id = '')`,
      [platformProductId, id1688]
    );
  }

  // Dual-write to central listing_mappings in 1688_source
  try {
    await p.execute(
      `INSERT INTO 1688_source.listing_mappings (product_id, source_id, platform, store_id, platform_product_id, status)
       SELECT id, id_1688, ?, '', ?, 'listed' FROM products WHERE id_1688 = ?
       ON DUPLICATE KEY UPDATE
         platform_product_id = COALESCE(VALUES(platform_product_id), platform_product_id),
         updated_at = NOW()`,
      [platform, platformProductId, id1688]
    );
  } catch (err: any) {
    // Non-fatal: central table may not exist on all environments
    logError('Failed to write to listing_mappings (non-fatal)', err);
  }

  log(`Platform listing recorded: ${id1688} on ${platform} = ${platformProductId}`);
}

export async function getProductStats(): Promise<{ total: number; byStatus: Record<string, number> }> {
  const p = await getPool();
  const [totalRows] = await p.execute<RowDataPacket[]>('SELECT COUNT(*) as count FROM products');
  const [statusRows] = await p.execute<RowDataPacket[]>(
    'SELECT status, COUNT(*) as count FROM products GROUP BY status'
  );

  const byStatus: Record<string, number> = {};
  for (const row of statusRows) {
    byStatus[row.status] = row.count;
  }
  return { total: totalRows[0].count, byStatus };
}
