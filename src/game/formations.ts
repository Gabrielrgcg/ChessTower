import {
  BOARD_COLUMNS,
  ENEMY_MAX_MOVES,
  ENEMY_MIN_MOVES,
  VISIBLE_ROWS,
  type FormationPieceSpec,
  type FormationTemplate,
  type GameState,
  type Piece,
  type PlayableKind,
} from './types.ts'
import { finiteMoveBudgetFor } from './persistence.ts'
import { seededInt, seededValue } from './random.ts'
import { pieceAt } from './rules.ts'

export const FORMATIONS: FormationTemplate[] = [
  {
    name: 'pawn-defense',
    minFloor: 0,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 1, modifiers: ['immobile'] },
      { side: 'ally', kind: 'pawn', x: 5, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'pawn-wall',
    minFloor: 1,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'pawn', x: 1, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 5, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 1, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 1, modifiers: ['immobile'] },
      { side: 'ally', kind: 'pawn', x: 6, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'guarded-file',
    minFloor: 4,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'rook', x: 3, rowFromTop: 0, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 2, modifiers: ['immobile'] },
      { side: 'ally', kind: 'rook', x: 5, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'mixed-defense',
    minFloor: 8,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'bishop', x: 2, rowFromTop: 0 },
      { side: 'enemy', kind: 'knight', x: 5, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 2, modifiers: ['immobile'] },
      { side: 'ally', kind: 'bishop', x: 6, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'pawn-ladder',
    minFloor: 0,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 1 },
      { side: 'ally', kind: 'pawn', x: 2, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'knight-screen',
    minFloor: 2,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 5, rowFromTop: 0 },
      { side: 'enemy', kind: 'knight', x: 4, rowFromTop: 1 },
      { side: 'ally', kind: 'pawn', x: 3, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'fork-net',
    minFloor: 3,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'knight', x: 4, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 5, rowFromTop: 1 },
      { side: 'ally', kind: 'knight', x: 1, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'battery-file',
    minFloor: 5,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'rook', x: 5, rowFromTop: 0 },
      { side: 'enemy', kind: 'queen', x: 5, rowFromTop: 2 },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 1 },
      { side: 'ally', kind: 'rook', x: 2, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'bishop-crossfire',
    minFloor: 6,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'bishop', x: 1, rowFromTop: 0 },
      { side: 'enemy', kind: 'knight', x: 6, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 4, rowFromTop: 1 },
      { side: 'ally', kind: 'bishop', x: 2, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'pin-diagonal',
    minFloor: 7,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'bishop', x: 1, rowFromTop: 0 },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 2, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'pawn', x: 6, rowFromTop: 1 },
      { side: 'ally', kind: 'bishop', x: 4, rowFromTop: 2, movesRemaining: 3 },
    ],
  },
  {
    name: 'sacrifice-gate',
    minFloor: 9,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'rook', x: 2, rowFromTop: 0, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'rook', x: 5, rowFromTop: 0, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'pawn', x: 3, rowFromTop: 1 },
      { side: 'ally', kind: 'specialPawn', x: 4, rowFromTop: 2, movesRemaining: 3 },
    ],
  },
  {
    name: 'rook-checkpoint',
    minFloor: 10,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'rook', x: 1, rowFromTop: 0, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'rook', x: 6, rowFromTop: 0, modifiers: ['immobile'] },
      { side: 'enemy', kind: 'bishop', x: 4, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 5, rowFromTop: 1 },
      { side: 'ally', kind: 'rook', x: 3, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'mirror-puzzle',
    minFloor: 12,
    mirrorable: false,
    pieces: [
      { side: 'enemy', kind: 'queen', x: 0, rowFromTop: 0 },
      { side: 'enemy', kind: 'rook', x: 7, rowFromTop: 0 },
      { side: 'enemy', kind: 'knight', x: 2, rowFromTop: 1 },
      { side: 'enemy', kind: 'knight', x: 5, rowFromTop: 1 },
      { side: 'ally', kind: 'bishop', x: 3, rowFromTop: 2, movesRemaining: 2 },
      { side: 'ally', kind: 'bishop', x: 4, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
  {
    name: 'skewer-guard',
    minFloor: 14,
    mirrorable: true,
    pieces: [
      { side: 'enemy', kind: 'rook', x: 0, rowFromTop: 0 },
      { side: 'enemy', kind: 'bishop', x: 3, rowFromTop: 0 },
      { side: 'enemy', kind: 'knight', x: 6, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 2, rowFromTop: 1 },
      { side: 'enemy', kind: 'pawn', x: 5, rowFromTop: 2 },
      { side: 'ally', kind: 'knight', x: 4, rowFromTop: 2, movesRemaining: 2 },
    ],
  },
]

const unlockedOrPawn = (state: GameState, kind: PlayableKind): PlayableKind => {
  return state.profile.pieces[kind].unlocked ? kind : 'pawn'
}

const clampEnemyMoves = (moves: number): number => {
  return Math.max(ENEMY_MIN_MOVES, Math.min(ENEMY_MAX_MOVES, moves))
}

const seededEnemyMoves = (state: GameState, spec: FormationPieceSpec): number => {
  if (spec.movesRemaining !== undefined) {
    return clampEnemyMoves(spec.movesRemaining)
  }

  const salt = (state.floor + 1) * 197 + spec.x * 17 + spec.rowFromTop * 23 + spec.kind.length * 29
  return seededInt(state.runSeed, salt, ENEMY_MIN_MOVES, ENEMY_MAX_MOVES)
}

export const chooseFormation = (floor: number, runSeed = 0): FormationTemplate => {
  const available = FORMATIONS.filter((formation) => formation.minFloor <= floor)
  const index = seededInt(runSeed, floor * 43 + 17, 0, available.length - 1)
  return available[Math.max(0, Math.min(index, available.length - 1))]
}

const mirrorSpec = (spec: FormationPieceSpec): FormationPieceSpec => ({
  ...spec,
  x: BOARD_COLUMNS - 1 - spec.x,
})

const shiftSpec = (spec: FormationPieceSpec, offset: number): FormationPieceSpec => ({
  ...spec,
  x: spec.x + offset,
})

const chooseHorizontalOffset = (state: GameState, specs: FormationPieceSpec[], formationName: string): number => {
  const minX = Math.min(...specs.map((spec) => spec.x))
  const maxX = Math.max(...specs.map((spec) => spec.x))
  const minOffset = -minX
  const maxOffset = BOARD_COLUMNS - 1 - maxX
  return seededInt(state.runSeed, state.floor * 67 + formationName.length, minOffset, maxOffset)
}

const createPieceFromSpec = (state: GameState, resolvedSpec: FormationPieceSpec): Piece | null => {
  const y = VISIBLE_ROWS - 1 - resolvedSpec.rowFromTop
  if (pieceAt(state.pieces, resolvedSpec.x, y)) {
    return null
  }

  const kind = resolvedSpec.side === 'ally' ? unlockedOrPawn(state, resolvedSpec.kind) : resolvedSpec.kind
  const baseMoves = resolvedSpec.movesRemaining ?? 2
  const movesRemaining =
    resolvedSpec.side === 'ally'
      ? finiteMoveBudgetFor(state.profile, kind, baseMoves)
      : seededEnemyMoves(state, resolvedSpec)

  const piece: Piece = {
    id: `p${state.nextPieceNumber}`,
    kind,
    side: resolvedSpec.side,
    x: resolvedSpec.x,
    y,
    heroic: false,
    movesRemaining,
    modifiers: resolvedSpec.modifiers ?? [],
  }
  state.nextPieceNumber += 1
  return piece
}

export const spawnFormation = (state: GameState): string => {
  const formation = chooseFormation(state.floor, state.runSeed)
  const mirrored = formation.mirrorable && seededValue(state.runSeed, state.floor * 59 + 41) > 0.5
  const mirroredSpecs = formation.pieces.map((spec) => (mirrored ? mirrorSpec(spec) : spec))
  const horizontalOffset = chooseHorizontalOffset(state, mirroredSpecs, formation.name)
  const specs = mirroredSpecs.map((spec) => shiftSpec(spec, horizontalOffset))
  const formationLabel = `Wave ${state.floor + 1}: ${formation.name}${mirrored ? ' mirrored' : ''}`
  let spawned = 0

  for (const spec of specs) {
    const piece = createPieceFromSpec(state, spec)
    if (piece) {
      state.pieces.push(piece)
      spawned += 1
      state.events.push({
        id: `e${state.stateRevision}-${piece.id}-spawn`,
        type: 'unit_spawned',
        atMs: state.serverTimeMs,
        pieceId: piece.id,
        to: { x: piece.x, y: piece.y },
        label: formationLabel,
      })
    }
  }

  state.lastFormation = formationLabel
  return spawned > 0 ? state.lastFormation : `${formationLabel} blocked`
}
