import { useState } from 'react'
import { Header } from './components/Header'
import { Stages } from './components/Stages'
import { Queue } from './components/Queue'
import { Floor } from './components/Floor'
import { ClockInSheet, EmptyNight } from './components/ClockIn'
import { Settings } from './components/Settings'
import { useBoard } from './store'
import { useRole } from './sync'

export default function App() {
  const { clockedIn } = useBoard()
  const { manager } = useRole()
  const [clockInOpen, setClockInOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const empty = clockedIn.length === 0

  return (
    <div className="app">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onClockIn={() => setClockInOpen(true)}
      />
      <main className="board">
        <Stages readOnly={manager} onNeedPeople={() => setClockInOpen(true)} />
        {empty ? (
          <section className="zone zone-empty-wrap">
            <EmptyNight onClockIn={() => setClockInOpen(true)} />
          </section>
        ) : (
          <>
            <Queue readOnly={manager} />
            <Floor restricted={manager} onAdd={() => setClockInOpen(true)} />
          </>
        )}
      </main>
      {clockInOpen && <ClockInSheet restricted={manager} onClose={() => setClockInOpen(false)} />}
      {settingsOpen && !manager && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
