import assert from 'node:assert/strict'
import test from 'node:test'

import { FORMATIONS, chooseFormation, spawnFormation } from '../src/game/formations.ts'
import { createDefaultProfile } from '../src/game/persistence.ts'
import { getLegalMoves } from '../src/game/rules.ts'
import { createGame, findHero, performPlayerMove } from '../src/game/state.ts'
import {
  BOARD_COLUMNS,
  ENEMY_MAX_MOVES,
  ENEMY_MIN_MOVES,
  PLAYER_MOVE_ANIMATION_MS,
  VISIBLE_ROWS,
  type GameState,
  type Piece,
} from '../src/game/types.ts'

const setPieces = (state: GameState, pieces: Piece[]): void => {
  state.pieces = pieces
  state.selectedPieceId = null
  state.phase = 'player'
  state.gameOverReason = null
}

const ally = (partial: Partial<Piece>): Piece => ({
  id: partial.id ?? 'ally',
  kind: partial.kind ?? 'pawn',
  side: 'ally',
  x: partial.x ?? 0,
  y: partial.y ?? 0,
  heroic: partial.heroic ?? false,
  movesRemaining: partial.movesRemaining ?? null,
  modifiers: partial.modifiers ?? [],
})

const enemy = (partial: Partial<Piece>): Piece => ({
  id: partial.id ?? 'enemy',
  kind: partial.kind ?? 'pawn',
  side: 'enemy',
  x: partial.x ?? 0,
  y: partial.y ?? 0,
  heroic: false,
  movesRemaining: partial.movesRemaining ?? ENEMY_MIN_MOVES,
  modifiers: partial.modifiers ?? [],
})

const newFormationNames = ['knight-screen', 'bishop-crossfire', 'rook-checkpoint', 'skewer-guard'] as const
const newFormationEnemyCounts: Record<(typeof newFormationNames)[number], number> = {
  'knight-screen': 3,
  'bishop-crossfire': 4,
  'rook-checkpoint': 5,
  'skewer-guard': 5,
}
const allowedNewEnemyKinds = new Set(['pawn', 'knight', 'bishop', 'rook'])
const proceduralStructureNames = new Set(['pawn-defense', 'pawn-wall', 'guarded-file', 'mixed-defense'])
const promotionKinds = new Set(['rook', 'bishop', 'knight', 'queen'])

const startSignature = (state: GameState): Array<Pick<Piece, 'kind' | 'side' | 'x' | 'y' | 'heroic' | 'movesRemaining'>> => {
  return state.pieces
    .filter((piece) => piece.side === 'ally' && piece.y <= 2)
    .map((piece) => ({
      kind: piece.kind,
      side: piece.side,
      x: piece.x,
      y: piece.y,
      heroic: piece.heroic,
      movesRemaining: piece.movesRemaining,
    }))
    .sort((left, right) => Number(right.heroic) - Number(left.heroic) || left.x - right.x)
}

const waveSignature = (state: GameState): Array<Pick<Piece, 'kind' | 'side' | 'x' | 'y' | 'movesRemaining'>> => {
  return state.pieces
    .filter((piece) => piece.y >= VISIBLE_ROWS - 3)
    .map((piece) => ({
      kind: piece.kind,
      side: piece.side,
      x: piece.x,
      y: piece.y,
      movesRemaining: piece.movesRemaining,
    }))
    .sort((left, right) => left.y - right.y || left.x - right.x || left.kind.localeCompare(right.kind))
}

test('finite allied pieces expire and clear their tile after their last move', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', x: 0, y: 6, heroic: true })
  const finite = ally({ id: 'finite', x: 4, y: 2, movesRemaining: 1 })
  setPieces(state, [hero, finite])

  state.selectedPieceId = finite.id
  performPlayerMove(state, { x: 4, y: 3 })

  assert.equal(state.pieces.some((piece) => piece.id === finite.id), false)
  assert.equal(state.pieces.some((piece) => piece.x === 4 && piece.y === 3), false)
  assert.ok(state.events.some((event) => event.type === 'unit_removed' && event.pieceId === finite.id))
})

