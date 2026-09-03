import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { taskQuery, updateTask } from '@/lib/tracker'
import type { TaskPriority, TaskStatus } from '@/db/schema'

export const Route = createFileRoute('/app/task/$taskId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(taskQuery(params.taskId)),
  component: TaskDetail,
})

function TaskDetail() {
  const { taskId } = Route.useParams()
  const { data } = useSuspenseQuery(taskQuery(taskId))
  const { task, project, feed } = data
  const queryClient = useQueryClient()
  const running = task.status === 'in_progress'

  // Poll while a sandbox run is active so the feed streams in.
  useEffect(() => {
    if (!running) return
    const t = setInterval(
      () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
      1200,
    )
    return () => clearInterval(t)
  }, [running, taskId, queryClient])

  const [desc, setDesc] = useState(task.description)
  useEffect(() => setDesc(task.description), [task.id, task.description])

  const patch = useMutation({
    mutationFn: (data: Partial<{ status: TaskStatus; priority: TaskPriority; description: string }>) =>
      updateTask({ data: { taskId, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] })
    },
  })

  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/run`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  return (
    <div className="task-page">
      <Link to="/app/$projectId" params={{ projectId: task.projectId }} className="back">
        ← {project.name}
      </Link>

      <div className="task-head">
        <h1>{task.title}</h1>
        <button
          className="btn primary"
          onClick={() => run.mutate()}
          disabled={running || run.isPending}
        >
          {running ? 'Sandbox running…' : 'Run in Agent Sandbox'}
        </button>
      </div>

      <div className="task-meta">
        <span className="tid">
          {project.key}-{task.number}
        </span>
        <select
          value={task.status}
          onChange={(e) => patch.mutate({ status: e.target.value as TaskStatus })}
        >
          <option value="backlog">Backlog</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="done">Done</option>
        </select>
        <select
          value={task.priority}
          onChange={(e) => patch.mutate({ priority: e.target.value as TaskPriority })}
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <textarea
        className="task-desc"
        placeholder="Describe the work. The sandbox agent gets this verbatim."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => desc !== task.description && patch.mutate({ description: desc })}
      />

      <div className="feed">
        <h2>
          Activity
          {running && (
            <span className="chip-running">
              <span className="pulse" /> live
            </span>
          )}
        </h2>
        {feed.length === 0 && <div className="empty">Nothing yet — run the task to see a sandbox work it.</div>}
        {feed.map((a) => (
          <FeedItem key={a.id} a={a} />
        ))}
      </div>
    </div>
  )
}

function FeedItem({ a }: { a: { id: string; kind: string; payload: Record<string, unknown>; createdAt: string | Date } }) {
  const p = a.payload as Record<string, string>
  const when = new Date(a.createdAt).toLocaleTimeString()
  return (
    <div className="feed-item">
      {a.kind === 'run_started' && (
        <div className="sys">
          <strong>Sandbox started</strong> {p.sandboxId && <span className="mono">({String(p.sandboxId).slice(0, 8)})</span>}{' '}
          <span className="when">{when}</span>
        </div>
      )}
      {a.kind === 'run_finished' && (
        <div className="sys">
          <strong>Run finished</strong> — {p.summary ?? 'done'} <span className="when">{when}</span>
        </div>
      )}
      {a.kind === 'run_error' && (
        <div className="sys" style={{ color: 'var(--accent)' }}>
          <strong>Run failed</strong> — {p.error} <span className="when">{when}</span>
        </div>
      )}
      {a.kind === 'status_change' && (
        <div className="sys">
          Status <strong>{p.from}</strong> → <strong>{p.to}</strong> <span className="when">{when}</span>
        </div>
      )}
      {a.kind === 'agent_text' && <div className="feed-text">{p.text}</div>}
      {a.kind === 'tool_call' && (
        <div className="term">
          <div className="cmd">{p.command ?? `${p.tool}(${p.args ?? ''})`}</div>
          {p.output != null && <div className="out">{p.output}</div>}
        </div>
      )}
    </div>
  )
}
