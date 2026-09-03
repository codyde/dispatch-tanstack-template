import { db, projects, tasks } from '../src/db'

const seedProjects = [
  { name: 'Dispatch', key: 'DIS', color: '#d3481b' },
  { name: 'Infrastructure', key: 'INF', color: '#5b7d9e' },
] as const

const seedTasks: Record<string, Array<{ title: string; status: string; priority: string; description?: string }>> = {
  DIS: [
    {
      title: 'Fetch the top 5 Hacker News stories and save them as JSON',
      status: 'todo',
      priority: 'high',
      description:
        'Use the HN Firebase API (https://hacker-news.firebaseio.com/v0/topstories.json). Fetch the top 5 story items, extract title/url/score, and write them to /tmp/hn-top5.json. Print the file when done.',
    },
    {
      title: 'Scaffold an Express healthcheck endpoint and prove it responds',
      status: 'todo',
      priority: 'medium',
      description:
        'Create a minimal Node HTTP server on port 3000 with GET /health returning {"ok":true}. Start it in the background and curl it to prove it works.',
    },
    {
      title: 'Write a script that benchmarks JSON.parse on 10MB of data',
      status: 'backlog',
      priority: 'low',
      description: 'Generate ~10MB of JSON, parse it 10 times, report avg ms per parse.',
    },
    { title: 'Design empty states for the activity feed', status: 'backlog', priority: 'medium' },
    { title: 'Keyboard shortcuts: c to create, arrows to navigate', status: 'backlog', priority: 'low' },
    { title: 'Board polish pass — hover, spacing, dark mode', status: 'done', priority: 'medium' },
  ],
  INF: [
    {
      title: 'Report the sandbox VM kernel and available tooling',
      status: 'todo',
      priority: 'medium',
      description: 'Run uname -a, node -v, git --version, and df -h. Summarize what the sandbox image ships with.',
    },
    { title: 'Wire DATABASE_URL through private networking', status: 'done', priority: 'high' },
    { title: 'Preview environments for every PR', status: 'in_review', priority: 'medium' },
    { title: 'Point a custom domain at production', status: 'backlog', priority: 'low' },
  ],
}

async function main() {
  const existing = await db.select().from(projects)
  if (existing.length > 0) {
    console.log(`already seeded (${existing.length} projects) — skipping`)
    process.exit(0)
  }
  for (const p of seedProjects) {
    const list = seedTasks[p.key]
    const [proj] = await db
      .insert(projects)
      .values({ ...p, nextNumber: list.length + 1 })
      .returning()
    let n = 1
    for (const t of list) {
      await db.insert(tasks).values({
        projectId: proj.id,
        number: n++,
        title: t.title,
        description: t.description ?? '',
        status: t.status as never,
        priority: t.priority as never,
      })
    }
    console.log(`seeded ${p.name} with ${list.length} tasks`)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
