import { db, projects, tasks } from '../src/db'

// Starter content for fresh deploys: one Default project with five small,
// fast tasks that show off the sandbox agent loop end to end.
const DEFAULT_TASKS = [
  {
    title: 'Fetch the top 5 Hacker News stories and save them as JSON',
    priority: 'high',
    description:
      'Use the HN Firebase API (https://hacker-news.firebaseio.com/v0/topstories.json). Fetch the top 5 story items, extract title/url/score, write them to /tmp/hn-top5.json, then print the file.',
  },
  {
    title: 'Report the sandbox VM kernel and available tooling',
    priority: 'medium',
    description:
      'Run uname -a, node -v, git --version, and df -h /. Then write a short markdown report to /tmp/vm-report.md and print it.',
  },
  {
    title: 'Stand up an HTTP healthcheck and prove it responds',
    priority: 'medium',
    description:
      'Create a minimal Node HTTP server on port 3000 with GET /health returning {"ok":true}. Start it in the background and curl it to prove it works.',
  },
  {
    title: 'Write a haiku about trains to a file and read it back',
    priority: 'low',
    description:
      'Compose a haiku about trains, write it to /tmp/haiku.txt with a heredoc, then cat the file to verify it landed.',
  },
  {
    title: 'Benchmark JSON.parse on a 10MB payload',
    priority: 'low',
    description:
      'Write a Node script that generates ~10MB of JSON, parses it 10 times, and reports the average milliseconds per parse.',
  },
] as const

async function main() {
  const existing = await db.select().from(projects)
  if (existing.length > 0) {
    console.log(`already seeded (${existing.length} projects) — skipping`)
    process.exit(0)
  }
  const [proj] = await db
    .insert(projects)
    .values({ name: 'Default', key: 'DEF', color: '#d3481b', nextNumber: DEFAULT_TASKS.length + 1 })
    .returning()
  let n = 1
  for (const t of DEFAULT_TASKS) {
    await db.insert(tasks).values({
      projectId: proj.id,
      number: n++,
      title: t.title,
      description: t.description,
      status: 'todo',
      priority: t.priority as never,
    })
  }
  console.log(`seeded Default with ${DEFAULT_TASKS.length} tasks`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
