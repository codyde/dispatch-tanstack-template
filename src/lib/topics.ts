// Client-safe constants shared by the webhooks UI and the server emitters.

export const WEBHOOK_TOPICS = [
  { id: 'project.created', label: 'Project created' },
  { id: 'project.updated', label: 'Project updated' },
  { id: 'project.deleted', label: 'Project deleted' },
  { id: 'task.created', label: 'Task created' },
  { id: 'task.updated', label: 'Task updated' },
  { id: 'task.status_changed', label: 'Task status changed' },
  { id: 'task.deleted', label: 'Task deleted' },
  { id: 'run.started', label: 'Sandbox run started' },
  { id: 'run.finished', label: 'Sandbox run finished' },
  { id: 'run.failed', label: 'Sandbox run failed' },
] as const

export type WebhookTopic = (typeof WEBHOOK_TOPICS)[number]['id']

export const SETTING_KEYS = [
  { id: 'anthropic_api_key', label: 'Anthropic API key', hint: 'Powers task-execution agents. Falls back to the Railway LLM relay on agent VMs.' },
  { id: 'openai_api_key', label: 'OpenAI API key', hint: 'Stored for upcoming model support.' },
  { id: 'grok_api_key', label: 'Grok API key', hint: 'Stored for upcoming model support.' },
  { id: 'railway_api_token', label: 'Railway API token', hint: 'Used to create sandboxes when RAILWAY_API_TOKEN is not already in the environment.' },
] as const

export type SettingKey = (typeof SETTING_KEYS)[number]['id']
