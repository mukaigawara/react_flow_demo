import { useEffect, useState } from 'react'
import FlowChart from './FlowChart'
import SwimLane from './SwimLane'

type Page = 'flow' | 'swimlane'

function pageFromHash(): Page {
  return window.location.hash === '#/swimlane' ? 'swimlane' : 'flow'
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash)

  useEffect(() => {
    const sync = () => setPage(pageFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  return (
    <div className="app">
      <nav className="app-nav">
        <p className="app-nav__brand">
          <span className="app-nav__logo" aria-hidden />
          React Flow サンプル
        </p>
        <div className="app-nav__links">
          <a
            href="#/"
            className={page === 'flow' ? 'is-active' : undefined}
            aria-current={page === 'flow' ? 'page' : undefined}
          >
            フローチャート
          </a>
          <a
            href="#/swimlane"
            className={page === 'swimlane' ? 'is-active' : undefined}
            aria-current={page === 'swimlane' ? 'page' : undefined}
          >
            スイムレーン
          </a>
        </div>
      </nav>
      <main className="app-canvas">
        {page === 'swimlane' ? <SwimLane /> : <FlowChart />}
      </main>
    </div>
  )
}
