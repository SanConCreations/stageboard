import { useMemo, useState } from 'react'
import { useBoard, useDispatch } from '../store'
import { Modal, NamePrompt } from './Modal'

export function ClockInSheet({ onClose }: { onClose: () => void }) {
  const { entertainers, clockedIn } = useBoard()
  const dispatch = useDispatch()
  const [prompt, setPrompt] = useState<'house' | 'guest' | null>(null)

  const here = useMemo(() => new Set(clockedIn), [clockedIn])
  const house = entertainers.filter((e) => !e.archived && !e.guest && !here.has(e.id))
  const archived = entertainers.filter((e) => e.archived)
  const onFloor = entertainers.filter((e) => here.has(e.id))

  return (
    <>
      <Modal title="Tonight's roster" onClose={onClose} wide>
        <p className="sheet-lead">
          Clock in who is working. Guests are tonight-only. Sample names are
          demo data — not real staff.
        </p>

        {house.length === 0 && onFloor.length === 0 && (
          <p className="muted">No house talent yet. Add a name below.</p>
        )}

        {house.length > 0 && (
          <section className="sheet-section">
            <h3>House list</h3>
            <ul className="pick-list">
              {house.map((e) => (
                <li key={e.id}>
                  <button
                    className="pick-row"
                    onClick={() => dispatch({ type: 'clock-in', id: e.id })}
                  >
                    <span className="pick-name">
                      {e.name}
                      {e.sample && <em className="sample-tag">sample</em>}
                    </span>
                    <span className="pick-action">Clock in</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {onFloor.length > 0 && (
          <section className="sheet-section">
            <h3>Clocked in</h3>
            <ul className="pick-list">
              {onFloor.map((e) => (
                <li key={e.id}>
                  <div className="pick-row pick-row--static">
                    <span className="pick-name">
                      {e.name}
                      {e.guest && <em className="guest-tag">guest</em>}
                      {e.sample && <em className="sample-tag">sample</em>}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => dispatch({ type: 'clock-out', id: e.id })}
                    >
                      Clock out
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {archived.length > 0 && (
          <section className="sheet-section">
            <h3>Archived</h3>
            <ul className="pick-list">
              {archived.map((e) => (
                <li key={e.id}>
                  <div className="pick-row pick-row--static">
                    <span className="pick-name muted">{e.name}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => dispatch({ type: 'unarchive', id: e.id })}
                    >
                      Restore
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="btn-row sheet-actions">
          <button className="btn btn-ghost" onClick={() => setPrompt('house')}>
            + House name
          </button>
          <button className="btn btn-gold" onClick={() => setPrompt('guest')}>
            + Guest tonight
          </button>
        </div>
      </Modal>

      {prompt === 'house' && (
        <NamePrompt
          title="Add house talent"
          label="Stage name"
          submitLabel="Add & clock in"
          onClose={() => setPrompt(null)}
          onSubmit={(name) => dispatch({ type: 'add-house', name, clockIn: true })}
        />
      )}
      {prompt === 'guest' && (
        <NamePrompt
          title="Guest / fill-in"
          label="Stage name (tonight only)"
          submitLabel="Clock in guest"
          onClose={() => setPrompt(null)}
          onSubmit={(name) => dispatch({ type: 'add-guest', name })}
        />
      )}
    </>
  )
}

export function EmptyNight({ onClockIn }: { onClockIn: () => void }) {
  return (
    <div className="empty-night">
      <div className="empty-kicker">Tonight</div>
      <h2>Nobody clocked in yet</h2>
      <p>
        Pick from the house list or add a guest fill-in to start the night.
        The board stays up past midnight until you reset it.
      </p>
      <button className="btn btn-gold btn-lg" onClick={onClockIn}>
        Start the night
      </button>
    </div>
  )
}
