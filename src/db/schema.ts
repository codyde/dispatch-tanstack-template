import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())

export const projects = pgTable('projects', {
  id: id(),
  name: text('name').notNull(),
  key: text('key').notNull(),
  color: text('color').notNull().default('#d3481b'),
  nextNumber: integer('next_number').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'

export const tasks = pgTable('tasks', {
  id: id(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  status: text('status').$type<TaskStatus>().notNull().default('backlog'),
  priority: text('priority').$type<TaskPriority>().notNull().default('medium'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const runs = pgTable('runs', {
  id: id(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  sandboxId: text('sandbox_id'),
  status: text('status').$type<'running' | 'succeeded' | 'failed' | 'cancelled'>().notNull().default('running'),
  summary: text('summary'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
})

export type ActivityKind =
  | 'status_change'
  | 'comment'
  | 'agent_text'
  | 'tool_call'
  | 'tool_result'
  | 'run_started'
  | 'run_finished'
  | 'run_error'

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const webhooks = pgTable('webhooks', {
  id: id(),
  url: text('url').notNull(),
  topics: jsonb('topics').$type<string[]>().notNull().default([]),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const activities = pgTable('activities', {
  id: id(),
  taskId: text('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  runId: text('run_id'),
  kind: text('kind').$type<ActivityKind>().notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
