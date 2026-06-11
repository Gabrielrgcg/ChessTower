import type { BuildMetadata, MaintenanceState, ServiceIdentity } from './contracts.ts'

export interface ProcessSnapshot {
  uptimeSeconds: number
  residentMemoryBytes: number
  heapUsedBytes: number
}

const escapeLabelValue = (value: string): string => (
  value.replace(/\\/gu, '\\\\').replace(/\n/gu, '\\n').replace(/"/gu, '\\"')
)

const metricLine = (name: string, labels: Record<string, string>, value: number): string => {
  const renderedLabels = Object.entries(labels)
    .map(([key, labelValue]) => `${key}="${escapeLabelValue(labelValue)}"`)
    .join(',')
  return `${name}{${renderedLabels}} ${value}`
}

export const renderStudioMetrics = (input: {
  prefix?: string
  service: ServiceIdentity
  build: BuildMetadata
  maintenance: MaintenanceState
  process: ProcessSnapshot
}): string => {
  const prefix = input.prefix ?? 'hl_game'
  const serviceLabels = {
    service: input.service.id,
    environment: input.service.environment,
  }
  const buildLabels = {
    ...serviceLabels,
    version: input.build.version,
    commit_sha: input.build.commitSha,
    build_id: input.build.buildId,
  }

  return [
    `# HELP ${prefix}_build_info Build metadata for the running service.`,
    `# TYPE ${prefix}_build_info gauge`,
    metricLine(`${prefix}_build_info`, buildLabels, 1),
    `# HELP ${prefix}_maintenance_mode Whether maintenance mode is enabled.`,
    `# TYPE ${prefix}_maintenance_mode gauge`,
    metricLine(`${prefix}_maintenance_mode`, serviceLabels, input.maintenance.enabled ? 1 : 0),
    `# HELP ${prefix}_process_uptime_seconds Process uptime in seconds.`,
    `# TYPE ${prefix}_process_uptime_seconds gauge`,
    metricLine(`${prefix}_process_uptime_seconds`, serviceLabels, input.process.uptimeSeconds),
    `# HELP ${prefix}_process_resident_memory_bytes Resident memory in bytes.`,
    `# TYPE ${prefix}_process_resident_memory_bytes gauge`,
    metricLine(`${prefix}_process_resident_memory_bytes`, serviceLabels, input.process.residentMemoryBytes),
    `# HELP ${prefix}_process_heap_used_bytes Heap used in bytes.`,
    `# TYPE ${prefix}_process_heap_used_bytes gauge`,
    metricLine(`${prefix}_process_heap_used_bytes`, serviceLabels, input.process.heapUsedBytes),
    '',
  ].join('\n')
}
