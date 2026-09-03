import { createFileRoute, redirect } from '@tanstack/react-router'
import { projectsQuery } from '@/lib/tracker'

export const Route = createFileRoute('/app/')({
  loader: async ({ context }) => {
    const projects = await context.queryClient.ensureQueryData(projectsQuery)
    if (projects[0]) {
      throw redirect({ to: '/app/$projectId', params: { projectId: projects[0].id } })
    }
  },
  component: () => (
    <div className="empty" style={{ padding: 28 }}>
      No projects yet — create one from the sidebar.
    </div>
  ),
})
