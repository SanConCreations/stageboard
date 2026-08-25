import { useState } from 'react'
import { useBoard, useDispatch, useName } from '../store'
import { formatRemaining } from '../time'
import { useNow } from '../hooks/useNow'
import { Modal } from './Modal'
import type { EntertainerId, Occupancy, Stage } from '../types'

export function Stages({ onNeedPeople, readOnly }: { onNeedPeople: () => void; readOnly?: boolean }) {
  const { stages, occupancy, queue, entertainers, setLengthMs } = useBoard()
  const live = stages.filter((s) => s.enabled !== false)
  const preview = queue.slice(0, 3).map((id) => {
    const p = entertainers.find((e) => e.id === id)
    return p?.name ?? '—'
  })
  const setLabel = formatRemaining(setLengthMs)
  const path = [...live].reverse().map((s) => s.name).join('  →  ')

  return (
    <section className="zone zone-stages">
      <header className="zone-head">
        <h1>Stages</h1>
        <div className="up-next-preview" title="Ladder and rotation">
          <span className="up-next-label">Sets {setLabel}</span>
          {preview.length === 0 ? (
            <span className="up-next-empty">{path}</span>
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
            readOnly={readOnly}
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
  readOnly,
}: {
  stage: Stage
  occupancy: Occupancy | null
  nextId?: EntertainerId
  onNeedPeople: () => void
  readOnly?: boolean
}) {
  const tick = useNow()
  const dispatch = useDispatch()
  const { statuses, clockedIn, entertainers, queue, stages, occupancy: allOcc, setLengthMs } =
    useBoard()
  const performer = useName(occupancy?.entertainerId ?? '')
  const nextName = useName(nextId ?? '')
  const [picker, setPicker] = useState<'send' | 'swap' | null>(null)

  const live = stages.filter((s) => s.enabled !== false)
  const liveIndex = live.findIndex((s) => s.id === stage.id)
  const enabled = stage.enabled !== false
  const isFeature = enabled && liveIndex === 0
  const isEntry = enabled && liveIndex === live.length - 1
  const above = liveIndex > 0 ? live[liveIndex - 1] : null
  const aboveBusy = !!(above && allOcc[above.id])
  const paused = occupancy?.pausedAt != null
  const elapsed = occupancy
    ? (occupancy.pausedAt ?? tick) - occupancy.since
    : 0
  const remaining = occupancy ? setLengthMs - elapsed : 0
  const expired = occupancy ? remaining <= 0 : false
  const waiting = !!(occupancy && aboveBusy && !paused)

  const available = clockedIn
    .filter((id) => statuses[id]?.kind === 'available')
    .map((id) => entertainers.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)

  const hasNext = !!nextId

  function openSend() {
    if (available.length === 0) onNeedPeople()
    else setPicker('send')
  }

  const moveLabel = isFeature
    ? 'End set'
    : above
      ? `To ${above.name}`
      : 'Move up'

  return (
    <article
      className={`stage-card ${
        !enabled ? 'is-off' : occupancy ? 'is-live' : 'is-open'
      }`}
    >
      <header className="stage-card-head">
        <h2>{stage.name}</h2>
        <div className="stage-card-head-right">
          {enabled && (
            <span className="stage-role">
              {isEntry ? 'Start' : isFeature ? 'Feature' : 'Next up'}
            </span>
          )}
          {!readOnly && (
            <button
              className={`stage-toggle ${enabled ? 'is-on' : 'is-off'}`}
              disabled={enabled && live.length <= 1}
              onClick={() => dispatch({ type: 'toggle-stage', id: stage.id })}
            >
              {enabled ? 'On' : 'Off'}
            </button>
          )}
        </div>
      </header>

      {!enabled ? (
        <div className="stage-status">
          <div className="open-stamp open-stamp--off">OFF</div>
        </div>
      ) : occupancy ? (
        <div className="stage-status">
          <div className="stage-name">{performer}</div>
          <div className="stage-timer-row">
            <div className={`stage-timer ${expired || waiting || paused ? 'is-up' : ''}`}>
              {waiting ? 'WAIT' : formatRemaining(remaining)}
            </div>
            {!readOnly && (
              <button
                className={`btn btn-sm ${paused ? 'btn-gold' : 'btn-ghost'}`}
                onClick={() => dispatch({ type: 'toggle-pause', stageId: stage.id })}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
            )}
          </div>
          {paused && <div className="pause-tag">Paused</div>}
        </div>
      ) : (
        <div className="stage-status">
          <div className="open-stamp">OPEN</div>
        </div>
      )}

      {!readOnly && enabled && <footer className="stage-actions">
        {occupancy ? (
          <>
            <button
              className="btn btn-gold"
              disabled={waiting}
              onClick={() => dispatch({ type: 'end-set', stageId: stage.id })}
            >
              {waiting && above ? `Wait · ${above.name}` : moveLabel}
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
              {isEntry ? 'Send up' : 'Send up'}
            </button>
            {isEntry ? (
              <button
                className="btn btn-ghost"
                disabled={!hasNext}
                onClick={() => dispatch({ type: 'send-next' })}
              >
                {hasNext ? `Next · ${nextName}` : 'Send next'}
              </button>
            ) : (
              <button
                className="btn btn-ghost"
                disabled={!hasNext || !!(allOcc[live[live.length - 1]?.id])}
                onClick={() => dispatch({ type: 'send-next' })}
              >
                {hasNext ? `Onto start` : 'Send next'}
              </button>
            )}
          </>
        )}
      </footer>}

      {!readOnly && picker && (
        <Modal
          title={picker === 'swap' ? `Swap on ${stage.name}` : `Send up · ${stage.name}`}
          onClose={() => setPicker(null)}
        >
          {hasNext && picker === 'send' && nextId && isEntry && (
            <button
              className="pick-row pick-row--accent"
              onClick={() => {
                dispatch({ type: 'send-next' })
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
    </article>
  )
}
