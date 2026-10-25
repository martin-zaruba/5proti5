/**
 * The moderator's room on the sync server (ADR 0006, T-018): creates / joins / ends it and keeps the
 * game in sync with it. The panel stays the source of truth – the game runs here and the room gets the
 * board feed and the session. Windows on this computer keep using BroadcastChannel alongside.
 *
 * Which game wins (OQ-18): after connecting, the server sends its saved session first; the newer one
 * (by `savedAt`) wins. A device that joins by link takes over the room's game in any case.
 */

import { ref, shallowRef, watch } from 'vue'

import { createBoardPublisher } from './boardSync'
import { useGameStore } from './gameStore'
import { loadJson, saveJson } from './storage'
import { syncServerUrl } from './sync/config'
import { message, type ConnectionStatus, type CreatedRoom } from './sync/protocol'
import { createRoom, endRoom as endRoomOnServer } from './sync/roomApi'
import { createWebSocketTransport, type ClosedReason } from './sync/webSocketTransport'

const ROOM_KEY = 'room'

const CLOSED_TEXT: Record<ClosedReason, string> = {
  roomNotFound: 'Miestnosť už neexistuje – vypršala alebo ju ukončilo iné zariadenie.',
  unauthorized: 'Token moderátora nepasuje – miestnosť riadi iné zariadenie.',
  unsupportedVersion: 'Server má novšiu verziu aplikácie – obnov stránku.',
}

const room = shallowRef<CreatedRoom | null>(loadJson<CreatedRoom>(ROOM_KEY))
/** `null` = not in a room. */
const status = ref<ConnectionStatus | null>(null)
const roomError = ref<string | null>(null)
const busy = ref(false)
/** When another device of the room last changed the game (for a notice in the panel). */
const remoteChangeAt = ref<number | null>(null)

let disconnect: (() => void) | null = null

function setRoom(value: CreatedRoom | null) {
  room.value = value
  saveJson(ROOM_KEY, value)
}

function connect(target: CreatedRoom, takeOver: boolean) {
  disconnect?.()
  if (!syncServerUrl) return
  const store = useGameStore()
  const transport = createWebSocketTransport({
    serverUrl: syncServerUrl,
    roomCode: target.roomCode,
    role: 'host',
    token: target.hostToken,
  })
  const publisher = createBoardPublisher(() => store.feed.value, transport)

  /** Nothing is sent before the room's own session arrived (it comes right after `welcome`). */
  let synced = false
  // `savedAt` travels in server time, so devices with different clocks compare fairly (T-019);
  // 0 (= no game) stays 0.
  const toServer = (at: number) => (at ? at + transport.clockOffset() : 0)
  const fromServer = (at: number) => (at ? at - transport.clockOffset() : 0)
  const sendSession = () =>
    transport.send(
      message('session', { session: store.session.value, savedAt: toServer(store.savedAt.value) }),
    )

  const stopSession = transport.subscribe((m) => {
    if (m.type !== 'session') return
    const first = !synced
    const savedAt = fromServer(m.savedAt)
    const adopt = first && takeOver ? m.savedAt > 0 : savedAt > store.savedAt.value
    if (adopt) {
      store.adoptSession(m.session, savedAt)
      if (!first) remoteChangeAt.value = Date.now()
    }
    if (first) {
      synced = true
      takeOver = false
      publisher.publish(store.feed.value)
      sendSession()
    }
  })
  const stopStatus = transport.onStatus((value) => {
    status.value = value
    if (value !== 'closed') return
    roomError.value = CLOSED_TEXT[transport.closedReason!]
    if (transport.closedReason !== 'unsupportedVersion') leave()
  })
  const stopFeed = watch(store.feed, (feed) => synced && publisher.publish(feed))
  const stopGame = watch([store.session, store.savedAt], () => synced && sendSession())

  disconnect = () => {
    stopFeed()
    stopGame()
    stopSession()
    stopStatus()
    publisher.close()
    disconnect = null
    status.value = null
  }
}

/** Forgets the room on this device; the others keep playing in it. */
function leave() {
  disconnect?.()
  setRoom(null)
  remoteChangeAt.value = null
}

let started = false

export function useHostRoom() {
  if (!started) {
    started = true
    if (room.value) connect(room.value, false)
  }
  return {
    /** Without a server in the build the room features are hidden. */
    available: syncServerUrl !== null,
    room,
    status,
    error: roomError,
    busy,
    remoteChangeAt,

    async create() {
      if (!syncServerUrl || busy.value) return
      busy.value = true
      roomError.value = null
      try {
        const created = await createRoom(syncServerUrl)
        setRoom(created)
        connect(created, false)
      } catch (e) {
        roomError.value = (e as Error).message
      } finally {
        busy.value = false
      }
    },

    /** Opened from the moderator's link on another device: take over the room's game. */
    join(target: CreatedRoom) {
      roomError.value = null
      remoteChangeAt.value = null
      setRoom(target)
      connect(target, true)
    },

    leave() {
      roomError.value = null
      leave()
    },

    /** Ends the room for all devices (boards show that it no longer exists). */
    async end() {
      const current = room.value
      if (!syncServerUrl || !current || busy.value) return
      busy.value = true
      roomError.value = null
      // Disconnect first – otherwise the server closing our socket would look like a lost room.
      disconnect?.()
      try {
        await endRoomOnServer(syncServerUrl, current)
        leave()
      } catch (e) {
        roomError.value = (e as Error).message
        connect(current, false)
      } finally {
        busy.value = false
      }
    },

    clearError() {
      roomError.value = null
    },
  }
}
