import { useState } from 'react'
import { useBoard, useDispatch, useName } from '../store'
import { formatRemaining } from '../time'
import { useNow } from '../hooks/useNow'
import { Modal } from './Modal'
import type { EntertainerId, Occupancy, Stage } from '../types'

export function Stages({ onNeedPeople }: { onNeedPeople: () => void }) {
  const { stages, occupancy, queue, entertainers, setLengthMs } = useBoard()
  const preview = queue.slice(0, 3).map((id) => {
    const p = entertainers.find((e) => e.id === id)
    return p?.name ?? '—'
  })
  const setLabel = formatRemaining(setLengthMs)
  const path = [...stages].reverse().map((s) => s.name).join('  →  ')

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
        {stages.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={i}
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
  index,
  occupancy,
  nextId,
  onNeedPeople,
}: {
  stage: Stage
  index: number
  occupancy: Occupancy | null
  nextId?: EntertainerId
  onNeedPeople: () => void
}) {
  const tick = useNow()
  const dispatch = useDispatch()
  const { statuses, clockedIn, entertainers, queue, stages, occupancy: allOcc, setLengthMs } =
    useBoard()
  const performer = useName(occupancy?.entertainerId ?? '')
  const nextName = useName(nextId ?? '')
  const [picker, setPicker] = useState<'send' | 'swap' | null>(null)

  const isFeature = index === 0
  const isEntry = index === stages.length - 1
  const above = index > 0 ? stages[index - 1] : null
  const aboveBusy = !!(above && allOcc[above.id])
  const remaining = occupancy ? setLengthMs - (tick - occupancy.since) : 0
  const expired = occupancy ? remaining <= 0 : false
  const waiting = !!(occupancy && aboveBusy)

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
    <article className={`stage-card ${occupancy ? 'is-live' : 'is-open'}`}>
      <header className="stage-card-head">
        <h2>{stage.name}</h2>
        <span className="stage-role">
          {isEntry ? 'Start' : isFeature ? 'Feature' : 'Next up'}
        </span>
      </header>

      {occupancy ? (
        <div className="stage-status">
          <div className="stage-name">{performer}</div>
          <div className={`stage-timer ${expired || waiting ? 'is-up' : ''}`}>
            {waiting ? 'WAIT' : formatRemaining(remaining)}
          </div>
        </div>
      ) : (
        <div className="stage-status">
          <div className="open-stamp">OPEN</div>
        </div>
      )}

      <footer className="stage-actions">
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
                disabled={!hasNext || !!(allOcc[stages[stages.length - 1].id])}
                onClick={() => dispatch({ type: 'send-next' })}
              >
                {hasNext ? `Onto start` : 'Send next'}
              </button>
            )}
          </>
        )}
      </footer>

      {picker && (
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
