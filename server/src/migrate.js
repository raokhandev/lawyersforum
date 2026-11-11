import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';

// Applies the SQL files in server/db/migrations/ (in name order) that have not been applied yet, and records
// them in the schema_migrations table. Runs when the server starts, and is safe to run repeatedly.
//
// Databases that were changed by hand before this runner existed are handled: a migration with a check below
// is recorded without running it if the database already has its change.
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');

const ALREADY_APPLIED = {
  '001_author_summary_description.sql': async (col) => !!(await col('authors', 'description')),
  '002_author_summary_500.sql': async (col) => ((await col('authors', 'summary'))?.len ?? 0) >= 500,
  '003_author_summary_700.sql': async (col) => ((await col('authors', 'summary'))?.len ?? 0) >= 700,
  '004_article_home_slot.sql': async (col) => !!(await col('articles', 'home_slot')),
  '005_article_image.sql': async (col) => !!(await col('articles', 'image_url')),
  '006_author_sort_order.sql': async (col) => !!(await col('authors', 'sort_order')),
  '007_article_tile_image.sql': async (col) => !!(await col('articles', 'tile_image_url')),
  '008_practice_areas.sql': async (col) => !!(await col('practice_areas', 'slug')),
  '009_article_practice_areas_many.sql': async (col) => !!(await col('article_practice_areas', 'article_id')),
  '010_jurisdictions.sql': async (col) => !!(await col('article_jurisdictions', 'article_id')),
};

export async function runMigrations() {
  const database = process.env.DB_NAME || 'lawyersforum';
  let conn;
  try {
    conn = await mysql.createConnection({ ...dbConfig, database, multipleStatements: true });

    const col = async (table, column) => {
      const [rows] = await conn.query(
        `SELECT CHARACTER_MAXIMUM_LENGTH AS len FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [database, table, column]
      );
      return rows[0] ? { len: rows[0].len } : null;
    };

    const [[{ n: hasTables }]] = await conn.query(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [database, 'authors']
    );
    if (!hasTables) {
      console.warn('Migrations skipped: the authors table does not exist yet (run `npm run db:setup` in server/).');
      return;
    }

    await conn.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name VARCHAR(190) PRIMARY KEY,
         applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       ) ENGINE=InnoDB`
    );
    const [done] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set(done.map((r) => r.name));

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      const check = ALREADY_APPLIED[file];
      if (check && (await check(col))) {
        console.log(`Migration ${file}: already present in the database, recorded.`);
      } else {
        console.log(`Migration ${file}: applying...`);
        await conn.query(fs.readFileSync(path.join(dir, file), 'utf8'));
        console.log(`Migration ${file}: done.`);
      }
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    }
  } catch (err) {
    // Keep the site up, but make the problem obvious in the logs.
    console.error('MIGRATION FAILED:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}
