/**
 * Postgres persistence (Neon or any Postgres). When DATABASE_URL is set the
 * server stores farmer profiles, chat history and escalations here so they
 * survive redeploys. Without it, store.js falls back to local JSON files.
 *
 * Schema is intentionally simple — JSONB blobs that mirror the old file store,
 * so behaviour is identical and the migration is low-risk.
 */
import pg from 'pg';

let pool = null;

export function dbEnabled() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!dbEnabled()) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Neon requires SSL
      max: 5,
    });
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}

/** Create tables if they don't exist. Safe to call on every boot. */
export async function initDb() {
  if (!dbEnabled()) return false;
  await query(`
    CREATE TABLE IF NOT EXISTS kv_users (
      key  TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      phone    TEXT PRIMARY KEY,
      messages JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    CREATE TABLE IF NOT EXISTS escalations (
      id         BIGSERIAL PRIMARY KEY,
      data       JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  return true;
}
