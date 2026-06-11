import assert from 'node:assert/strict'
import test from 'node:test'

import { getLegalMoves } from '../src/game/rules.ts'
import type { Piece } from '../src/game/types.ts'

const piece = (partial: Partial<Piece> & Pick<Piece, 'id' | 'kind' | 'side' | 'x' | 'y'>): Piece => ({
  heroic: false,
  movesRemaining: null,
  modifiers: [],
  ...partial,
})

test('ally pawns move upward and capture diagonally', () => {
  const pawn = piece({ id: 'ally-pawn', kind: 'pawn', side: 'ally', x: 3, y: 2 })
  const pieces = [
    pawn,
    piece({ id: 'enemy-left', kind: 'pawn', side: 'enemy', x: 2, y: 3 }),
    piece({ id: 'enemy-right', kind: 'pawn', side: 'enemy', x: 4, y: 3 }),
  ]

  assert.deepEqual([...getLegalMoves(pieces, pawn)].sort((a, b) => a.x - b.x), [
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
  ])
})

test('enemy immobile modifier removes legal movement', () => {
  const rook = piece({
    id: 'enemy-rook',
    kind: 'rook',
    side: 'enemy',
    x: 4,
    y: 7,
    modifiers: ['immobile'],
  })

  assert.deepEqual(getLegalMoves([rook], rook), [])
})

test('sliding pieces stop at stones and cannot enter them', () => {
  const rook = piece({ id: 'ally-rook', kind: 'rook', side: 'ally', x: 2, y: 2 })
  const stone = piece({ id: 'stone', kind: 'stone', side: 'stone', x: 2, y: 4 })
  const enemy = piece({ id: 'enemy', kind: 'pawn', side: 'enemy', x: 4, y: 2 })
  const moves = getLegalMoves([rook, stone, enemy], rook)

  assert.equal(moves.some((move) => move.x === 2 && move.y === 4), false)
  assert.equal(moves.some((move) => move.x === 2 && move.y === 3), true)
  assert.equal(moves.some((move) => move.x === 4 && move.y === 2), true)
})
