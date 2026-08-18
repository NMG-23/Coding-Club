/**
 * DATABASE INITIALIZATION
 * 
 * FUTURE EXPANSION (MySQL / PostgreSQL):
 * Since this project uses Drizzle ORM, migrating to a larger database like MySQL or Postgres is very simple!
 * 
 * To migrate to MySQL:
 * 1. Install MySQL driver: `bun add mysql2 drizzle-orm`
 * 2. Change import: `import { drizzle } from 'drizzle-orm/mysql2';`
 * 3. Change import: `import mysql from 'mysql2/promise';`
 * 4. Initialize: 
 *    const poolConnection = mysql.createPool({ uri: process.env.DATABASE_URL });
 *    export const db = drizzle(poolConnection, { schema });
 * 
 * Don't forget to also update `src/db/schema.ts` to use `mysqlTable` instead of `sqliteTable`.
 */
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
sqlite.exec('PRAGMA journal_mode = WAL;');

export const db = drizzle(sqlite, { schema });
