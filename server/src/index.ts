/**
 * Sync server Worker (ADR 0006):
 * - `POST /rooms` – creates a room, answers `{ roomCode, hostToken }`
 * - `GET /rooms/:code/ws` – WebSocket of the room (role and token come in the `hello` message)
 * - `DELETE /rooms/:code` with `Authorization: Bearer <hostToken>` – ends the room
 */

import { normalizeRoomCode, type CreatedRoom } from '../../src/shared/sync/protocol'
import { generateRoomCode, generateToken, hashToken, isAllowedOrigin } from './rooms'

export { GameRoom } from './room'

const ROOM_PATH = /^\/rooms\/([^/]+)(\/ws)?$/

export default {
  async fetch(request, env): Promise<Response> {
    const origin = request.headers.get('Origin')
    if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) return text('Nepovolený pôvod', 403)
    const cors: Record<string, string> = origin
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
      : {}

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'POST, DELETE',
          'Access-Control-Allow-Headers': 'Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    const url = new URL(request.url)
    if (url.pathname === '/') return text('5proti5 sync server', 200, cors)
    if (url.pathname === '/rooms' && request.method === 'POST') return createRoom(env, cors)

    const match = ROOM_PATH.exec(url.pathname)
    const code = match && normalizeRoomCode(match[1]!)
    if (!code) return text('Nenájdené', 404, cors)
    const room = env.ROOMS.get(env.ROOMS.idFromName(code))

    if (match[2] && request.method === 'GET') {
      if (request.headers.get('Upgrade') !== 'websocket')
        return text('Očakáva sa WebSocket', 426, cors)
      return room.fetch(request)
    }
    if (!match[2] && request.method === 'DELETE') {
      const token = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1]
      if (!token) return text('Chýba token moderátora', 401, cors)
      const result = await room.remove(await hashToken(token))
      if (result === 'removed') return new Response(null, { status: 204, headers: cors })
      return result === 'notFound'
        ? text('Miestnosť neexistuje', 404, cors)
        : text('Nesprávny token moderátora', 403, cors)
    }
    return text('Nenájdené', 404, cors)
  },
} satisfies ExportedHandler<Env>

async function createRoom(env: Env, cors: Record<string, string>): Promise<Response> {
  // ~887 million codes; a collision is rare, a few attempts are plenty.
  for (let attempt = 0; attempt < 5; attempt++) {
    const roomCode = generateRoomCode()
    const hostToken = generateToken()
    const room = env.ROOMS.get(env.ROOMS.idFromName(roomCode))
    if (await room.create(await hashToken(hostToken))) {
      return Response.json({ roomCode, hostToken } satisfies CreatedRoom, {
        status: 201,
        headers: cors,
      })
    }
  }
  return text('Nepodarilo sa založiť miestnosť, skús znova', 503, cors)
}

function text(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
