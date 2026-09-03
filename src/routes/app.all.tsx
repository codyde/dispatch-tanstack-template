import { Link, createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { allTasksQuery } from '@/lib/tracker'
import { TaskRowMenu } from '@/components/TaskRowMenu'
import type { TaskStatus } from '@/db/schema'

export const Route = createFileRoute('/app/all')({
  loader: ({ context }) => context.queryClient.ensureQueryData(allTasksQuery),
  component: AllProjects,
})

const STATUS_ORDER: { id: TaskStatus; label: string }[] = [
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'todo', label: 'Todo' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'done', label: 'Done' },
]

function AllProjects() {
  const { data } = useSuspenseQuery(allTasksQuery)
  const { rows, runningIds } = data

  return (
    <div>
      <div className="board-head">
        <h1>
          All Projects{' '}
          <span className="count">
            {rows.length} {rows.length === 1 ? 'task' : 'tasks'}
          </span>
        </h1>
      </div>

      {STATUS_ORDER.map(({ id, label }) => {
        const group = rows.filter((r) => r.task.status === id)
        if (group.length === 0) return null
        return (
          <section className="status-group" key={id}>
            <div className="g-head">
              <span className="status-dot" data-st={id} />
              {label} <span className="n">{group.length}</span>
            </div>
            {group.map(({ task, project }) => (
              <Link key={task.id} to="/app/task/$taskId" params={{ taskId: task.id }} className="task-row">
                <span className="status-dot" data-st={task.status} />
                <span className="proj-chip" style={{ color: project.color, borderColor: `color-mix(in srgb, ${project.color} 45%, var(--line))` }}>
                  {project.key}
                </span>
                <span className="tid">
                  {project.key}-{task.number}
                </span>
                <span className="title">{task.title}</span>
                {runningIds.includes(task.id) && (
                  <span className="chip-running">
                    <span className="pulse" /> sandbox
                  </span>
                )}
                <span className="prio" data-p={task.priority}>
                  {task.priority}
                </span>
                <TaskRowMenu taskId={task.id} projectId={task.projectId} title={task.title} />
              </Link>
            ))}
          </section>
        )
      })}
      {rows.length === 0 && <div className="empty" style={{ padding: '4px 28px' }}>No tasks anywhere yet.</div>}
    </div>
  )
}
