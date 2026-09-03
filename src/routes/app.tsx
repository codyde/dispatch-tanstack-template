import { useState } from 'react'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createProject, projectsQuery } from '@/lib/tracker'

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
        <NewProject />
        <span className="label" style={{ marginTop: 14 }}>
          Workspace
        </span>
        <Link to="/app/webhooks" className="proj-link" activeProps={{ 'data-status': 'active' } as never}>
          <HookIcon />
          Webhooks
        </Link>
        <div className="sidebar-bottom">
          <Link to="/app/settings" className="proj-link" activeProps={{ 'data-status': 'active' } as never}>
            <GearIcon />
            Settings
          </Link>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function HookIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function NewProject() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const create = useMutation({
    mutationFn: (n: string) => createProject({ data: { name: n } }),
    onSuccess: async (project) => {
      setName('')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate({ to: '/app/$projectId', params: { projectId: project.id } })
    },
  })

  if (!open) {
    return (
      <button className="new-proj-btn" onClick={() => setOpen(true)}>
        + New project
      </button>
    )
  }
  return (
    <form
      className="new-proj"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) create.mutate(name.trim())
      }}
    >
      <input
        autoFocus
        type="text"
        placeholder="Project name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        onBlur={() => !name.trim() && setOpen(false)}
      />
    </form>
  )
}
