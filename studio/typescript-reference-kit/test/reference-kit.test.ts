import assert from 'node:assert/strict'
import test from 'node:test'
import { createHealthPayload } from '../src/contracts.ts'
import { loadSanitizedStudioEnv, parseBooleanEnv } from '../src/env.ts'
import { createProductAnalyticsEvent, assertAnalyticsPrivacy } from '../src/analytics.ts'
import { buildMaintenanceResponse, isMaintenanceBypassPath, shouldBlockForMaintenance } from '../src/maintenance.ts'
import { renderStudioMetrics } from '../src/metrics.ts'
import { planSaveWrite } from '../src/persistence.ts'
import { buildReleaseCatalog, normalizeBuildMetadata, validateReleaseCatalog } from '../src/release.ts'
import { issueSessionTicket, verifySessionTicket } from '../src/session-tickets.ts'
import {
  activeTimelineEvents,
  collectActiveAssetKeys,
  elapsedAnimationDelayMs,
  mergeVisualTimeline,
} from '../src/visual-timeline.ts'

const service = {
  id: 'sample-game',
  environment: 'staging' as const,
}

const build = normalizeBuildMetadata({
  commitSha: '1234567890abcdef1234567890abcdef12345678',
  version: 'v0.1.0',
  committedAt: '2026-05-07T00:00:00.000Z',
})

const maintenance = {
  enabled: false,
  source: 'none' as const,
}

test('health and release payloads expose build metadata without secrets', () => {
  const health = createHealthPayload({ service, build, maintenance })
  assert.equal(health.ok, true)
  assert.equal(health.build.shortCommitSha, '1234567890ab')

  const release = buildReleaseCatalog({
    service,
    build,
    maintenance,
    updateMode: 'prompt',
    patchNotesSource: '/data/patch-notes.json',
    releaseNotes: {
      currentEntryId: 'v0.1.0',
      currentVersion: 'v0.1.0',
      publicDocsUrl: 'https://docs.example.test/notes.html',
      discordStatus: 'posted',
    },
  })
  validateReleaseCatalog(release)
  assert.equal(release.currentBuild.commitSha, build.commitSha)
  assert.equal(release.releaseNotes?.discordStatus, 'posted')
})

test('maintenance allows operator probes and blocks player routes', () => {
  const active = {
    enabled: true,
    source: 'studio' as const,
    message: 'Game on maintenance',
    discordUrl: 'https://discord.gg/<stable-invite-code>',
    retryAfterSeconds: 120,
  }

  assert.equal(isMaintenanceBypassPath('/healthz'), true)
  assert.equal(shouldBlockForMaintenance({ maintenance: active, method: 'GET', pathname: '/' }), true)
  assert.equal(shouldBlockForMaintenance({ maintenance: active, method: 'GET', pathname: '/metrics' }), false)

  const response = buildMaintenanceResponse(active)
  assert.equal(response.statusCode, 503)
  assert.equal(response.headers['retry-after'], '120')
  assert.equal(response.body.maintenance, true)
})

test('metrics include build, maintenance, and process families', () => {
  const metrics = renderStudioMetrics({
    prefix: 'sample_game',
    service,
    build,
    maintenance: { enabled: true, source: 'game' },
    process: {
      uptimeSeconds: 10,
      residentMemoryBytes: 2048,
      heapUsedBytes: 1024,
    },
  })

  assert.match(metrics, /sample_game_build_info/u)
  assert.match(metrics, /sample_game_maintenance_mode\{service="sample-game",environment="staging"\} 1/u)
  assert.match(metrics, /sample_game_process_heap_used_bytes/u)
})

