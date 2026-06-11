export type StudioEnvironment = 'development' | 'test' | 'staging' | 'production'
export type UpdateMode = 'prompt' | 'force' | 'silent' | 'service-worker-offline-cache'
export type CheckStatus = 'ok' | 'degraded' | 'down'

export interface ServiceIdentity {
  id: string
  name?: string
  environment: StudioEnvironment
}

export interface BuildMetadata {
  buildId: string
  commitSha: string
  shortCommitSha: string
  version: string
  committedAt: string
  deployedAt?: string
}

export interface MaintenanceState {
  enabled: boolean
  source: 'none' | 'studio' | 'game'
  message?: string
  discordUrl?: string
  retryAfterSeconds?: number
}

export interface ReleaseNotesMetadata {
  currentEntryId?: string
  currentVersion?: string
  publicDocsUrl?: string
  discordStatus?: 'not-applicable' | 'pending' | 'posted' | 'skipped' | 'backfilled'
  discordSkipReason?: string
}

export interface HealthPayload {
  ok: true
  service: ServiceIdentity
  build: BuildMetadata
  maintenance: {
    enabled: boolean
  }
  checks: Record<string, CheckStatus>
}

export interface ReleaseCatalog {
  service: ServiceIdentity
  currentBuild: BuildMetadata
  updateMode: UpdateMode
  patchNotesSource: string
  releaseNotes?: ReleaseNotesMetadata
  maintenance: {
    enabled: boolean
    message?: string
  }
}

const secretKeyPattern = /(?:secret|token|password|private[_-]?key|authorization|cookie|webhook|signature)/iu

export const assertNoSecretKeys = (value: unknown, path = 'payload'): void => {
  if (value === null || value === undefined) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretKeys(item, `${path}[${index}]`))
    return
  }

  if (typeof value !== 'object') {
    return
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (secretKeyPattern.test(key)) {
      throw new Error(`Secret-like field is not allowed at ${path}.${key}.`)
    }

    assertNoSecretKeys(nestedValue, `${path}.${key}`)
  }
}

export const createHealthPayload = (input: {
  service: ServiceIdentity
  build: BuildMetadata
  maintenance: MaintenanceState
  checks?: Record<string, CheckStatus>
}): HealthPayload => {
  const payload: HealthPayload = {
    ok: true,
    service: input.service,
    build: input.build,
    maintenance: {
      enabled: input.maintenance.enabled,
    },
    checks: {
      runtime: 'ok',
      ...input.checks,
    },
  }

  assertNoSecretKeys(payload)
  return payload
}
