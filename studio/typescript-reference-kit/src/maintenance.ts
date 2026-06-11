import type { MaintenanceState } from './contracts.ts'

export const isMaintenanceBypassPath = (pathname: string): boolean => (
  pathname === '/healthz' ||
  pathname === '/metrics' ||
  pathname === '/api/release' ||
  pathname.startsWith('/brand/') ||
  pathname.startsWith('/favicon')
)

export const shouldBlockForMaintenance = (input: {
  maintenance: MaintenanceState
  method: string
  pathname: string
}): boolean => {
  if (!input.maintenance.enabled) {
    return false
  }

  return !isMaintenanceBypassPath(input.pathname)
}

export const buildMaintenanceResponse = (maintenance: MaintenanceState): {
  statusCode: 503
  headers: Record<string, string>
  body: {
    error: 'maintenance'
    maintenance: true
    message: string
    discordUrl?: string
  }
} => ({
  statusCode: 503,
  headers: {
    'cache-control': 'no-store, max-age=0',
    ...(maintenance.retryAfterSeconds ? { 'retry-after': String(maintenance.retryAfterSeconds) } : {}),
  },
  body: {
    error: 'maintenance',
    maintenance: true,
    message: maintenance.message ?? 'Game on maintenance',
    ...(maintenance.discordUrl ? { discordUrl: maintenance.discordUrl } : {}),
  },
})
