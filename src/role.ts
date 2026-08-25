export type AppMode = 'dj' | 'manager'

const ROOM_KEY = 'stageboard:room'

function randomRoom(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let out = ''
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return out
}

export function getMode(): AppMode {
  const q = new URLSearchParams(window.location.search)
  const raw = (q.get('mode') || q.get('view') || '').toLowerCase()
  return raw === 'manager' || raw === 'mgmt' ? 'manager' : 'dj'
}

export function getRoom(): string {
  const q = new URLSearchParams(window.location.search)
  const fromUrl = (q.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (fromUrl.length >= 4) {
    try {
      localStorage.setItem(ROOM_KEY, fromUrl)
    } catch {
      /* ignore */
    }
    return fromUrl
  }
  try {
    const saved = localStorage.getItem(ROOM_KEY)
    if (saved && saved.length >= 4) return saved
  } catch {
    /* ignore */
  }
  const fresh = randomRoom()
  try {
    localStorage.setItem(ROOM_KEY, fresh)
  } catch {
    /* ignore */
  }
  return fresh
}

export function managerUrl(room: string): string {
  const url = new URL(window.location.href)
  url.searchParams.set('mode', 'manager')
  url.searchParams.set('room', room)
  return url.toString()
}

export function peerIdForRoom(room: string): string {
  return `bxclub${room}`.toLowerCase()
}
