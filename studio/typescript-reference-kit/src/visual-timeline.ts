export type VisualTimelineEventType =
  | 'cooldown_started'
  | 'unit_moved'
  | 'combat_effect_started'
  | 'projectile_started'
  | 'resource_changed'
  | 'unit_spawned'
  | 'unit_removed'
  | 'loot_dropped'
  | 'loot_collected'
  | 'wave_phase_changed'

export interface VisualTimelineEvent {
  id: string
  type: VisualTimelineEventType
  stateRevision: number
  startedAtMs: number
  durationMs?: number
  unitId?: string
  clientCommandId?: string
  assetKeys?: string[]
}

export interface VisualSnapshotEnvelope {
  stateRevision: number
  serverTimeMs: number
  events: VisualTimelineEvent[]
}

export const mergeVisualTimeline = (
  currentEvents: readonly VisualTimelineEvent[],
  snapshot: VisualSnapshotEnvelope,
): VisualTimelineEvent[] => {
  const byId = new Map(currentEvents.map((event) => [event.id, event]))

  for (const event of snapshot.events) {
    const existing = byId.get(event.id)
    if (!existing || event.stateRevision >= existing.stateRevision) {
      byId.set(event.id, event)
    }
  }

  return [...byId.values()].sort((left, right) => (
    left.startedAtMs - right.startedAtMs || left.id.localeCompare(right.id)
  ))
}

export const elapsedAnimationDelayMs = (event: VisualTimelineEvent, nowMs: number): number => {
  const elapsedMs = Math.max(0, nowMs - event.startedAtMs)
  return -elapsedMs
}

export const activeTimelineEvents = (
  events: readonly VisualTimelineEvent[],
  nowMs: number,
): VisualTimelineEvent[] => events.filter((event) => {
  if (event.durationMs === undefined) {
    return event.startedAtMs <= nowMs
  }
  return event.startedAtMs <= nowMs && nowMs <= event.startedAtMs + event.durationMs
})

export const collectActiveAssetKeys = (events: readonly VisualTimelineEvent[]): string[] => {
  const keys = new Set<string>()
  for (const event of events) {
    for (const key of event.assetKeys ?? []) {
      keys.add(key)
    }
  }
  return [...keys].sort()
}
