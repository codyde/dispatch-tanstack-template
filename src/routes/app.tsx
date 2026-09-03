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
        <div className="foot">Sandboxes run your tasks.</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
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
