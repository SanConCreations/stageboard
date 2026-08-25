import { useBoard } from '../store'
import { useRole } from '../sync'
import { formatClock, formatNightDate } from '../time'
import { useNow } from '../hooks/useNow'

export function Header({
  onOpenSettings,
  onClockIn,
}: {
  onOpenSettings: () => void
  onClockIn: () => void
}) {
  const now = useNow(1000)
  const { clubName, clockedIn, sampleRosterPresent, nightStartedAt } = useBoard()
  const { manager, status } = useRole()
  const title = clubName || 'Stageboard'
  const here = clockedIn.length
  const linkLabel = manager
    ? status === 'live'
      ? 'Linked'
      : status === 'error'
        ? 'Link failed'
        : 'Linking…'
    : status === 'live'
      ? 'Manager on'
      : status === 'error'
        ? 'Link failed'
        : 'Booth open'

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          ◆
        </span>
        <div className="brand-text">
          <div className="brand-name">{title}</div>
          <div className="brand-sub">
            {manager ? 'Manager' : clubName ? 'DJ booth' : 'DJ booth'}
            {' · '}
            {formatNightDate(nightStartedAt)}
          </div>
        </div>
      </div>

      <div className="topbar-center">
        <span className={`sample-pill link-pill link-pill--${status}`} title="Live link between DJ and manager tablets">
          {linkLabel}
        </span>
        {!manager && sampleRosterPresent && (
          <span className="sample-pill" title="Seeded demo names, not real staff">
            Sample roster
          </span>
        )}
      </div>

      <div className="topbar-right">
        <time className="live-clock" dateTime={new Date(now).toISOString()}>
          {formatClock(now)}
        </time>
        <button className="here-badge" onClick={onClockIn} title="Clock in / manage tonight">
          <span className="here-count">{here}</span>
          <span className="here-label">HERE</span>
        </button>
        {!manager && (
        <button className="icon-btn gear" onClick={onOpenSettings} aria-label="Settings">
          ⚙
        </button>
        )}
      </div>
    </header>
  )
}