test('finite allied pieces gain three moves when capturing an enemy', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', kind: 'king', x: 0, y: 0, heroic: true })
  const finite = ally({ id: 'finite', kind: 'pawn', x: 3, y: 2, movesRemaining: 1 })
  const target = enemy({ id: 'target', kind: 'pawn', x: 4, y: 3 })
  setPieces(state, [hero, finite, target])

  state.selectedPieceId = finite.id
  const result = performPlayerMove(state, { x: 4, y: 3 })

  const movedFinite = state.pieces.find((piece) => piece.id === finite.id)
  assert.equal(result.moved, true)
  assert.equal(movedFinite?.x, 4)
  assert.equal(movedFinite?.y, 3)
  assert.equal(movedFinite?.movesRemaining, 3)
  assert.equal(state.pieces.some((piece) => piece.id === target.id), false)
  assert.match(state.message, /gained 3 moves/u)
})

test('allied pawns promote to a random major piece on the last row instead of expiring', () => {
  const state = createGame(createDefaultProfile(), 'pawn', 321)
  const hero = ally({ id: 'hero', kind: 'king', x: 0, y: 0, heroic: true })
  const pawn = ally({ id: 'promoter', kind: 'pawn', x: 3, y: VISIBLE_ROWS - 2, movesRemaining: 1 })
  setPieces(state, [hero, pawn])

  state.selectedPieceId = pawn.id
  const result = performPlayerMove(state, { x: 3, y: VISIBLE_ROWS - 1 })

  const promoted = state.pieces.find((piece) => piece.id === pawn.id)
  assert.equal(result.moved, true)
  assert.equal(promoted?.x, 3)
  assert.equal(promoted?.y, VISIBLE_ROWS - 1)
  assert.equal(promotionKinds.has(promoted?.kind ?? ''), true)
  assert.ok((promoted?.movesRemaining ?? 0) >= 3)
  assert.match(state.message, /promoted to/u)
})

test('special pawns can promote with their two-square move', () => {
  const state = createGame(createDefaultProfile(), 'pawn', 654)
  const hero = ally({ id: 'hero', kind: 'king', x: 0, y: 0, heroic: true })
  const pawn = ally({ id: 'special-promoter', kind: 'specialPawn', x: 4, y: VISIBLE_ROWS - 3, movesRemaining: 1 })
  setPieces(state, [hero, pawn])

  state.selectedPieceId = pawn.id
  performPlayerMove(state, { x: 4, y: VISIBLE_ROWS - 1 })

  const promoted = state.pieces.find((piece) => piece.id === pawn.id)
  assert.equal(promotionKinds.has(promoted?.kind ?? ''), true)
  assert.equal(promoted?.y, VISIBLE_ROWS - 1)
  assert.ok((promoted?.movesRemaining ?? 0) >= 3)
})

test('heroic pawns promote and stay heroic with unlimited moves', () => {
  const state = createGame(createDefaultProfile(), 'pawn', 987)
  const hero = ally({ id: 'hero-pawn', kind: 'pawn', x: 2, y: VISIBLE_ROWS - 2, heroic: true })
  setPieces(state, [hero])

  state.selectedPieceId = hero.id
  performPlayerMove(state, { x: 2, y: VISIBLE_ROWS - 1 })

  const promoted = state.pieces.find((piece) => piece.id === hero.id)
  assert.equal(promotionKinds.has(promoted?.kind ?? ''), true)
  assert.equal(promoted?.heroic, true)
  assert.equal(promoted?.movesRemaining, null)
})

