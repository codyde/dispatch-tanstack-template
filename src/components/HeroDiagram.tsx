// Infrastructure diagram of what this template deploys on Railway.
// Swappable with the interactive preview via /?hero=preview.
export function HeroDiagram() {
  return (
    <div className="diag" aria-label="Diagram of the Railway infrastructure this template deploys">
      <div className="diag-edge">
        <span className="diag-globe" aria-hidden>
          ◉
        </span>
        <span className="mono">your-app.up.railway.app</span>
        <span className="diag-edge-note">public edge · TLS</span>
      </div>
      <div className="diag-wire" aria-hidden />
      <div className="diag-project">
        <div className="diag-project-head">
          <img src="/brand/railway-light.svg" alt="Railway" className="logo-light" />
          <img src="/brand/railway-dark.svg" alt="Railway" className="logo-dark" />
          <span>Railway project</span>
        </div>
        <div className="diag-services">
          <div className="diag-node diag-app">
            <span className="diag-node-name">dispatch</span>
            <span className="diag-node-desc">TanStack Start · SSR + API</span>
            <span className="diag-node-tag">Railpack build</span>
          </div>
          <div className="diag-privnet" aria-hidden>
            <span className="diag-privnet-line" />
            <span className="diag-privnet-label mono">postgres.railway.internal</span>
            <span className="diag-privnet-line" />
          </div>
          <div className="diag-node diag-db">
            <span className="diag-node-name">Postgres</span>
            <span className="diag-node-desc">projects · tasks · runs</span>
            <span className="diag-node-tag">volume attached</span>
          </div>
        </div>
        <div className="diag-sandbox-row">
          <span className="diag-spawn mono">Sandbox.create() →</span>
          <div className="diag-sbx">
            <span className="diag-node-name">sandbox VM</span>
            <span className="diag-node-desc">agent runs your task</span>
          </div>
          <div className="diag-sbx ghost" aria-hidden />
          <div className="diag-sbx ghost two" aria-hidden />
          <span className="diag-eph mono">ephemeral</span>
        </div>
      </div>
    </div>
  )
}
