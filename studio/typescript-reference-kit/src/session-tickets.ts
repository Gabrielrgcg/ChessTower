import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export interface SessionTicketClaims {
  ticketId: string
  sessionId: string
  hostUserId: string
  issuedAt: string
  expiresAt: string
  scopes: string[]
  maxPlayers?: number
}

export interface SignedSessionTicket {
  claims: SessionTicketClaims
  signature: string
}

const canonicalClaims = (claims: SessionTicketClaims): string => JSON.stringify({
  expiresAt: claims.expiresAt,
  hostUserId: claims.hostUserId,
  issuedAt: claims.issuedAt,
  maxPlayers: claims.maxPlayers,
  scopes: [...claims.scopes].sort(),
  sessionId: claims.sessionId,
  ticketId: claims.ticketId,
})

const signClaims = (claims: SessionTicketClaims, secret: string): string => (
  createHmac('sha256', secret).update(canonicalClaims(claims)).digest('base64url')
)

const assertUsableSecret = (secret: string): void => {
  if (secret.length < 16) {
    throw new Error('Session ticket secret must be at least 16 characters.')
  }
}

export const issueSessionTicket = (input: {
  secret: string
  sessionId: string
  hostUserId: string
  scopes: string[]
  ttlSeconds: number
  maxPlayers?: number
  now?: Date
  ticketId?: string
}): SignedSessionTicket => {
  assertUsableSecret(input.secret)
  if (input.ttlSeconds <= 0 || input.ttlSeconds > 24 * 60 * 60) {
    throw new Error('Session ticket ttlSeconds must be between 1 second and 24 hours.')
  }

  const issuedAt = input.now ?? new Date()
  const expiresAt = new Date(issuedAt.getTime() + input.ttlSeconds * 1000)
  const claims: SessionTicketClaims = {
    ticketId: input.ticketId ?? randomUUID(),
    sessionId: input.sessionId,
    hostUserId: input.hostUserId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    scopes: input.scopes,
    ...(input.maxPlayers ? { maxPlayers: input.maxPlayers } : {}),
  }

  return {
    claims,
    signature: signClaims(claims, input.secret),
  }
}

export const verifySessionTicket = (ticket: SignedSessionTicket, input: {
  secret: string
  requiredScope?: string
  now?: Date
}): SessionTicketClaims => {
  assertUsableSecret(input.secret)
  const expectedSignature = signClaims(ticket.claims, input.secret)
  const actual = Buffer.from(ticket.signature)
  const expected = Buffer.from(expectedSignature)
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Session ticket signature is invalid.')
  }

  const now = input.now ?? new Date()
  if (Date.parse(ticket.claims.expiresAt) <= now.getTime()) {
    throw new Error('Session ticket is expired.')
  }

  if (input.requiredScope && !ticket.claims.scopes.includes(input.requiredScope)) {
    throw new Error(`Session ticket is missing required scope: ${input.requiredScope}.`)
  }

  return ticket.claims
}
