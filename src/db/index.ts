// Server-only module. Never import from client code — reach it via
// dynamic import inside createServerFn handlers / server routes.
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL,
  max: 10,
})

export const db = drizzle(pool, { schema })
export * from './schema'