test('finite enemy pieces expire and clear their tile after spending their move budget', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', kind: 'king', x: 7, y: 0, heroic: true })
  const finite = ally({ id: 'finite', kind: 'pawn', x: 0, y: 1, movesRemaining: 10 })
  const finiteEnemy = enemy({ id: 'finite-enemy', kind: 'pawn', x: 4, y: 5, movesRemaining: ENEMY_MIN_MOVES })
  setPieces(state, [hero, finite, finiteEnemy])

  state.selectedPieceId = finite.id
  const first = performPlayerMove(state, { x: 0, y: 2 })
  assert.equal(first.enemyMoves, 1)
  assert.equal(state.pieces.find((piece) => piece.id === finiteEnemy.id)?.movesRemaining, 2)

  state.selectedPieceId = finite.id
  const second = performPlayerMove(state, { x: 0, y: 3 })
  assert.equal(second.enemyMoves, 1)
  assert.equal(state.pieces.find((piece) => piece.id === finiteEnemy.id)?.movesRemaining, 1)

  state.selectedPieceId = finite.id
  const third = performPlayerMove(state, { x: 0, y: 4 })
  assert.equal(third.enemyMoves, 1)
  assert.equal(state.pieces.some((piece) => piece.id === finiteEnemy.id), false)
  assert.equal(state.pieces.some((piece) => piece.x === 4 && piece.y === 2), false)
  assert.ok(state.events.some((event) => event.type === 'unit_removed' && event.pieceId === finiteEnemy.id))
})

test('enemy queens have the minimum life budget and can move', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  const queen = enemy({ id: 'queen', kind: 'queen', x: 7, y: 7 })
  setPieces(state, [hero, queen])

  assert.notEqual(getLegalMoves(state.pieces, queen).length, 0)

  state.selectedPieceId = hero.id
  const result = performPlayerMove(state, { x: 0, y: 2 })

  assert.equal(result.enemyMoves, 1)
  const movedQueen = state.pieces.find((piece) => piece.id === queen.id)
  assert.equal(movedQueen?.movesRemaining, ENEMY_MIN_MOVES - 1)
  assert.ok(state.events.some((event) => event.type === 'unit_moved' && event.pieceId === queen.id))
  assert.equal(state.events.some((event) => event.type === 'unit_removed' && event.pieceId === queen.id), false)
})

test('enemy pieces gain capture moves without exceeding the max budget', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', kind: 'king', x: 0, y: 1, heroic: true })
  const target = ally({ id: 'target', kind: 'pawn', x: 3, y: 4, movesRemaining: 2 })
  const captor = enemy({ id: 'captor', kind: 'pawn', x: 4, y: 5, movesRemaining: 4 })
  setPieces(state, [hero, target, captor])

  state.selectedPieceId = hero.id
  const result = performPlayerMove(state, { x: 0, y: 2 })

  const movedCaptor = state.pieces.find((piece) => piece.id === captor.id)
  assert.equal(result.enemyMoves, 1)
  assert.equal(movedCaptor?.x, 3)
  assert.equal(movedCaptor?.y, 4)
  assert.equal(movedCaptor?.movesRemaining, ENEMY_MAX_MOVES)
  assert.equal(state.pieces.some((piece) => piece.id === target.id), false)
  assert.ok(state.events.some((event) => event.type === 'unit_captured' && event.pieceId === target.id))
})

test('enemy pawns promote on their last row with a bounded move budget', () => {
  const state = createGame(createDefaultProfile(), 'pawn', 753)
  const hero = ally({ id: 'hero', kind: 'king', x: 7, y: VISIBLE_ROWS - 1, heroic: true })
  const finite = ally({ id: 'finite', kind: 'pawn', x: 0, y: 1, movesRemaining: 10 })
  const pawn = enemy({ id: 'enemy-promoter', kind: 'pawn', x: 4, y: 1, movesRemaining: ENEMY_MIN_MOVES })
  setPieces(state, [hero, finite, pawn])

  state.selectedPieceId = finite.id
  const result = performPlayerMove(state, { x: 0, y: 2 })

  const promoted = state.pieces.find((piece) => piece.id === pawn.id)
  assert.equal(result.enemyMoves, 1)
  assert.equal(promoted?.x, 4)
  assert.equal(promoted?.y, 0)
  assert.equal(promotionKinds.has(promoted?.kind ?? ''), true)
  assert.ok((promoted?.movesRemaining ?? 0) >= ENEMY_MIN_MOVES)
  assert.ok((promoted?.movesRemaining ?? 0) <= ENEMY_MAX_MOVES)
})

