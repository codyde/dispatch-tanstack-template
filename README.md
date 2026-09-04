# Deploy and Host Dispatch with Railway

Dispatch is a work tracker built on TanStack Start, TanStack AI, and Postgres. Every task has a run button: press it and a Railway sandbox boots, an AI agent works the task inside a real VM, and the output streams back into the task's activity feed. This template deploys the app and its database in one click.

## About Hosting Dispatch

Dispatch runs as two Railway services: a TanStack Start app and a Postgres database, connected over private networking. Railpack builds the app straight from this repo with no Dockerfile. On boot, the app pushes its Drizzle schema, seeds a Default project with five runnable starter tasks, and serves the UI and REST API from one process. Sandboxes are created at runtime through the Railway SDK, so the app needs a Railway token and an Anthropic API key before agents can run — both can be added on the Settings page after deploy, or set as service variables.

## Common Use Cases

- A working starter for TanStack Start + Postgres apps on Railway
- A reference implementation for agent-executed work: LLM tool loops running in disposable sandbox VMs
- A small team task tracker where routine tasks are handed to an agent instead of a person
- A demo of Railway primitives (private networking, volumes, sandboxes, preview environments) behind one real app

## Dependencies for Dispatch Hosting

- Railway Postgres (included in the template)
- An Anthropic API key, for the task-execution agent
- A Railway API token, for creating sandbox VMs at runtime

### Deployment Dependencies

- [TanStack Start docs](https://tanstack.com/start/latest)
- [TanStack AI docs](https://tanstack.com/ai/latest)
- [Railway sandboxes / SDK](https://docs.railway.com)
- [Anthropic API keys](https://console.anthropic.com)

### Implementation Details

Service variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes (set by template) | Postgres over private networking: `${{Postgres.DATABASE_URL}}` |
| `ANTHROPIC_API_KEY` | for runs | Model access for the task agent. Can also be saved in-app under Settings |
| `RAILWAY_API_TOKEN` | for runs | Lets the app create sandbox VMs. Can also be saved in-app under Settings |
| `DISPATCH_MODEL` | no | Model id for task runs (default `claude-sonnet-5`) |

The start script runs `drizzle-kit push`, seeds starter data if the database is empty, then serves the built app with srvx. The healthcheck endpoint is `GET /api/health` (returns 503 until the database is reachable). The REST API lives under `/api/v1` and shares its operations with the UI.

### Why Deploy Dispatch on Railway?

Railway is a singular platform for deploying the whole app: the Start server builds with zero config, Postgres provisions with a volume in one click, the two talk over private networking, and the sandboxes the agent works in are the same compute primitive as everything else. Pull request environments clone the full stack, so every branch is a working tracker.
