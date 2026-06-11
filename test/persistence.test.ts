import assert from 'node:assert/strict'
import test from 'node:test'

import { buyUpgrade, createDefaultProfile, loadProfile, saveProfile, unlockPiece } from '../src/game/persistence.ts'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

test('corrupt localStorage data falls back to pawn-only default profile', () => {
  const storage = new MemoryStorage()
  storage.setItem('chess-tower-profile-v1', '{bad json')

  const profile = loadProfile(storage)

  assert.equal(profile.currency, 0)
  assert.equal(profile.pieces.pawn.unlocked, true)
  assert.equal(profile.pieces.knight.unlocked, false)
})

test('profile saves, loads, unlocks, and buys persistent upgrades', () => {
  const storage = new MemoryStorage()
  const profile = createDefaultProfile()
  profile.currency = 12
  assert.equal(unlockPiece(profile, 'knight'), true)
  assert.equal(buyUpgrade(profile, 'pawn'), true)
  saveProfile(profile, storage)

  const loaded = loadProfile(storage)
  assert.equal(loaded.currency, 9)
  assert.equal(loaded.pieces.pawn.level, 1)
  assert.equal(loaded.pieces.knight.unlocked, true)
})
