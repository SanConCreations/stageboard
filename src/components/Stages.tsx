import { useState } from 'react'
import { useBoard, useDispatch, useName } from '../store'
import { formatElapsed } from '../time'
import { useNow } from '../hooks/useNow'
import { Modal } from './Modal'
import type { EntertainerId, Occupancy, Stage } from '../types'

export function Stages({ onNeedPeople }: { onNeedPeople: () => void }) {
  const { stages, occupancy, queue, entertainers } = useBoard()
  const preview = queue.slice(0, 3).map((id) => {
    const p = entertainers.find((e) => e.id === id)
    return p?.name ?? '—'
  })

  return (
    <section className="zone zone-stages">
      <header className="zone-head">
        <h1>Stages</h1>
        <div className="up-next-preview" title="Who's next">
          <span className="up-next-label">Up next</span>
          {preview.length === 0 ? (
            <span className="up-next-empty">Queue empty</span>
          ) : (
            <span className="up-next-names">{preview.join('  ·  ')}</span>
          )}
        </div>
      </header>
      <div className={`stage-grid stage-grid--${Math.min(stages.length, 4)}`}>
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            occupancy={occupancy[stage.id] ?? null}
            nextId={queue[0]}
            onNeedPeople={onNeedPeople}
          />
        ))}
      </div>
    </section>
  )
}

function StageCard({
  stage,
  occupancy,
  nextId,
  onNeedPeople,
}: {
  stage: Stage
  occupancy: Occupancy | null
  nextId?: EntertainerId
  onNeedPeople: () => void
}) {
  const tick = useNow()
  const dispatch = useDispatch()
  const { statuses, clockedIn, entertainers, queue } = useBoard()
  const performer = useName(occupancy?.entertainerId ?? '')
  const nextName = useName(nextId ?? '')
  const [picker, setPicker] = useState<'send' | 'swap' | null>(null)
  const [endPrompt, setEndPrompt] = useState(false)

  const available = clockedIn
    .filter((id) => statuses[id]?.kind === 'available')
    .map((id) => entertainers.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)

  const hasNext = !!nextId

  function openSend() {
    if (available.length === 0) onNeedPeople()
    else setPicker('send')
  }

  function requestEnd() {
    if (stage.autoRotate && hasNext) {
      dispatch({ type: 'end-set', stageId: stage.id, sendNext: true })
      return
    }
    if (hasNext) {
      setEndPrompt(true)
      return
    }
    dispatch({ type: 'end-set', stageId: stage.id, sendNext: false })
  }

  return (
    <article className={`stage-card ${occupancy ? 'is-live' : 'is-open'}`}>
      <header className="stage-card-head">
        <h2>{stage.name}</h2>
        <label className="auto-rot" title="When a set ends, send the next person automatically">
          <input
            type="checkbox"
            checked={stage.autoRotate}
            onChange={() => dispatch({ type: 'toggle-auto-rotate', id: stage.id })}
          />
          Auto
        </label>
      </header>

      {occupancy ? (
        <div className="stage-status">
          <div className="stage-name">{performer}</div>
          <div className="stage-timer">{formatElapsed(tick - occupancy.since)}</div>
        </div>
      ) : (
        <div className="stage-status">
          <div className="open-stamp">OPEN</div>
        </div>
      )}

      <footer className="stage-actions">
        {occupancy ? (
          <>
            <button className="btn btn-gold" onClick={requestEnd}>
              End set
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setPicker('swap')}
              disabled={available.length === 0}
            >
              Swap
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-gold" onClick={openSend}>
              Send up
            </button>
            <button
              className="btn btn-ghost"
              disabled={!hasNext}
              onClick={() => dispatch({ type: 'send-next', stageId: stage.id })}
            >
              {hasNext ? `Next · ${nextName}` : 'Send next'}
            </button>
          </>
        )}
      </footer>

      {picker && (
        <Modal
          title={picker === 'swap' ? `Swap on ${stage.name}` : `Send up · ${stage.name}`}
          onClose={() => setPicker(null)}
        >
          {hasNext && picker === 'send' && nextId && (
            <button
              className="pick-row pick-row--accent"
              onClick={() => {
                dispatch({ type: 'send-next', stageId: stage.id })
                setPicker(null)
              }}
            >
              <span className="pick-name">Take next · {nextName}</span>
              <span className="pick-action">Send</span>
            </button>
          )}
          <ul className="pick-list">
            {available.map((e) => (
              <li key={e.id}>
                <button
                  className="pick-row"
                  onClick={() => {
                    dispatch({
                      type: picker === 'swap' ? 'swap' : 'send-up',
                      stageId: stage.id,
                      entertainerId: e.id,
                    })
                    setPicker(null)
                  }}
                >
                  <span className="pick-name">
                    {e.name}
                    {queue.includes(e.id) && <em className="queue-tag">in rotation</em>}
                  </span>
                  <span className="pick-action">{picker === 'swap' ? 'Swap' : 'Send up'}</span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {endPrompt && occupancy && (
        <Modal title={`End set · ${stage.name}`} onClose={() => setEndPrompt(false)}>
          <p className="confirm-body">
            {performer} comes down. Send {nextName} up now, or leave {stage.name} open?
          </p>
          <div className="btn-row">
            <button
              className="btn btn-ghost"
              onClick={() => {
                dispatch({ type: 'end-set', stageId: stage.id, sendNext: false })
                setEndPrompt(false)
              }}
            >
              Leave open
            </button>
            <button
              className="btn btn-gold"
              onClick={() => {
                dispatch({ type: 'end-set', stageId: stage.id, sendNext: true })
                setEndPrompt(false)
              }}
            >
              Send {nextName} up
            </button>
          </div>
        </Modal>
      )}
    </article>
  )
}
