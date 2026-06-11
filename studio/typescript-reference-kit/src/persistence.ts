export type RuntimeMode = 'offline-single-player' | 'online-single-player' | 'multiplayer' | 'hybrid'
export type PersistenceTarget = 'client-cache' | 'game-server' | 'shared-account-service' | 'reject-or-queue'

export interface SaveWritePlan {
  target: PersistenceTarget
  authoritative: boolean
  syncRequired: boolean
  reason: string
}

export const planSaveWrite = (input: {
  mode: RuntimeMode
  authenticated: boolean
  onlineAvailable: boolean
  feature: 'solo-save' | 'leaderboard' | 'premium' | 'coop-session'
}): SaveWritePlan => {
  if (input.feature === 'premium') {
    return {
      target: 'shared-account-service',
      authoritative: true,
      syncRequired: true,
      reason: 'Premium entitlement is owned by HL Accounts or another shared billing authority.',
    }
  }

  if (input.feature === 'leaderboard' || input.feature === 'coop-session') {
    return input.onlineAvailable
      ? {
          target: 'game-server',
          authoritative: true,
          syncRequired: true,
          reason: `${input.feature} must be server-authoritative.`,
        }
      : {
          target: 'reject-or-queue',
          authoritative: false,
          syncRequired: true,
          reason: `${input.feature} cannot be trusted from offline client state.`,
        }
  }

  if (input.mode === 'offline-single-player') {
    return {
      target: 'client-cache',
      authoritative: true,
      syncRequired: false,
      reason: 'Offline solo save is device-owned by product design.',
    }
  }

  if (input.mode === 'online-single-player' || input.mode === 'multiplayer') {
    return input.onlineAvailable && input.authenticated
      ? {
          target: 'game-server',
          authoritative: true,
          syncRequired: true,
          reason: 'Online modes require the game server to own save writes.',
        }
      : {
          target: 'reject-or-queue',
          authoritative: false,
          syncRequired: true,
          reason: 'Online save write requires authenticated server access.',
        }
  }

  return input.onlineAvailable && input.authenticated
    ? {
        target: 'game-server',
        authoritative: true,
        syncRequired: true,
        reason: 'Hybrid mode can sync authenticated solo saves to the game server.',
      }
    : {
        target: 'client-cache',
        authoritative: true,
        syncRequired: false,
        reason: 'Hybrid mode keeps solo play available while offline or unauthenticated.',
      }
}
