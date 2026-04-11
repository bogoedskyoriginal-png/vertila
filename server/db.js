import pg from "pg";

const { Pool } = pg;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const useSsl = process.env.DATABASE_SSL === "false" ? false : !connectionString.includes("localhost");

  return new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });
}

export async function ensureSchema(pool) {
  await pool.query(`
    create table if not exists shows (
      id text primary key,
      admin_key text not null,
      config jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    create table if not exists sessions (
      show_id text not null references shows(id) on delete cascade,
      session_id uuid not null,
      used boolean not null default false,
      created_at timestamptz not null default now(),
      used_at timestamptz,
      result_index int,
      primary key (show_id, session_id)
    );
  `);

  await pool.query(`create index if not exists sessions_created_at_idx on sessions(created_at);`);
}