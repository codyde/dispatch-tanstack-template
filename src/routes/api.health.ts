import { createFileRoute } from '@tanstack/react-router'

// Readiness check: the app is only "up" if it can reach its database.
// Wire this as the Railway healthcheck path (/api/health).
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { db } = await import('@/db')
          const { sql } = await import('drizzle-orm')
          await db.execute(sql`select 1`)
          return Response.json({ ok: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return Response.json({ ok: false, error: message }, { status: 503 })
        }
      },
    },
  },
})
