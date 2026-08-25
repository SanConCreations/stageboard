import { useState } from 'react'
import { useBoard, useDispatch } from '../store'
import { Modal } from './Modal'

export function Queue({ readOnly }: { readOnly?: boolean }) {
  const { queue, entertainers, clockedIn, statuses } = useBoard()
  const dispatch = useDispatch()
  const [adding, setAdding] = useState(false)

  const people = queue
    .map((id) => entertainers.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)

  const addable = clockedIn
    .filter((id) => statuses[id]?.kind === 'available' && !queue.includes(id))
    .map((id) => entertainers.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)

  return (
    <section className="zone zone-queue">
      <header className="zone-head">
        <h1>Who's next</h1>
        <span className="zone-count">{people.length}</span>
      </header>

      {people.length === 0 ? (
        <p className="zone-empty">
          Rotation is empty. Add available talent — next girl always walks on Stage 3.
        </p>
      ) : (
        <ol className="queue-list">
          {people.map((e, i) => (
            <li key={e.id} className={i === 0 ? 'is-first' : ''}>
              <span className="q-pos">{i + 1}</span>
              <span className="q-name">
                {e.name}
                {e.guest && <em className="guest-tag">guest</em>}
              </span>
              {!readOnly && <div className="q-actions">
                <button
                  className="icon-btn"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => dispatch({ type: 'queue-move', id: e.id, dir: -1 })}
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  aria-label="Move down"
                  disabled={i === people.length - 1}
                  onClick={() => dispatch({ type: 'queue-move', id: e.id, dir: 1 })}
                >
                  ↓
                </button>
                <button
                  className="icon-btn"
                  aria-label="Skip to end"
                  disabled={people.length < 2}
                  onClick={() => dispatch({ type: 'queue-skip', id: e.id })}
                >
                  ↷
                </button>
                <button
                  className="icon-btn"
                  aria-label="Remove from rotation"
                  onClick={() => dispatch({ type: 'queue-remove', id: e.id })}
                >
                  ×
                </button>
              </div>}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && (
      <button
        className="btn btn-ghost btn-block"
        onClick={() => setAdding(true)}
        disabled={addable.length === 0}
      >
        {addable.length === 0 ? 'No one available to add' : '+ Add to rotation'}
      </button>
      )}

      {adding && !readOnly && (
        <Modal title="Add to rotation" onClose={() => setAdding(false)}>
          <ul className="pick-list">
            {addable.map((e) => (
              <li key={e.id}>
                <button
                  className="pick-row"
                  onClick={() => {
                    dispatch({ type: 'queue-add', id: e.id })
                    setAdding(false)
                  }}
                >
                  <span className="pick-name">{e.name}</span>
                  <span className="pick-action">On deck</span>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </section>
  )
}
