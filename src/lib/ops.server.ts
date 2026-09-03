// Server-only: the one implementation of tracker operations, shared by the
// createServerFn wrappers (src/lib/tracker.ts) and the public REST API
// (src/routes/api.v1.*). Import only via dynamic import from handlers.
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { activities, db, projects, runs, tasks } from '@/db'
import type { TaskPriority, TaskStatus } from '@/db/schema'

export class NotFoundError extends Error {}

export async function listProjectsOp() {
  return db.select().from(projects).orderBy(projects.createdAt)
}

export async function createProjectOp(name: string) {
  const existing = await db.select({ key: projects.key }).from(projects)
  const taken = new Set(existing.map((p) => p.key))
  const base = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'PRJ'
  let key = base
  let i = 2
  while (taken.has(key)) key = `${base.slice(0, 2)}${i++}`
  const palette = ['#d3481b', '#5b7d9e', '#4a7d4f', '#c08a1f', '#7d5ba6']
  const [project] = await db
    .insert(projects)
    .values({ name, key, color: palette[existing.length % palette.length] })
    .returning()
  return project
}

export async function listTasksOp(projectId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(desc(tasks.number))
  const runningIds =
    rows.length === 0
      ? []
      : (
          await db
            .select({ taskId: runs.taskId })
            .from(runs)
            .where(and(eq(runs.status, 'running'), inArray(runs.taskId, rows.map((r) => r.id))))
        ).map((r) => r.taskId)
  return { tasks: rows, runningIds }
}

export async function getTaskOp(taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!task) throw new NotFoundError('task not found')
  const [project] = await db.select().from(projects).where(eq(projects.id, task.projectId))
  const feed = await db
    .select()
    .from(activities)
    .where(eq(activities.taskId, task.id))
    .orderBy(asc(activities.createdAt))
  const [activeRun] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.taskId, task.id), eq(runs.status, 'running')))
    .limit(1)
  return { task, project, feed, activeRun: activeRun ?? null }
}

export async function createTaskOp(input: {
  projectId: string
  title: string
  priority?: TaskPriority
  description?: string
  status?: TaskStatus
}) {
  const [proj] = await db
    .update(projects)
    .set({ nextNumber: sql`${projects.nextNumber} + 1` })
    .where(eq(projects.id, input.projectId))
    .returning()
  if (!proj) throw new NotFoundError('project not found')
  const [task] = await db
    .insert(tasks)
    .values({
      projectId: input.projectId,
      number: proj.nextNumber - 1,
      title: input.title,
      description: input.description ?? '',
      priority: input.priority ?? 'medium',
      status: input.status ?? 'todo',
    })
    .returning()
  return task
}

export async function updateTaskOp(input: {
  taskId: string
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
}) {
  const { taskId, ...patch } = input
  const [before] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!before) throw new NotFoundError('task not found')
  const [task] = await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning()
  if (patch.status && patch.status !== before.status) {
    await db.insert(activities).values({
      taskId,
      kind: 'status_change',
      payload: { from: before.status, to: patch.status },
    })
  }
  return task
}
