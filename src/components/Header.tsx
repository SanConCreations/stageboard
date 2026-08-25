import { useBoard } from '../store'
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
  const title = clubName || 'Stageboard'
  const here = clockedIn.length

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          ◆
        </span>
        <div className="brand-text">
          <div className="brand-name">{title}</div>
          <div className="brand-sub">
            {clubName ? 'Stageboard' : 'DJ booth'}
            {' · '}
            {formatNightDate(nightStartedAt)}
          </div>
        </div>
      </div>

      <div className="topbar-center">
        {sampleRosterPresent && (
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
        <button className="icon-btn gear" onClick={onOpenSettings} aria-label="Settings">
          ⚙
        </button>
      </div>
    </header>
  )
}
