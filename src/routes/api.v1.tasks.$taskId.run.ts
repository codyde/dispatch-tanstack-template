import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/v1/tasks/$taskId/run')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const { startRun } = await import('@/lib/run-task.server')
        try {
          const { runId } = await startRun(params.taskId)
          return Response.json({ runId }, { status: 202 })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const status = message.includes('not found') ? 404 : 409
          return Response.json({ error: message }, { status })
        }
      },
    },
  },
})
