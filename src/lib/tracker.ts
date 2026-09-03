import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

// All db access stays behind dynamic imports inside handlers so pg never
// reaches the client bundle.

export const listProjects = createServerFn({ method: 'GET' }).handler(async () => {
  const { db, projects } = await import('@/db')
  return db.select().from(projects).orderBy(projects.createdAt)
})

export const listTasks = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    const { db, tasks, runs } = await import('@/db')
    const { eq, desc, and, inArray } = await import('drizzle-orm')
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, data.projectId))
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
  })

export const createProject = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1).max(60) }))
  .handler(async ({ data }) => {
    const { db, projects } = await import('@/db')
    const existing = await db.select({ key: projects.key }).from(projects)
    const taken = new Set(existing.map((p) => p.key))
    let base = data.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'PRJ'
    let key = base
    let i = 2
    while (taken.has(key)) key = `${base.slice(0, 2)}${i++}`
    const palette = ['#d3481b', '#5b7d9e', '#4a7d4f', '#c08a1f', '#7d5ba6']
    const [project] = await db
      .insert(projects)
      .values({ name: data.name, key, color: palette[existing.length % palette.length] })
      .returning()
    return project
  })

export const getTask = createServerFn({ method: 'GET' })
  .validator(z.object({ taskId: z.string() }))
  .handler(async ({ data }) => {
    const { db, tasks, projects, activities, runs } = await import('@/db')
    const { eq, asc, and } = await import('drizzle-orm')
    const [task] = await db.select().from(tasks).where(eq(tasks.id, data.taskId))
    if (!task) throw new Error('task not found')
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
  })

export const createTask = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      projectId: z.string(),
      title: z.string().min(1).max(300),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
      description: z.string().max(20_000).default(''),
    }),
  )
  .handler(async ({ data }) => {
    const { db, tasks, projects } = await import('@/db')
    const { eq, sql } = await import('drizzle-orm')
    const [proj] = await db
      .update(projects)
      .set({ nextNumber: sql`${projects.nextNumber} + 1` })
      .where(eq(projects.id, data.projectId))
      .returning()
    if (!proj) throw new Error('project not found')
    const [task] = await db
      .insert(tasks)
      .values({
        projectId: data.projectId,
        number: proj.nextNumber - 1,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'todo',
      })
      .returning()
    return task
  })

export const updateTask = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      taskId: z.string(),
      title: z.string().min(1).max(300).optional(),
      description: z.string().max(20_000).optional(),
      status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done']).optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { db, tasks, activities } = await import('@/db')
    const { eq } = await import('drizzle-orm')
    const { taskId, ...patch } = data
    const [before] = await db.select().from(tasks).where(eq(tasks.id, taskId))
    if (!before) throw new Error('task not found')
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
  })

// ————— query options —————

export const projectsQuery = queryOptions({
  queryKey: ['projects'],
  queryFn: () => listProjects(),
})

export const tasksQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['tasks', projectId],
    queryFn: () => listTasks({ data: { projectId } }),
  })

export const taskQuery = (taskId: string) =>
  queryOptions({
    queryKey: ['task', taskId],
    queryFn: () => getTask({ data: { taskId } }),
  })
