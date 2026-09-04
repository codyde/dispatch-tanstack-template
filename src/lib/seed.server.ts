// Server-only: the Default starter project. Used by scripts/seed.ts on fresh
// deploys and by wipeAllDataOp to restore a clean, runnable baseline.
import { projects, tasks } from '@/db/schema'

export const DEFAULT_TASKS = [
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDefaults(db: any) {
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
      priority: t.priority,
    })
  }
  return proj
}
