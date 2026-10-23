import { ElisaMark } from '@/components/ElisaMark'
import { MODES } from '@/data/modes'
import type { ViewMode } from '@/types/universe'

interface HeaderProps {
  mode: ViewMode
  motion: boolean
  sidebarOpen: boolean
  onModeChange: (mode: ViewMode) => void
  onToggleMotion: () => void
  onToggleSidebar: () => void
  onResetView: () => void
}

export function Header({
  mode,
  motion,
  sidebarOpen,
  onModeChange,
  onToggleMotion,
  onToggleSidebar,
  onResetView,
}: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <ElisaMark size={28} className="brand-mark" />
        <div className="brand-copy">
          <p className="eyebrow">Elisa · laboratório independente</p>
          <h1>Universo pessoal</h1>
        </div>
      </div>

      <nav className="mode-switch" aria-label="Modo de visualização">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mode-tab ${mode === item.id ? 'is-active' : ''}`}
            aria-pressed={mode === item.id}
            onClick={() => onModeChange(item.id)}
          >
            <span className="mode-tab__letter">{item.letter}</span>
            <span className="mode-tab__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <button
          type="button"
          className="button button--ghost button--explore"
          aria-controls="explorer-panel"
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          Explorar
        </button>
        <button
          type="button"
          className="button button--ghost"
          aria-pressed={motion}
          onClick={onToggleMotion}
        >
          <span className={`motion-dot ${motion ? 'is-on' : ''}`} aria-hidden="true" />
          Movimento
        </button>
        <button
          type="button"
          className="button button--primary"
          aria-label="Retornar à visão geral"
          onClick={onResetView}
        >
          <span className="button-label-long">Visão geral</span>
          <span className="button-label-short" aria-hidden="true">
            Centro
          </span>
        </button>
      </div>
    </header>
  )
}
