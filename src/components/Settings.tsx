import { useState } from 'react'
import { useBoard, useDispatch } from '../store'
import { useRole } from '../sync'
import { managerUrl } from '../role'
import { Confirm, Modal, NamePrompt } from './Modal'

export function Settings({ onClose }: { onClose: () => void }) {
  const { clubName, stages, entertainers, sampleRosterPresent, setLengthMs } = useBoard()
  const dispatch = useDispatch()
  const [prompt, setPrompt] = useState<
    | { kind: 'club' }
    | { kind: 'stage-add' }
    | { kind: 'stage-rename'; id: string; name: string }
    | { kind: 'person-rename'; id: string; name: string }
    | { kind: 'house-add' }
    | null
  >(null)
  const [confirm, setConfirm] = useState<'reset' | 'samples' | null>(null)
  const [copied, setCopied] = useState(false)
  const { room } = useRole()
  const link = typeof window !== 'undefined' ? managerUrl(room) : ''

  const house = entertainers.filter((e) => !e.guest)

  async function copyManagerLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy manager link', link)
    }
  }

  return (
    <>
      <Modal title="Settings" onClose={onClose} wide>
        <section className="sheet-section">
          <h3>Club</h3>
          <button className="pick-row" onClick={() => setPrompt({ kind: 'club' })}>
            <span className="pick-name">{clubName || 'Stageboard'}</span>
            <span className="pick-action">Rename</span>
          </button>
          <p className="hint">Shown on the board header. Leave blank to use Stageboard.</p>
        </section>

        <section className="sheet-section">
          <h3>Manager tablet</h3>
          <p className="hint">
            Same live board on a second tablet. They can add a girl or put her
            on dance/break. They cannot run stages or the rotation. Keep this
            DJ board open.
          </p>
          <p className="hint">Room {room}</p>
          <button className="btn btn-gold" onClick={copyManagerLink}>
            {copied ? 'Copied' : 'Copy manager link'}
          </button>
        </section>


        <section className="sheet-section">
          <h3>Set length</h3>
          <p className="hint">
            How long a girl stays on one stage. When it hits zero she moves up
            (Stage 3 → Stage 2 → Main). After Main she goes to the bottom of
            Who&apos;s Next. Last stage is where they start; first stage is
            Main.
          </p>
          <div className="set-length-row">
            {[2, 3, 4, 5, 6].map((m) => (
              <button
                key={m}
                className={`btn btn-sm ${setLengthMs === m * 60 * 1000 ? 'btn-gold' : 'btn-ghost'}`}
                onClick={() => dispatch({ type: 'set-set-length', ms: m * 60 * 1000 })}
              >
                {m} min
              </button>
            ))}
          </div>
        </section>

        <section className="sheet-section">
          <h3>Stages</h3>
          <ul className="pick-list">
            {stages.map((s) => (
              <li key={s.id}>
                <div className="pick-row pick-row--static">
                  <button
                    className="linkish"
                    onClick={() =>
                      setPrompt({ kind: 'stage-rename', id: s.id, name: s.name })
                    }
                  >
                    {s.name}
                    {s.autoRotate && <em className="queue-tag">auto</em>}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={stages.length <= 1}
                    onClick={() => dispatch({ type: 'remove-stage', id: s.id })}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={() => setPrompt({ kind: 'stage-add' })}>
            + Add stage
          </button>
        </section>

        <section className="sheet-section">
          <h3>House roster</h3>
          <p className="hint">
            Persistent talent. Archive hides them from clock-in. Guests are not listed
            here.
          </p>
          <ul className="pick-list">
            {house.map((e) => (
              <li key={e.id}>
                <div className="pick-row pick-row--static">
                  <span className="pick-name">
                    {e.name}
                    {e.sample && <em className="sample-tag">sample</em>}
                    {e.archived && <em className="muted">archived</em>}
                  </span>
                  <div className="row-btns">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setPrompt({ kind: 'person-rename', id: e.id, name: e.name })
                      }
                    >
                      Rename
                    </button>
                    {e.archived ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => dispatch({ type: 'unarchive', id: e.id })}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => dispatch({ type: 'archive', id: e.id })}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={() => setPrompt({ kind: 'house-add' })}>
            + Add house name
          </button>
        </section>

        <section className="sheet-section">
          <h3>Night</h3>
          <p className="hint">
            Reset clocks everyone out and clears stages and the rotation. House
            roster stays. Nights do not roll over at midnight.
          </p>
          <button className="btn btn-danger" onClick={() => setConfirm('reset')}>
            Reset tonight
          </button>
        </section>

        {sampleRosterPresent && (
          <section className="sheet-section">
            <h3>Sample roster</h3>
            <p className="hint">
              Jade, Raven, Skye, Nova, Diamond, and Lola are fake demo names so you
              can tap around immediately. They are not staff.
            </p>
            <button className="btn btn-ghost" onClick={() => setConfirm('samples')}>
              Clear sample roster
            </button>
          </section>
        )}
      </Modal>

      {prompt?.kind === 'club' && (
        <NamePrompt
          title="Club name"
          label="Name on the board"
          initial={clubName}
          submitLabel="Save"
          onClose={() => setPrompt(null)}
          onSubmit={(name) => dispatch({ type: 'set-club-name', name })}
        />
      )}
      {prompt?.kind === 'stage-add' && (
        <NamePrompt
          title="Add stage"
          label="Stage name"
          submitLabel="Add"
          onClose={() => setPrompt(null)}
          onSubmit={(name) => dispatch({ type: 'add-stage', name })}
        />
      )}
      {prompt?.kind === 'stage-rename' && (
        <NamePrompt
          title="Rename stage"
          label="Stage name"
          initial={prompt.name}
          submitLabel="Save"
          onClose={() => setPrompt(null)}
          onSubmit={(name) =>
            dispatch({ type: 'rename-stage', id: prompt.id, name })
          }
        />
      )}
      {prompt?.kind === 'person-rename' && (
        <NamePrompt
          title="Rename"
          label="Stage name"
          initial={prompt.name}
          submitLabel="Save"
          onClose={() => setPrompt(null)}
          onSubmit={(name) => dispatch({ type: 'rename', id: prompt.id, name })}
        />
      )}
      {prompt?.kind === 'house-add' && (
        <NamePrompt
          title="Add house talent"
          label="Stage name"
          submitLabel="Add"
          onClose={() => setPrompt(null)}
          onSubmit={(name) => dispatch({ type: 'add-house', name, clockIn: false })}
        />
      )}

      {confirm === 'reset' && (
        <Confirm
          title="Reset tonight?"
          body="Everyone clocks out. Stages go open, rotation clears. House roster is kept. Guests are dropped."
          confirmLabel="Reset tonight"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            dispatch({ type: 'reset-tonight' })
            setConfirm(null)
            onClose()
          }}
        />
      )}
      {confirm === 'samples' && (
        <Confirm
          title="Clear sample roster?"
          body="Removes the fake demo names (Jade, Raven, Skye, Nova, Diamond, Lola). Your real roster is untouched."
          confirmLabel="Clear samples"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            dispatch({ type: 'clear-sample-roster' })
            setConfirm(null)
          }}
        />
      )}
    </>
  )
}
