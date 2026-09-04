import { db, projects } from '../src/db'
import { seedDefaults } from '../src/lib/seed.server'

async function main() {
  const existing = await db.select().from(projects)
  if (existing.length > 0) {
    console.log(`already seeded (${existing.length} projects) — skipping`)
    process.exit(0)
  }
  await seedDefaults(db)
  console.log('seeded Default starter project')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