test('normal captures emit capture animation events with removed piece data', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', kind: 'king', x: 0, y: 0, heroic: true })
  const finite = ally({ id: 'finite', kind: 'pawn', x: 3, y: 2, movesRemaining: 2 })
  const target = enemy({ id: 'target', kind: 'pawn', x: 4, y: 3, movesRemaining: 1 })
  setPieces(state, [hero, finite, target])

  state.selectedPieceId = finite.id
  performPlayerMove(state, { x: 4, y: 3 })

  const captureEvent = state.events.find((event) => event.type === 'unit_captured')
  assert.equal(captureEvent?.pieceId, target.id)
  assert.equal(captureEvent?.capturedPiece?.kind, 'pawn')
  assert.equal(captureEvent?.capturedPiece?.side, 'enemy')
  assert.deepEqual(captureEvent?.to, { x: 4, y: 3 })
  assert.equal(typeof captureEvent?.durationMs, 'number')
})

test('run ends when scroll removes the only heroic piece', () => {
  const state = createGame(createDefaultProfile())
  state.heroicMovesSinceScroll = 1
  const hero = ally({ id: 'hero', kind: 'king', x: 0, y: 0, heroic: true })
  const finite = ally({ id: 'finite', x: 4, y: 2, movesRemaining: 2 })
  setPieces(state, [hero, finite])

  state.heroicMovesSinceScroll = 1
  state.selectedPieceId = hero.id
  const result = performPlayerMove(state, { x: 1, y: 0 })

  assert.equal(result.gameOver, true)
  assert.equal(findHero(state), undefined)
  assert.match(state.gameOverReason ?? '', /No heroic/)
})

test('enemies move only one piece per turn', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  const firstPawn = enemy({ id: 'first', kind: 'pawn', x: 4, y: 5 })
  const secondPawn = enemy({ id: 'second', kind: 'pawn', x: 5, y: 5 })
  setPieces(state, [hero, firstPawn, secondPawn])

  state.selectedPieceId = hero.id
  performPlayerMove(state, { x: 0, y: 2 })

  const enemyMoveEvents = state.events.filter((event) => event.type === 'unit_moved' && event.side === 'enemy')
  assert.equal(enemyMoveEvents.length, 1)
  assert.equal(enemyMoveEvents.every((event) => event.durationMs === 1500), true)
  const movedEnemyIds = new Set(enemyMoveEvents.map((event) => event.pieceId))
  assert.equal(movedEnemyIds.size, 1)
})

test('player moves emit a short ally animation event', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  setPieces(state, [hero])

  state.selectedPieceId = hero.id
  performPlayerMove(state, { x: 0, y: 2 })

  const allyMoveEvent = state.events.find((event) => event.type === 'unit_moved' && event.side === 'ally')
  assert.equal(allyMoveEvent?.pieceId, hero.id)
  assert.equal(allyMoveEvent?.durationMs, PLAYER_MOVE_ANIMATION_MS)
})

test('immobile enemies do not move during the enemy turn', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  const lockedRook = enemy({ id: 'locked', kind: 'rook', x: 5, y: 7, modifiers: ['immobile'] })
  setPieces(state, [hero, lockedRook])

  state.selectedPieceId = hero.id
  performPlayerMove(state, { x: 0, y: 2 })

  const movedEnemy = state.pieces.find((piece) => piece.id === lockedRook.id)
  assert.equal(movedEnemy?.x, 5)
  assert.equal(movedEnemy?.y, 7)
})

