import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';

const dbName = process.env.DB_NAME || 'lawyersforum';
const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
const ident = mysql.escapeId(dbName);
await conn.query(`CREATE DATABASE IF NOT EXISTS ${ident} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE ${ident}`);
await conn.query(sql);
await conn.end();
console.log(`Database "${dbName}" and tables are ready.`);
