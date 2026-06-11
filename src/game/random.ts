const MAX_SEED = 0x7fffffff

export const createRunSeed = (): number => Math.floor(Math.random() * MAX_SEED) + 1

export const normalizeSeed = (seed: number): number => {
  if (!Number.isFinite(seed)) {
    return 1
  }

  const normalized = Math.abs(Math.floor(seed)) % MAX_SEED
  return normalized === 0 ? 1 : normalized
}

export const seededValue = (seed: number, salt = 0): number => {
  const value = Math.sin((normalizeSeed(seed) + salt * 1013.37) * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export const seededInt = (seed: number, salt: number, min: number, max: number): number => {
  const low = Math.ceil(min)
  const high = Math.floor(max)
  if (high <= low) {
    return low
  }

  return low + Math.floor(seededValue(seed, salt) * (high - low + 1))
}