test('the tower scrolls only after every second heroic move', () => {
  const state = createGame(createDefaultProfile())
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  const finite = ally({ id: 'finite', x: 4, y: 2, movesRemaining: 4 })
  setPieces(state, [hero, finite])

  state.selectedPieceId = finite.id
  const first = performPlayerMove(state, { x: 4, y: 3 })
  assert.equal(first.scrolled, false)
  assert.equal(state.floor, 0)
  assert.equal(state.heroicMovesSinceScroll, 0)

  state.selectedPieceId = hero.id
  const second = performPlayerMove(state, { x: 0, y: 2 })
  assert.equal(second.scrolled, false)
  assert.equal(state.floor, 0)
  assert.equal(state.heroicMovesSinceScroll, 1)

  state.selectedPieceId = finite.id
  const third = performPlayerMove(state, { x: 4, y: 4 })
  assert.equal(third.scrolled, false)
  assert.equal(state.floor, 0)
  assert.equal(state.heroicMovesSinceScroll, 1)

  state.selectedPieceId = hero.id
  const fourth = performPlayerMove(state, { x: 0, y: 3 })
  assert.equal(fourth.scrolled, true)
  assert.equal(state.floor, 1)
  assert.equal(state.heroicMovesSinceScroll, 0)
  assert.equal(state.turn, 5)
})

test('new runs can start with a pawn or king hero', () => {
  const pawnRun = createGame(createDefaultProfile(), 'pawn')
  assert.equal(findHero(pawnRun)?.kind, 'pawn')

  const kingRun = createGame(createDefaultProfile(), 'king')
  assert.equal(findHero(kingRun)?.kind, 'king')
})

test('seeded runs reproduce the same start positions and first wave', () => {
  const first = createGame(createDefaultProfile(), 'pawn', 12345)
  const second = createGame(createDefaultProfile(), 'pawn', 12345)

  assert.equal(first.runSeed, 12345)
  assert.equal(second.runSeed, 12345)
  assert.deepEqual(startSignature(first), startSignature(second))
  assert.equal(first.lastFormation, second.lastFormation)
  assert.deepEqual(waveSignature(first), waveSignature(second))
})

test('different run seeds can vary start positions or wave labels', () => {
  const baseline = createGame(createDefaultProfile(), 'pawn', 100)
  const baselineStart = JSON.stringify(startSignature(baseline))
  const varied = Array.from({ length: 12 }, (_, index) => createGame(createDefaultProfile(), 'pawn', 101 + index))
    .some((state) => JSON.stringify(startSignature(state)) !== baselineStart || state.lastFormation !== baseline.lastFormation)

  assert.equal(varied, true)
})

test('seeded starts preserve the selected hero and safe lower-board support', () => {
  for (const startingKind of ['pawn', 'king'] as const) {
    for (const seed of [7, 42, 12345, 98765]) {
      const state = createGame(createDefaultProfile(), startingKind, seed)
      const hero = findHero(state)
      const lowerAllies = state.pieces.filter((piece) => piece.side === 'ally' && piece.y <= 2)
      const finiteSupport = lowerAllies.find((piece) => !piece.heroic)
      const occupied = new Set(lowerAllies.map((piece) => `${piece.x},${piece.y}`))

      assert.equal(hero?.kind, startingKind)
      assert.equal(hero?.y, 1)
      assert.ok(hero && hero.x >= 1 && hero.x < BOARD_COLUMNS - 1)
      assert.equal(lowerAllies.length, 2)
      assert.equal(occupied.size, lowerAllies.length)
      assert.equal(finiteSupport?.kind, 'pawn')
      assert.equal(finiteSupport?.y, 2)
      assert.notEqual(finiteSupport?.x, hero?.x)
      assert.equal(finiteSupport?.movesRemaining, 2)
    }
  }
})

test('enemy formations never include more than one queen', () => {
  for (const formation of FORMATIONS) {
    const queenCount = formation.pieces.filter((piece) => piece.side === 'enemy' && piece.kind === 'queen').length
    assert.ok(queenCount <= 1, `${formation.name} includes ${queenCount} enemy queens`)
  }
})

