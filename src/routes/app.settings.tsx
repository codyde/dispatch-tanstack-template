import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { saveSettings, settingsQuery } from '@/lib/tracker'
import { SETTING_KEYS, type SettingKey } from '@/lib/topics'

export const Route = createFileRoute('/app/settings')({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
})

function SettingsPage() {
  const { data: settings } = useSuspenseQuery(settingsQuery)
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Partial<Record<SettingKey, string>>>({})
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => saveSettings({ data: values }),
    onSuccess: () => {
      setValues({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const dirty = Object.values(values).some((v) => v !== undefined)

  return (
    <div className="task-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-lede">
        Keys are stored in this workspace's Postgres and used server-side only — they never reach
        the browser. Save an empty field to clear a stored key.
      </p>
      <div className="settings-list">
        {SETTING_KEYS.map((s) => {
          const state = settings.find((x) => x.key === s.id)
          return (
            <div className="setting-row" key={s.id}>
              <div className="setting-info">
                <label htmlFor={s.id}>{s.label}</label>
                <span className="setting-hint">{s.hint}</span>
              </div>
              <div className="setting-input">
                <input
                  id={s.id}
                  type="password"
                  autoComplete="off"
                  placeholder={state?.set ? `configured (…${state.last4})` : 'not set'}
                  value={values[s.id] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [s.id]: e.target.value }))}
                />
                {state?.set && values[s.id] === undefined && <span className="setting-badge">set</span>}
              </div>
            </div>
          )
        })}
      </div>
      <div className="settings-actions">
        <button
          className="btn primary"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="saved-note">Saved.</span>}
      </div>
    </div>
  )
}
