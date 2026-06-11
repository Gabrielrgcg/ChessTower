import { randomUUID } from 'node:crypto'
import type { StudioEnvironment } from './contracts.ts'

export const minimumProductEventNames = [
  'auth.account_created',
  'auth.login_succeeded',
  'auth.login_failed',
  'auth.logout',
  'session.started',
  'session.ended',
  'onboarding.milestone',
  'wave.started',
  'wave.ended',
  'run.reset',
  'run.retried',
  'economy.transaction',
  'premium.checkout',
  'premium.entitlement_changed',
  'progression.unlock',
  'content.interaction',
] as const

export type ProductEventName = typeof minimumProductEventNames[number]
export type ProductPayload = Record<string, unknown>

export interface ProductAnalyticsEvent {
  schema_version: 1
  event_id: string
  event_name: ProductEventName
  event_category: string
  occurred_at: string
  environment: StudioEnvironment
  deployment_variant: string
  game_id: string
  source_app: string
  user_id?: string
  session_id?: string
  payload: ProductPayload
}

const eventNameSet = new Set<string>(minimumProductEventNames)
const forbiddenKeyPattern = /(?:email|phone|wallet|ip|cookie|authorization|password|token|secret|signature|providerSubject|chat|supportMessage)/iu
const emailValuePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu
const jwtValuePattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/u
const bearerPattern = /^Bearer\s+\S+/iu

export const assertAnalyticsPrivacy = (payload: unknown, path = 'payload'): void => {
  if (payload === null || payload === undefined) {
    return
  }

  if (typeof payload === 'string') {
    if (emailValuePattern.test(payload) || jwtValuePattern.test(payload) || bearerPattern.test(payload)) {
      throw new Error(`Unsafe analytics value at ${path}.`)
    }
    return
  }

  if (typeof payload !== 'object') {
    return
  }

  if (Array.isArray(payload)) {
    payload.forEach((item, index) => assertAnalyticsPrivacy(item, `${path}[${index}]`))
    return
  }

  for (const [key, value] of Object.entries(payload as ProductPayload)) {
    if (forbiddenKeyPattern.test(key)) {
      throw new Error(`Unsafe analytics key at ${path}.${key}.`)
    }
    assertAnalyticsPrivacy(value, `${path}.${key}`)
  }
}

export const createProductAnalyticsEvent = (input: {
  eventName: ProductEventName
  environment: StudioEnvironment
  deploymentVariant: string
  gameId: string
  sourceApp: string
  userId?: string
  sessionId?: string
  payload?: ProductPayload
  now?: Date
  idGenerator?: () => string
}): ProductAnalyticsEvent => {
  if (!eventNameSet.has(input.eventName)) {
    throw new Error(`Unsupported product analytics event: ${input.eventName}.`)
  }

  const payload = input.payload ?? {}
  assertAnalyticsPrivacy(payload)

  return {
    schema_version: 1,
    event_id: input.idGenerator?.() ?? randomUUID(),
    event_name: input.eventName,
    event_category: input.eventName.split('.')[0] ?? 'unknown',
    occurred_at: (input.now ?? new Date()).toISOString(),
    environment: input.environment,
    deployment_variant: input.deploymentVariant,
    game_id: input.gameId,
    source_app: input.sourceApp,
    ...(input.userId ? { user_id: input.userId } : {}),
    ...(input.sessionId ? { session_id: input.sessionId } : {}),
    payload,
  }
}
