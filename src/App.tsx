import { useState } from 'react'
import { Header } from './components/Header'
import { Stages } from './components/Stages'
import { Queue } from './components/Queue'
import { Floor } from './components/Floor'
import { ClockInSheet, EmptyNight } from './components/ClockIn'
import { Settings } from './components/Settings'
import { useBoard } from './store'

export default function App() {
  const { clockedIn } = useBoard()
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
        <Stages onNeedPeople={() => setClockInOpen(true)} />
        {empty ? (
          <section className="zone zone-empty-wrap">
            <EmptyNight onClockIn={() => setClockInOpen(true)} />
          </section>
        ) : (
          <>
            <Queue />
            <Floor />
          </>
        )}
      </main>
      {clockInOpen && <ClockInSheet onClose={() => setClockInOpen(false)} />}
      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
