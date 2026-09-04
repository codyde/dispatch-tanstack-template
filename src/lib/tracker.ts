import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'

// Thin createServerFn wrappers over src/lib/ops.server.ts (dynamic imports so
// pg never reaches the client bundle). The public REST API at /api/v1 uses
// the same ops.

export const listProjects = createServerFn({ method: 'GET' }).handler(async () => {
  const ops = await import('@/lib/ops.server')
  return ops.listProjectsOp()
})

export const createProject = createServerFn({ method: 'POST' })
  .validator(z.object({ name: z.string().min(1).max(60) }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.createProjectOp(data.name)
  })

export const listTasks = createServerFn({ method: 'GET' })
  .validator(z.object({ projectId: z.string() }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.listTasksOp(data.projectId)
  })

export const getTask = createServerFn({ method: 'GET' })
  .validator(z.object({ taskId: z.string() }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.getTaskOp(data.taskId)
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
    const ops = await import('@/lib/ops.server')
    return ops.createTaskOp(data)
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
    const ops = await import('@/lib/ops.server')
    return ops.updateTaskOp(data)
  })

// ————— settings —————

export const getSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const ops = await import('@/lib/ops.server')
  return ops.getSettingsOp()
})

export const saveSettings = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      anthropic_api_key: z.string().max(500).optional(),
      openai_api_key: z.string().max(500).optional(),
      grok_api_key: z.string().max(500).optional(),
      railway_api_token: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.saveSettingsOp(data)
  })

export const updateProject = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(60).optional(),
      color: z.string().max(20).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.updateProjectOp(data)
  })

export const deleteProject = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.deleteProjectOp(data.id)
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .validator(z.object({ taskId: z.string() }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.deleteTaskOp(data.taskId)
  })

export const duplicateTask = createServerFn({ method: 'POST' })
  .validator(z.object({ taskId: z.string() }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.duplicateTaskOp(data.taskId)
  })

export const listAllTasks = createServerFn({ method: 'GET' }).handler(async () => {
  const ops = await import('@/lib/ops.server')
  return ops.listAllTasksOp()
})

export const wipeAllData = createServerFn({ method: 'POST' })
  .validator(z.object({ confirmation: z.literal('delete all data') }))
  .handler(async () => {
    const ops = await import('@/lib/ops.server')
    return ops.wipeAllDataOp()
  })

export const getRunnerStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const ops = await import('@/lib/ops.server')
  return ops.getRunnerStatusOp()
})

// ————— webhooks —————

export const listWebhooks = createServerFn({ method: 'GET' }).handler(async () => {
  const ops = await import('@/lib/ops.server')
  return ops.listWebhooksOp()
})

export const createWebhook = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      url: z.string().url().max(2000),
      topics: z.array(z.string()).min(1),
    }),
  )
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.createWebhookOp(data)
  })

export const updateWebhook = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string(),
      enabled: z.boolean().optional(),
      topics: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.updateWebhookOp(data)
  })

export const deleteWebhook = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const ops = await import('@/lib/ops.server')
    return ops.deleteWebhookOp(data.id)
  })

// ————— query options —————

export const settingsQuery = queryOptions({
  queryKey: ['settings'],
  queryFn: () => getSettings(),
})

export const webhooksQuery = queryOptions({
  queryKey: ['webhooks'],
  queryFn: () => listWebhooks(),
})

export const allTasksQuery = queryOptions({
  queryKey: ['all-tasks'],
  queryFn: () => listAllTasks(),
  refetchInterval: (q) => (q.state.data?.runningIds.length ? 1500 : false),
})

export const runnerStatusQuery = queryOptions({
  queryKey: ['runner-status'],
  queryFn: () => getRunnerStatus(),
  staleTime: 30_000,
})

export const projectsQuery = queryOptions({
  queryKey: ['projects'],
  queryFn: () => listProjects(),
})

export const tasksQuery = (projectId: string) =>
  queryOptions({
    queryKey: ['tasks', projectId],
    queryFn: () => listTasks({ data: { projectId } }),
    // Live rows while any agent is working.
    refetchInterval: (q) => (q.state.data?.runningIds.length ? 1500 : false),
  })

export const taskQuery = (taskId: string) =>
  queryOptions({
    queryKey: ['task', taskId],
    queryFn: () => getTask({ data: { taskId } }),
    // Live feed while a sandbox run is active (stops when the run ends).
    refetchInterval: (q) => (q.state.data?.activeRun ? 1200 : false),
  })
