import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { deleteTask, duplicateTask, taskQuery, updateTask } from '@/lib/tracker'
import { Menu } from '@/components/Menu'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { TaskPriority, TaskStatus } from '@/db/schema'

export const Route = createFileRoute('/app/task/$taskId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(taskQuery(params.taskId)),
  component: TaskDetail,
})

function TaskDetail() {
  const { taskId } = Route.useParams()
  const { data } = useSuspenseQuery(taskQuery(taskId))
  const { task, project, feed, activeRun, lastRun } = data
  const queryClient = useQueryClient()
  const running = activeRun != null

  // The final agent message of the last successful run — the "closed loop".
  const agentResult =
    !running && lastRun?.status === 'succeeded'
      ? (
          (feed.filter((a) => a.runId === lastRun.id && a.kind === 'agent_text').at(-1)?.payload as
            | { text?: string }
            | undefined)?.text ??
          lastRun.summary ??
          ''
        ).replace(/^SUMMARY:\s*/i, '') || null
      : null

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
    mutationFn: (data: Partial<{ status: TaskStatus; priority: TaskPriority; description: string; title: string }>) =>
      updateTask({ data: { taskId, ...data } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] })
    },
  })

  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/tasks/${taskId}/run`, { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
  })

  const navigate = useNavigate()
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(task.title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const duplicate = useMutation({
    mutationFn: () => duplicateTask({ data: { taskId } }),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] })
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] })
      navigate({ to: '/app/task/$taskId', params: { taskId: copy.id } })
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteTask({ data: { taskId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] })
      queryClient.invalidateQueries({ queryKey: ['all-tasks'] })
      navigate({ to: '/app/$projectId', params: { projectId: task.projectId } })
    },
  })

  return (
    <div className="task-page">
      <Link to="/app/$projectId" params={{ projectId: task.projectId }} className="back">
        ← {project.name}
      </Link>

      <div className="task-head">
        {renaming ? (
          <form
            className="rename-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (renameValue.trim()) {
                patch.mutate({ title: renameValue.trim() } as never)
                setRenaming(false)
              }
            }}
          >
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
              onBlur={() => setRenaming(false)}
            />
          </form>
        ) : (
          <h1>{task.title}</h1>
        )}
        <button
          className="btn primary"
          onClick={() => run.mutate()}
          disabled={running || run.isPending}
        >
          {running ? 'Sandbox running…' : 'Run in Agent Sandbox'}
        </button>
        <Menu
          label="Task actions"
          items={[
            {
              label: 'Rename…',
              onSelect: () => {
                setRenameValue(task.title)
                setRenaming(true)
              },
            },
            { label: 'Duplicate', onSelect: () => duplicate.mutate() },
            {
              label: 'Copy link',
              onSelect: () => {
                void navigator.clipboard?.writeText(window.location.href)
              },
            },
            {
              label: 'Delete task',
              danger: true,
              onSelect: () => setConfirmingDelete(true),
            },
          ]}
        />
        <ConfirmDialog
          open={confirmingDelete}
          title={`Delete "${task.title}"?`}
          body="This permanently removes the task, its runs, and its activity history."
          confirmLabel="Delete task"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false)
            remove.mutate()
          }}
        />
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

      {activeRun && (
        <div className="run-banner">
          <span className="pulse" />
          Agent working in sandbox{' '}
          <span className="mono">{String(activeRun.sandboxId ?? '').slice(0, 8) || 'booting…'}</span> · started{' '}
          {new Date(activeRun.startedAt).toLocaleTimeString()}
        </div>
      )}

      <textarea
        className="task-desc"
        placeholder="Describe the work. The sandbox agent gets this verbatim."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onBlur={() => desc !== task.description && patch.mutate({ description: desc })}
      />

      {agentResult && (
        <div className="results-card">
          <h2>
            <CheckIcon /> Agent Results
          </h2>
          <div className="results-body">{agentResult}</div>
          {lastRun?.finishedAt && (
            <div className="results-meta mono">
              sandbox {String(lastRun.sandboxId ?? '').slice(0, 8)} · finished{' '}
              {new Date(lastRun.finishedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

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
        {running && !feedIsStreaming(feed) && (
          <div className="feed-item">
            <div className="sys thinking">
              <span className="pulse-inline" /> agent is thinking…
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function feedIsStreaming(feed: Array<{ kind: string; payload: Record<string, unknown> }>) {
  const last = feed[feed.length - 1]
  return last?.kind === 'tool_result' && (last.payload as { running?: boolean }).running === true
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
      {a.kind === 'tool_result' && (
        <div className="term">
          {p.output ? <div className="out">{p.output}</div> : null}
          {(p as Record<string, unknown>).running === true ? (
            <div className="out running-line">
              <span className="pulse-inline" /> running…
            </div>
          ) : (
            (p as Record<string, unknown>).exitCode !== undefined && (
              <div className="exit-line" data-fail={(p as Record<string, unknown>).exitCode !== 0 || undefined}>
                exit {String((p as Record<string, unknown>).exitCode)}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