test('environment loader sanitizes secrets into presence booleans', () => {
  assert.equal(parseBooleanEnv('maintenance'), true)
  const env = loadSanitizedStudioEnv({
    HL_STUDIOS_ENVIRONMENT: 'beta',
    HL_STUDIOS_MAINTENANCE_MODE: '1',
    HL_ACCOUNTS_URL: 'https://accounts.example.test',
    HL_ACCOUNTS_CLIENT_ID: 'sample-game',
    HL_ACCOUNTS_CLIENT_SECRET: '<client-secret>',
    HL_ACCOUNTS_INTERNAL_TOKEN: '<internal-token>',
    SAMPLE_GAME_RUNTIME_URL: 'https://beta.example.test',
  }, {
    gamePrefix: 'sample-game',
  })

  assert.equal(env.environment, 'staging')
  assert.equal(env.maintenance.enabled, true)
  assert.equal(env.accounts.hasClientSecret, true)
  assert.equal(JSON.stringify(env).includes('<client-secret>'), false)
})

test('analytics envelope accepts safe ids and rejects private values', () => {
  const event = createProductAnalyticsEvent({
    eventName: 'session.started',
    environment: 'staging',
    deploymentVariant: 'beta',
    gameId: 'sample-game',
    sourceApp: 'sample-game-runtime',
    userId: 'user_123',
    sessionId: 'session_123',
    payload: {
      account_type: 'registered',
      stage: 'tutorial',
    },
    now: new Date('2026-05-07T00:00:00.000Z'),
    idGenerator: () => 'event_123',
  })

  assert.equal(event.event_category, 'session')
  assert.equal(event.event_id, 'event_123')
  assert.throws(() => assertAnalyticsPrivacy({ email: 'player@example.test' }), /Unsafe analytics key/u)
})

test('persistence planning keeps save ownership explicit', () => {
  assert.deepEqual(planSaveWrite({
    mode: 'hybrid',
    authenticated: false,
    onlineAvailable: false,
    feature: 'solo-save',
  }).target, 'client-cache')

  assert.deepEqual(planSaveWrite({
    mode: 'hybrid',
    authenticated: true,
    onlineAvailable: true,
    feature: 'leaderboard',
  }).target, 'game-server')

  assert.deepEqual(planSaveWrite({
    mode: 'offline-single-player',
    authenticated: false,
    onlineAvailable: false,
    feature: 'premium',
  }).target, 'shared-account-service')
})

test('session tickets verify scope, signature, and expiry', () => {
  const secret = 'sample-session-ticket-secret'
  const ticket = issueSessionTicket({
    secret,
    sessionId: 'session_123',
    hostUserId: 'user_123',
    scopes: ['host', 'join'],
    ttlSeconds: 60,
    now: new Date('2026-05-07T00:00:00.000Z'),
    ticketId: 'ticket_123',
  })

  assert.equal(verifySessionTicket(ticket, {
    secret,
    requiredScope: 'join',
    now: new Date('2026-05-07T00:00:30.000Z'),
  }).ticketId, 'ticket_123')

  assert.throws(() => verifySessionTicket(ticket, {
    secret: 'different-session-ticket-secret',
    now: new Date('2026-05-07T00:00:30.000Z'),
  }), /signature/u)

  assert.throws(() => verifySessionTicket(ticket, {
    secret,
    now: new Date('2026-05-07T00:02:00.000Z'),
  }), /expired/u)
})

test('visual timeline events merge without restarting repeated snapshots', () => {
  const first = {
    stateRevision: 10,
    serverTimeMs: 1_000,
    events: [{
      id: 'move_unit_1_10',
      type: 'unit_moved' as const,
      stateRevision: 10,
      startedAtMs: 900,
      durationMs: 400,
      unitId: 'unit_1',
      assetKeys: ['monster:rat:walk'],
    }],
  }
  const repeated = {
    stateRevision: 10,
    serverTimeMs: 1_100,
    events: [{
      ...first.events[0],
      assetKeys: ['monster:rat:walk', 'effect:dust'],
    }],
  }

  const timeline = mergeVisualTimeline([], first)
  const merged = mergeVisualTimeline(timeline, repeated)
  const active = activeTimelineEvents(merged, 1_100)

  assert.equal(merged.length, 1)
  assert.deepEqual(collectActiveAssetKeys(active), ['effect:dust', 'monster:rat:walk'])
  assert.equal(elapsedAnimationDelayMs(merged[0], 1_100), -200)
})
