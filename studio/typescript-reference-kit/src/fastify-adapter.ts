import { createHealthPayload, type BuildMetadata, type MaintenanceState, type ServiceIdentity } from './contracts.ts'
import { buildMaintenanceResponse, shouldBlockForMaintenance } from './maintenance.ts'
import { renderStudioMetrics, type ProcessSnapshot } from './metrics.ts'
import { buildReleaseCatalog } from './release.ts'
import type { UpdateMode } from './contracts.ts'

export interface ReplyLike {
  header(name: string, value: string): ReplyLike
  type(value: string): ReplyLike
  status(code: number): ReplyLike
  send(value: unknown): unknown
}

export interface RequestLike {
  method: string
  url: string
}

export interface RouteRegistryLike {
  get(path: string, handler: (request: RequestLike, reply: ReplyLike) => unknown): unknown
  addHook?(name: 'preHandler', handler: (request: RequestLike, reply: ReplyLike) => unknown): unknown
}

export const registerOperationalRoutes = (app: RouteRegistryLike, input: {
  service: ServiceIdentity
  build: BuildMetadata
  maintenance: MaintenanceState
  updateMode: UpdateMode
  patchNotesSource: string
  processSnapshot: () => ProcessSnapshot
  metricPrefix?: string
}): void => {
  app.addHook?.('preHandler', (request, reply) => {
    const pathname = new URL(request.url, 'http://local.test').pathname
    if (!shouldBlockForMaintenance({ maintenance: input.maintenance, method: request.method, pathname })) {
      return
    }

    const response = buildMaintenanceResponse(input.maintenance)
    for (const [name, value] of Object.entries(response.headers)) {
      reply.header(name, value)
    }
    return reply.status(response.statusCode).send(response.body)
  })

  app.get('/healthz', () => createHealthPayload({
    service: input.service,
    build: input.build,
    maintenance: input.maintenance,
  }))

  app.get('/metrics', (_request, reply) => (
    reply
      .type('text/plain; version=0.0.4; charset=utf-8')
      .header('cache-control', 'no-store, max-age=0')
      .send(renderStudioMetrics({
        prefix: input.metricPrefix,
        service: input.service,
        build: input.build,
        maintenance: input.maintenance,
        process: input.processSnapshot(),
      }))
  ))

  app.get('/api/release', () => buildReleaseCatalog({
    service: input.service,
    build: input.build,
    updateMode: input.updateMode,
    patchNotesSource: input.patchNotesSource,
    maintenance: input.maintenance,
  }))
}
