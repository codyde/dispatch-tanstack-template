import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/tasks/$taskId/run')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const { startRun } = await import('@/lib/run-task.server')
        try {
          const { runId } = await startRun(params.taskId)
          return Response.json({ runId }, { status: 202 })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          return new Response(message, { status: 400 })
        }
      },
    },
  },
})
