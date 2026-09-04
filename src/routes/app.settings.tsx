import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import { saveSettings, settingsQuery, wipeAllData } from '@/lib/tracker'
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

      <DangerZone />
    </div>
  )
}

const WIPE_PHRASE = 'delete all data'

function DangerZone() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [wiped, setWiped] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const wipe = useMutation({
    mutationFn: () => wipeAllData({ data: { confirmation: WIPE_PHRASE } }),
    onSuccess: () => {
      setOpen(false)
      setPhrase('')
      setWiped(true)
      queryClient.invalidateQueries()
    },
  })

  return (
    <div className="danger-zone">
      <h2>Danger zone</h2>
      <div className="danger-row">
        <div>
          <strong>Delete all data</strong>
          <p>
            Permanently removes every project, task, run, activity, and webhook destination, then
            restores the Default starter project. API keys in Settings are kept.
          </p>
        </div>
        <button className="btn danger" onClick={() => { setPhrase(''); setOpen(true) }}>
          Delete All Data
        </button>
      </div>
      {wiped && <span className="saved-note">All data deleted.</span>}
      {open &&
        createPortal(
          <div className="dlg-overlay" onClick={() => setOpen(false)}>
            <div
              className="dlg"
              role="alertdialog"
              aria-modal="true"
              aria-label="Delete all data"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Delete all data?</h3>
              <p>
                This wipes every project, task, run, activity, and webhook, then restores the
                Default starter project. There is no undo. Type{' '}
                <code className="mono">{WIPE_PHRASE}</code> to confirm.
              </p>
              <input
                autoFocus
                type="text"
                className="wipe-input mono"
                placeholder={WIPE_PHRASE}
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
              />
              <div className="dlg-actions">
                <button className="btn" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn danger-solid"
                  disabled={phrase.trim() !== WIPE_PHRASE || wipe.isPending}
                  onClick={() => wipe.mutate()}
                >
                  {wipe.isPending ? 'Deleting…' : 'Delete everything'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
