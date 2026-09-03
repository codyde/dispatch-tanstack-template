import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { projectsQuery } from '@/lib/tracker'

export const Route = createFileRoute('/app')({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  component: AppShell,
})

function AppShell() {
  const { data: projects } = useSuspenseQuery(projectsQuery)
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="home-link">
          <span className="dot" style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--accent)' }} />
          Dispatch
        </Link>
        <span className="label">Projects</span>
        {projects.map((p) => (
          <Link
            key={p.id}
            to="/app/$projectId"
            params={{ projectId: p.id }}
            className="proj-link"
            activeProps={{ 'data-status': 'active' } as never}
          >
            <span className="swatch" style={{ background: p.color }} />
            {p.name}
            <span className="key">{p.key}</span>
          </Link>
        ))}
        <div className="foot">Sandboxes run your tasks.</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
