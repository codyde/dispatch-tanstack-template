// Server-only: the sandbox run engine. A run boots a Railway sandbox VM,
// hands the task to a TanStack AI agent loop with shell/file tools that
// execute inside that sandbox, and persists every step to the activity feed.
import { chat, maxIterations, toolDefinition } from '@tanstack/ai'
import { createAnthropicChat, createAnthropicChatWithClient } from '@tanstack/ai-anthropic'
import Anthropic from '@anthropic-ai/sdk'
import { Sandbox } from 'railway'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { activities, db, runs, tasks } from '@/db'

const activeRuns = new Map<string, AbortController>()

async function makeAdapter() {
  // Key precedence: user-saved Anthropic key (Settings) → the ambient LLM
  // relay on Railway agent/dev-studio VMs (AI_BASE_URL + AI_API_KEY, Bearer
  // auth — x-api-key is rejected) → a plain ANTHROPIC_API_KEY.
  const model = (process.env.DISPATCH_MODEL ?? 'claude-sonnet-5') as never
  const { getSecretOp } = await import('@/lib/ops.server')
  const userKey = await getSecretOp('anthropic_api_key')
  if (userKey) {
    return { adapter: createAnthropicChat(model, userKey), model }
  }
  const relayUrl = process.env.AI_BASE_URL
  const relayKey = process.env.AI_API_KEY
  if (relayUrl && relayKey) {
    const client = new Anthropic({ apiKey: null, authToken: relayKey, baseURL: relayUrl })
    return { adapter: createAnthropicChatWithClient(model, client as never), model }
  }
  return { adapter: createAnthropicChat(model, process.env.ANTHROPIC_API_KEY ?? ''), model }
}

async function log(taskId: string, runId: string | null, kind: string, payload: Record<string, unknown>) {
  const [row] = await db
    .insert(activities)
    .values({ taskId, runId, kind: kind as never, payload })
    .returning()
  return row
}

const trim = (s: string, max = 8000) => (s.length > max ? s.slice(0, max) + '\n…(truncated)' : s)

export async function startRun(taskId: string): Promise<{ runId: string }> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId))
  if (!task) throw new Error('task not found')
  if (task.status === 'in_progress') throw new Error('task already running')

  const [run] = await db.insert(runs).values({ taskId }).returning()
  await db.update(tasks).set({ status: 'in_progress', updatedAt: new Date() }).where(eq(tasks.id, taskId))
  await log(taskId, run.id, 'status_change', { from: task.status, to: 'in_progress' })

  // Fire and forget: the loop keeps writing activities; the UI polls them.
  void executeRun(task.id, run.id, task.title, task.description).catch(() => {})
  return { runId: run.id }
}

export function cancelRun(runId: string) {
  activeRuns.get(runId)?.abort()
}

