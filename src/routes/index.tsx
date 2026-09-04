import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { MiniDispatch } from '@/components/MiniDispatch'
import { runnerStatusQuery } from '@/lib/tracker'

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(runnerStatusQuery),
  component: Home,
})

const BENEFITS = [
  {
    k: '01 · DEPLOY',
    t: 'Zero-config deploys',
    d: 'Push a TanStack Start repo and Railway builds it — Railpack detects Start, Vite, and your package manager. No Dockerfile, no adapter config.',
  },
  {
    k: '02 · DATA',
    t: 'Postgres in one click',
    d: 'This tracker persists to a Railway Postgres provisioned next to the app, connected over private networking. Redis, MySQL, and Mongo work the same way.',
  },
  {
    k: '03 · COMPUTE',
    t: 'Sandboxes as a primitive',
    d: 'Every task you run in Dispatch boots a real Railway sandbox VM via the SDK — isolated compute your app creates and destroys at runtime.',
  },
  {
    k: '04 · SHIP',
    t: 'Environments per PR',
    d: 'Preview environments clone your services — app and database — per pull request, so every branch of your tracker is a working tracker.',
  },
]

const STACK = [
  '@tanstack/react-start',
  '@tanstack/react-router',
  '@tanstack/react-query',
  '@tanstack/ai',
  'drizzle-orm',
  'railway (sandboxes SDK)',
  'postgres',
]

function Home() {
  const { data: runner } = useSuspenseQuery(runnerStatusQuery)
  return (
    <div className="home">
      <nav className="home-nav">
        <span className="wordmark">
          <span className="dot" />
          Dispatch
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/app" className="btn primary">
            Open Dispatch
          </Link>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A Railway template for TanStack</p>
          <h1>
            Run TanStack on <em>Railway.</em>
          </h1>
          <p className="sub">
            Dispatch is a work tracker built with <strong>TanStack Start</strong>,{' '}
            <strong>TanStack AI</strong>, and <strong>Postgres</strong> — with one twist: tasks
            don't just sit on a board. Click run, and a <strong>Railway sandbox</strong> boots a
            real VM where an agent executes the work and streams it back into the task.
          </p>
          <div className="hero-actions">
            <Link to="/app" className="btn primary">
              Open Dispatch →
            </Link>
            <a className="btn" href="https://railway.com/new" target="_blank" rel="noreferrer">
              Deploy on Railway
            </a>
          </div>
        </div>
        <MiniDispatch aiReady={runner.aiReady} railwayReady={runner.railwayReady} />
      </header>

      <section className="section stack-section">
        <h2>The stack</h2>
        <div className="stack-row">
          {STACK.map((s) => (
            <span className="stack-chip" key={s}>
              {s}
            </span>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>What Railway gives a TanStack app</h2>
        <p className="lede">
          Everything in this template runs on Railway primitives — the same ones you get on any
          project.
        </p>
        <div className="benefits">
          {BENEFITS.map((b) => (
            <div className="benefit" key={b.k}>
              <span className="k">{b.k}</span>
              <h3>{b.t}</h3>
              <p>{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>How Dispatch is wired</h2>
        <p className="lede">One Start app, one database, and sandboxes created on demand.</p>
        <div className="arch">
          <div className="arch-node">
            <div className="t">TanStack Start</div>
            <div className="d">SSR + server functions</div>
          </div>
          <span className="arch-link">drizzle →</span>
          <div className="arch-node">
            <div className="t">Railway Postgres</div>
            <div className="d">projects · tasks · runs</div>
          </div>
          <span className="arch-link">← activity feed</span>
          <div className="arch-node">
            <div className="t">Sandbox VMs</div>
            <div className="d">TanStack AI agent + tools</div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>A real API, out of the box</h2>
        <p className="lede">
          Everything the UI does goes through server functions backed by the same operations as
          the public REST API — query it from scripts, agents, or your own tools.
        </p>
        <div className="term api-term">
          <div className="cmd">curl -s $APP_URL/api/v1/projects</div>
          <div className="out">[{'{'} "id": "…", "name": "Platform", "key": "PLA", … {'}'}]</div>
          <div className="cmd">
            curl -s -X POST $APP_URL/api/v1/projects/&lt;id&gt;/tasks -H 'content-type:
            application/json' -d '{'{'}"title": "Fetch top HN stories"{'}'}'
          </div>
          <div className="out">{'{'} "id": "…", "number": 4, "status": "todo", … {'}'}</div>
          <div className="cmd">curl -s -X POST $APP_URL/api/v1/tasks/&lt;id&gt;/run</div>
          <div className="out">{'{'} "runId": "…" {'}'} — a sandbox picks the task up</div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="inner">
          <span>Built to hand to a team — fork it, point it at your own Railway project.</span>
          <div className="brand-logos">
            <img src="/brand/tanstack.png" alt="TanStack" />
            <img src="/brand/railway-light.svg" alt="Railway" className="logo-light" />
            <img src="/brand/railway-dark.svg" alt="Railway" className="logo-dark" />
          </div>
        </div>
      </footer>
    </div>
  )
}