test('new enemy formations add three to five pawn knight bishop rook enemies', () => {
  for (const formationName of newFormationNames) {
    const formation = FORMATIONS.find((candidate) => candidate.name === formationName)
    assert.ok(formation, `${formationName} formation should exist`)

    const enemyPieces = formation.pieces.filter((piece) => piece.side === 'enemy')
    const alliedSupport = formation.pieces.filter((piece) => piece.side === 'ally')

    assert.equal(enemyPieces.length, newFormationEnemyCounts[formationName])
    assert.ok(enemyPieces.length >= 3 && enemyPieces.length <= 5)
    assert.ok(enemyPieces.every((piece) => allowedNewEnemyKinds.has(piece.kind)))
    assert.equal(alliedSupport.length, 1)
    assert.equal(typeof alliedSupport[0]?.movesRemaining, 'number')
  }
})

test('procedural pawn defense structure recipes are available', () => {
  const structures = FORMATIONS.filter((formation) => proceduralStructureNames.has(formation.name))

  assert.equal(structures.length, proceduralStructureNames.size)
  for (const formation of structures) {
    const enemyPieces = formation.pieces.filter((piece) => piece.side === 'enemy')
    assert.ok(enemyPieces.length >= 3 && enemyPieces.length <= 5)
    assert.ok(enemyPieces.some((piece) => piece.kind === 'pawn'))
    assert.ok(enemyPieces.every((piece) => piece.rowFromTop >= 0 && piece.rowFromTop <= 2))
  }
})

test('formation selection is deterministic for an explicit run seed', () => {
  const first = chooseFormation(8, 2468)
  const second = chooseFormation(8, 2468)
  const variedNames = new Set(Array.from({ length: 16 }, (_, index) => chooseFormation(8, 2468 + index).name))

  assert.equal(first.name, second.name)
  assert.ok(variedNames.size > 1)
})

test('formation selection respects floor gates and spawns tactical pieces', () => {
  const state = createGame(createDefaultProfile(), 'pawn', 4242)
  state.pieces = []
  state.floor = 12
  const formation = chooseFormation(state.floor, state.runSeed)
  const label = spawnFormation(state)

  assert.ok(formation.minFloor <= state.floor)
  assert.ok(label.length > 0)
  assert.ok(state.pieces.length > 0)
  assert.ok(state.pieces.some((piece) => piece.side === 'enemy'))
  assert.ok(
    state.pieces
      .filter((piece) => piece.side === 'enemy')
      .every((piece) => piece.movesRemaining !== null && piece.movesRemaining >= ENEMY_MIN_MOVES && piece.movesRemaining <= ENEMY_MAX_MOVES),
  )
})

test('generated waves stay in bounds, avoid overlaps, and spawn from top rows', () => {
  for (const seed of [1, 2, 99, 4242]) {
    for (let floor = 0; floor <= 16; floor += 1) {
      const state = createGame(createDefaultProfile(), 'pawn', seed)
      state.pieces = []
      state.events = []
      state.floor = floor

      const label = spawnFormation(state)
      const occupied = new Set(state.pieces.map((piece) => `${piece.x},${piece.y}`))
      const enemyPieces = state.pieces.filter((piece) => piece.side === 'enemy')

      assert.match(label, /^Wave \d+: /u)
      assert.equal(occupied.size, state.pieces.length)
      assert.ok(enemyPieces.length >= 2)
      assert.ok(
        state.pieces.every((piece) => (
          piece.x >= 0 &&
          piece.x < BOARD_COLUMNS &&
          piece.y >= VISIBLE_ROWS - 3 &&
          piece.y < VISIBLE_ROWS
        )),
      )
      assert.ok(
        enemyPieces.every((piece) => (
          piece.movesRemaining !== null &&
          piece.movesRemaining >= ENEMY_MIN_MOVES &&
          piece.movesRemaining <= ENEMY_MAX_MOVES
        )),
      )
    }
  }
})