async function executeRun(taskId: string, runId: string, title: string, description: string) {
  const abort = new AbortController()
  activeRuns.set(runId, abort)
  let sandbox: Sandbox | null = null
  let pendingText = ''

  const flushText = async () => {
    const text = pendingText.trim()
    pendingText = ''
    if (text) await log(taskId, runId, 'agent_text', { text })
  }

  try {
    const { emitWebhook, getSecretOp } = await import('@/lib/ops.server')
    if (!process.env.RAILWAY_API_TOKEN) {
      const userToken = await getSecretOp('railway_api_token')
      if (userToken) process.env.RAILWAY_API_TOKEN = userToken
    }
    sandbox = await Sandbox.create({
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
      idleTimeoutMinutes: 10,
    })
    await log(taskId, runId, 'run_started', { sandboxId: sandbox.id })
    await db.update(runs).set({ sandboxId: sandbox.id }).where(eq(runs.id, runId))
    void emitWebhook('run.started', { taskId, runId, sandboxId: sandbox.id, title })

    const runCommand = toolDefinition({
      name: 'run_command',
      description:
        'Run a shell command in the sandbox VM (Debian, Node 24, git, curl preinstalled). Returns stdout+stderr.',
      inputSchema: z.object({ command: z.string(), cwd: z.string().optional() }),
    }).server(async (input) => {
      await flushText()
      // Log the command immediately, then stream stdout/stderr into a
      // tool_result row as it arrives so the feed updates while the command
      // is still running.
      await log(taskId, runId, 'tool_call', { command: input.command })
      const resultRow = await log(taskId, runId, 'tool_result', { output: '', running: true })
      let output = ''
      let lastWrite = 0
      const write = async (final: boolean, exitCode?: number) => {
        await db
          .update(activities)
          .set({
            payload: {
              output: trim(output),
              running: !final,
              ...(exitCode !== undefined ? { exitCode } : {}),
            },
          })
          .where(eq(activities.id, resultRow.id))
      }
      const onChunk = (c: string) => {
        output += c
        const now = Date.now()
        if (now - lastWrite > 700) {
          lastWrite = now
          void write(false).catch(() => {})
        }
      }
      const res = await sandbox!.exec(input.command, {
        cwd: input.cwd,
        timeoutSec: 180,
        onStdout: onChunk,
        onStderr: onChunk,
      })
      await write(true, res.exitCode)
      return { exitCode: res.exitCode, output: trim(output, 4000) }
    })

    const writeFile = toolDefinition({
      name: 'write_file',
      description: 'Write a file in the sandbox VM.',
      inputSchema: z.object({ path: z.string(), content: z.string() }),
    }).server(async (input) => {
      await flushText()
      await sandbox!.files.write(input.path, input.content)
      await log(taskId, runId, 'tool_call', {
        command: `write ${input.path} (${input.content.length} bytes)`,
      })
      return { ok: true }
    })

    const readFile = toolDefinition({
      name: 'read_file',
      description: 'Read a file from the sandbox VM.',
      inputSchema: z.object({ path: z.string() }),
    }).server(async (input) => {
      await flushText()
      const content = await sandbox!.files.read(input.path)
      const trimmed = content.length > 4000 ? content.slice(0, 4000) + '\n…(truncated)' : content
      await log(taskId, runId, 'tool_call', { command: `read ${input.path}`, output: trimmed })
      return { content: trimmed }
    })

    const { adapter } = await makeAdapter()
    const stream = chat({
      adapter: adapter as never,
      messages: [
        {
          role: 'user',
          content: `Task: ${title}\n\n${description || '(no further description)'}\n\nComplete this task inside the sandbox now. Verify your work, then finish with a short plain-text summary starting with "SUMMARY:" describing what you did and where any outputs live.`,
        },
      ] as never,
      systemPrompts: [
        'You are the Dispatch task-execution agent. You work inside a fresh, disposable Railway sandbox VM using the tools provided. Be direct and efficient: do the work, verify it ran, and stop. Never ask questions — decide and act.',
      ],
      tools: [runCommand, writeFile, readFile] as never,
      agentLoopStrategy: maxIterations(25),
      abortController: abort,
    } as never)

    let fullText = ''
    let streamError: string | null = null
    for await (const chunk of stream as AsyncIterable<Record<string, unknown>>) {
      const c = chunk as { type?: string; delta?: unknown; error?: unknown }
      if (c.type === 'TEXT_MESSAGE_CONTENT' && typeof c.delta === 'string') {
        pendingText += c.delta
        fullText += c.delta
      } else if (c.type === 'TEXT_MESSAGE_END') {
        // Each assistant message lands in the feed as soon as it completes,
        // instead of waiting for the next tool call or the end of the run.
        await flushText()
      } else if (c.type === 'RUN_ERROR' || c.type === 'ERROR') {
        streamError = JSON.stringify(c.error ?? c).slice(0, 400)
      }
    }
    await flushText()
    if (streamError && !fullText) throw new Error(`model stream error: ${streamError}`)

    const summaryMatch = fullText.match(/SUMMARY:\s*([\s\S]{0,600})/)
    const summary = (summaryMatch?.[1] ?? fullText.slice(-400) ?? 'Run completed.').trim()

    await db
      .update(runs)
      .set({ status: 'succeeded', summary, finishedAt: new Date() })
      .where(eq(runs.id, runId))
    await db.update(tasks).set({ status: 'in_review', updatedAt: new Date() }).where(eq(tasks.id, taskId))
    await log(taskId, runId, 'run_finished', { summary })
    await log(taskId, runId, 'status_change', { from: 'in_progress', to: 'in_review' })
    {
      const { emitWebhook } = await import('@/lib/ops.server')
      void emitWebhook('run.finished', { taskId, runId, summary })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .update(runs)
      .set({ status: abort.signal.aborted ? 'cancelled' : 'failed', summary: message, finishedAt: new Date() })
      .where(eq(runs.id, runId))
    await db.update(tasks).set({ status: 'todo', updatedAt: new Date() }).where(eq(tasks.id, taskId))
    await log(taskId, runId, 'run_error', { error: message })
    {
      const { emitWebhook } = await import('@/lib/ops.server')
      void emitWebhook('run.failed', { taskId, runId, error: message })
    }
  } finally {
    activeRuns.delete(runId)
    if (sandbox) {
      try {
        await sandbox.destroy()
      } catch {
        // best effort — idleTimeout reaps it anyway
      }
    }
  }
}
