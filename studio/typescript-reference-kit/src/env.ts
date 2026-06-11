import type { MaintenanceState, StudioEnvironment } from './contracts.ts'

export type EnvRecord = Record<string, string | undefined>

export interface SanitizedAccountsEnv {
  url?: string
  clientId?: string
  redirectUri?: string
  hasClientSecret: boolean
  hasInternalToken: boolean
}

export interface SanitizedStudioEnv {
  environment: StudioEnvironment
  maintenance: MaintenanceState
  accounts: SanitizedAccountsEnv
  runtimeUrl?: string
}

const trueValues = new Set(['1', 'true', 'yes', 'on', 'maintenance'])
const falseValues = new Set(['0', 'false', 'no', 'off', ''])

export const parseBooleanEnv = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()
  if (trueValues.has(normalized)) {
    return true
  }
  if (falseValues.has(normalized)) {
    return false
  }
  return defaultValue
}

export const normalizeEnvironment = (value: string | undefined): StudioEnvironment => {
  switch (value?.trim().toLowerCase()) {
    case 'production':
    case 'prod':
      return 'production'
    case 'staging':
    case 'beta':
      return 'staging'
    case 'test':
      return 'test'
    default:
      return 'development'
  }
}

const normalizeGamePrefix = (gamePrefix: string): string => (
  gamePrefix.trim().toUpperCase().replace(/[^A-Z0-9]+/gu, '_').replace(/^_+|_+$/gu, '')
)

export const loadSanitizedStudioEnv = (env: EnvRecord, options: {
  gamePrefix: string
  defaultClientId?: string
}): SanitizedStudioEnv => {
  const prefix = normalizeGamePrefix(options.gamePrefix)
  const gameMaintenanceValue = env[`${prefix}_MAINTENANCE_MODE`]
  const studioMaintenanceValue = env.HL_STUDIOS_MAINTENANCE_MODE
  const gameMaintenanceEnabled = parseBooleanEnv(gameMaintenanceValue, false)
  const studioMaintenanceEnabled = parseBooleanEnv(studioMaintenanceValue, false)
  const maintenanceSource = gameMaintenanceEnabled ? 'game' : studioMaintenanceEnabled ? 'studio' : 'none'

  return {
    environment: normalizeEnvironment(env.HL_STUDIOS_ENVIRONMENT ?? env.NODE_ENV),
    maintenance: {
      enabled: gameMaintenanceEnabled || studioMaintenanceEnabled,
      source: maintenanceSource,
      message: env[`${prefix}_MAINTENANCE_MESSAGE`] ?? env.HL_STUDIOS_MAINTENANCE_MESSAGE,
      discordUrl: env[`${prefix}_MAINTENANCE_DISCORD_URL`] ?? env.HL_STUDIOS_MAINTENANCE_DISCORD_URL,
    },
    accounts: {
      url: env.HL_ACCOUNTS_URL,
      clientId: env.HL_ACCOUNTS_CLIENT_ID ?? options.defaultClientId,
      redirectUri: env.HL_ACCOUNTS_REDIRECT_URI,
      hasClientSecret: Boolean(env.HL_ACCOUNTS_CLIENT_SECRET),
      hasInternalToken: Boolean(env.HL_ACCOUNTS_INTERNAL_TOKEN),
    },
    runtimeUrl: env[`${prefix}_RUNTIME_URL`] ?? env.RUNTIME_URL,
  }
}
