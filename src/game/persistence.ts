import { PLAYABLE_KINDS, type PieceProgression, type PlayableKind, type Profile } from './types.ts'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'chess-tower-profile-v1'

export const createDefaultProgression = (): PieceProgression => {
  const pieces = {} as PieceProgression
  for (const kind of PLAYABLE_KINDS) {
    pieces[kind] = {
      unlocked: kind === 'pawn',
      level: 0,
    }
  }
  return pieces
}

export const createDefaultProfile = (): Profile => ({
  currency: 0,
  pieces: createDefaultProgression(),
})

export const normalizeProfile = (value: unknown): Profile => {
  const fallback = createDefaultProfile()
  if (!value || typeof value !== 'object') {
    return fallback
  }

  const source = value as Partial<Profile>
  const profile = createDefaultProfile()
  profile.currency = Number.isFinite(source.currency) ? Math.max(0, Math.floor(source.currency ?? 0)) : 0

  const sourcePieces = source.pieces
  if (sourcePieces && typeof sourcePieces === 'object') {
    for (const kind of PLAYABLE_KINDS) {
      const piece = (sourcePieces as Partial<PieceProgression>)[kind]
      if (piece && typeof piece === 'object') {
        profile.pieces[kind] = {
          unlocked: Boolean(piece.unlocked) || fallback.pieces[kind].unlocked,
          level: Number.isFinite(piece.level) ? Math.max(0, Math.floor(piece.level ?? 0)) : 0,
        }
      }
    }
  }

  return profile
}

export const loadProfile = (storage: StorageLike | undefined = globalThis.localStorage): Profile => {
  if (!storage) {
    return createDefaultProfile()
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? normalizeProfile(JSON.parse(raw)) : createDefaultProfile()
  } catch {
    return createDefaultProfile()
  }
}

export const saveProfile = (profile: Profile, storage: StorageLike | undefined = globalThis.localStorage): void => {
  if (!storage) {
    return
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProfile(profile)))
}

export const upgradeCost = (profile: Profile, kind: PlayableKind): number => {
  const level = profile.pieces[kind].level
  return 3 + level * 2
}

export const buyUpgrade = (profile: Profile, kind: PlayableKind): boolean => {
  const progress = profile.pieces[kind]
  if (!progress.unlocked) {
    return false
  }

  const cost = upgradeCost(profile, kind)
  if (profile.currency < cost) {
    return false
  }

  profile.currency -= cost
  progress.level += 1
  return true
}

export const unlockPiece = (profile: Profile, kind: PlayableKind): boolean => {
  if (profile.pieces[kind].unlocked) {
    return false
  }
  profile.pieces[kind].unlocked = true
  return true
}

export const finiteMoveBudgetFor = (profile: Profile, kind: PlayableKind, base: number): number => {
  return base + profile.pieces[kind].level
}
