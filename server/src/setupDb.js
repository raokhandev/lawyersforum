import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';

const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
await conn.query(sql);
await conn.end();
console.log('Database and tables are ready.');
