import { spawnFormation } from './formations.ts'
import { unlockPiece } from './persistence.ts'
import { CHEST_SPAWN_CHANCE, SUPPORTED_CARD_IDS, isSupportedCardId, type SupportedCardId } from './cards.ts'
import { coordsEqual, getLegalMoves, isInsideBoard, pieceAt } from './rules.ts'
import {
  BOARD_COLUMNS,
  CAPTURE_KNOCKOVER_ANIMATION_MS,
  CAPTURE_MOVE_BONUS,
  ENEMY_MAX_MOVES,
  ENEMY_MOVE_ANIMATION_MS,
  HEROIC_MOVES_PER_SCROLL,
  MAX_HAND_SIZE,
  PLAYABLE_KINDS,
  PLAYER_MOVE_ANIMATION_MS,
  VISIBLE_ROWS,
  type CardInstance,
  type CardPlayResolution,
  type Coord,
  type GameState,
  type Piece,
  type PlayableKind,
  type Profile,
  type SpecialTile,
  type StartingHeroKind,
  type TurnResolution,
} from './types.ts'
import { createDefaultProfile } from './persistence.ts'

const UNLOCKS: Array<{ floor: number; kind: PlayableKind }> = [
  { floor: 3, kind: 'knight' },
  { floor: 5, kind: 'rook' },
  { floor: 7, kind: 'bishop' },
  { floor: 9, kind: 'specialPawn' },
  { floor: 12, kind: 'queen' },
  { floor: 16, kind: 'king' },
]

const cloneProfile = (profile: Profile): Profile => JSON.parse(JSON.stringify(profile)) as Profile

const createPieceId = (state: GameState): string => {
  const id = `p${state.nextPieceNumber}`
  state.nextPieceNumber += 1
  return id
}

const createCardInstanceId = (state: GameState): string => {
  const id = `c${state.nextCardNumber}`
  state.nextCardNumber += 1
  return id
}

const createTileId = (state: GameState): string => {
  const id = `t${state.nextTileNumber}`
  state.nextTileNumber += 1
  return id
}

const pushEvent = (
  state: GameState,
  piece: Piece,
  from: Coord,
  to: Coord,
  durationMs = PLAYER_MOVE_ANIMATION_MS,
): void => {
  state.events.push({
    id: `e${state.stateRevision}-${state.events.length}-${piece.id}-${from.x}-${from.y}-${to.x}-${to.y}`,
    type: 'unit_moved',
    atMs: Date.now(),
    pieceId: piece.id,
    side: piece.side,
    from,
    to,
    durationMs,
  })
}

const compactEvents = (state: GameState): void => {
  state.events = state.events.slice(-24)
}

interface MoveOutcome {
  captured: Piece | undefined
  expired: boolean
  bonusMovesGained: number
}

interface ChestOpenOutcome {
  opened: boolean
  blocked: boolean
  card: CardInstance | null
}

const isGameOver = (state: GameState): boolean => state.phase === 'gameOver'

const touchRevision = (state: GameState): void => {
  state.stateRevision += 1
  state.serverTimeMs = Date.now()
  compactEvents(state)
}

const seededValue = (seed: number): number => {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

const formatCardName = (id: string): string => {
  return id
    .split('_')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')
}

export const specialTileAt = (tiles: SpecialTile[], x: number, y: number): SpecialTile | undefined => {
  return tiles.find((tile) => tile.x === x && tile.y === y)
}

const isEmptyForChest = (state: GameState, coord: Coord): boolean => {
  return !pieceAt(state.pieces, coord.x, coord.y) && !specialTileAt(state.specialTiles, coord.x, coord.y)
}

const chestCandidates = (state: GameState): Coord[] => {
  const candidates: Coord[] = []
  for (let rowFromTop = 0; rowFromTop < 3; rowFromTop += 1) {
    const y = VISIBLE_ROWS - 1 - rowFromTop
    for (let x = 0; x < BOARD_COLUMNS; x += 1) {
      const coord = { x, y }
      if (isEmptyForChest(state, coord)) {
        candidates.push(coord)
      }
    }
  }
  return candidates
}

const cardRollToId = (roll: number): SupportedCardId => {
  const normalizedRoll = Math.min(0.999999, Math.max(0, roll))
  const index = Math.floor(normalizedRoll * SUPPORTED_CARD_IDS.length)
  return SUPPORTED_CARD_IDS[index] ?? SUPPORTED_CARD_IDS[0]
}

export const drawSupportedCardId = (roll = Math.random()): SupportedCardId => cardRollToId(roll)

export const grantCardToHand = (state: GameState, definitionId = drawSupportedCardId()): CardInstance | null => {
  if (state.cardHand.length >= MAX_HAND_SIZE || !isSupportedCardId(definitionId)) {
    return null
  }

  const card = {
    instanceId: createCardInstanceId(state),
    definitionId,
  }
  state.cardHand.push(card)
  return card
}

export const spawnChestTile = (
  state: GameState,
  roll = seededValue((state.floor + 1) * 101 + 5),
): boolean => {
  if (roll >= CHEST_SPAWN_CHANCE) {
    return false
  }

  const candidates = chestCandidates(state)
  if (candidates.length === 0) {
    return false
  }

  const candidateRoll = seededValue((state.floor + 1) * 131 + 3)
  const coord = candidates[Math.floor(candidateRoll * candidates.length)] ?? candidates[0]
  state.specialTiles.push({
    id: createTileId(state),
    kind: 'chest',
    state: 'closed',
    x: coord.x,
    y: coord.y,
  })
  return true
}

const openChestAt = (state: GameState, coord: Coord): ChestOpenOutcome => {
  const chest = specialTileAt(state.specialTiles, coord.x, coord.y)
  if (!chest || chest.kind !== 'chest') {
    return { opened: false, blocked: false, card: null }
  }

  if (state.cardHand.length >= MAX_HAND_SIZE) {
    state.message = 'Hand full. Chest stays closed.'
    return { opened: false, blocked: true, card: null }
  }

  chest.state = 'open'
  const card = grantCardToHand(state)
  state.specialTiles = state.specialTiles.filter((tile) => tile.id !== chest.id)
  state.message = card
    ? `Opened chest and drew ${formatCardName(card.definitionId)}.`
    : 'Opened chest, but no card could be drawn.'
  return { opened: Boolean(card), blocked: false, card }
}

export const createGame = (
  profile: Profile = createDefaultProfile(),
  startingHeroKind: StartingHeroKind = 'pawn',
): GameState => {
  const state: GameState = {
    pieces: [],
    specialTiles: [],
    cardHand: [],
    cardPlayedThisTurn: false,
    floor: 0,
    turn: 1,
    heroicMovesSinceScroll: 0,
    phase: 'player',
    selectedPieceId: null,
    profile: cloneProfile(profile),
    message: `Hero ${startingHeroKind} ready. Climb before the bottom row falls.`,
    gameOverReason: null,
    rewardClaimed: false,
    nextPieceNumber: 1,
    nextCardNumber: 1,
    nextTileNumber: 1,
    stateRevision: 1,
    serverTimeMs: Date.now(),
    events: [],
    lastFormation: '',
  }

  state.pieces.push({
    id: createPieceId(state),
    kind: startingHeroKind,
    side: 'ally',
    x: 3,
    y: 1,
    heroic: true,
    movesRemaining: null,
    modifiers: [],
  })
  state.pieces.push({
    id: createPieceId(state),
    kind: 'pawn',
    side: 'ally',
    x: 4,
    y: 2,
    heroic: false,
    movesRemaining: 2 + state.profile.pieces.pawn.level,
    modifiers: [],
  })
  spawnFormation(state)
  spawnChestTile(state)
  return state
}

export const findHero = (state: GameState): Piece | undefined => {
  return state.pieces.find((piece) => piece.side === 'ally' && piece.heroic)
}

export const getSelectedPiece = (state: GameState): Piece | undefined => {
  return state.selectedPieceId ? state.pieces.find((piece) => piece.id === state.selectedPieceId) : undefined
}

export const getSelectedLegalMoves = (state: GameState): Coord[] => {
  const selected = getSelectedPiece(state)
  return selected ? getLegalMoves(state.pieces, selected) : []
}

export const selectPieceAt = (state: GameState, coord: Coord): boolean => {
  const piece = pieceAt(state.pieces, coord.x, coord.y)
  if (!piece || piece.side !== 'ally' || state.phase !== 'player') {
    state.selectedPieceId = null
    return false
  }
  state.selectedPieceId = piece.id
  state.message = piece.heroic
    ? `Heroic ${piece.kind}: unlimited moves.`
    : `${piece.kind}: ${piece.movesRemaining ?? 0} moves before expiring.`
  return true
}

const removeAt = (pieces: Piece[], coord: Coord): Piece | undefined => {
  const index = pieces.findIndex((piece) => piece.x === coord.x && piece.y === coord.y)
  if (index < 0) {
    return undefined
  }
  const [removed] = pieces.splice(index, 1)
  return removed
}

const removePieceById = (pieces: Piece[], id: string): Piece | undefined => {
  const index = pieces.findIndex((piece) => piece.id === id)
  if (index < 0) {
    return undefined
  }
  const [removed] = pieces.splice(index, 1)
  return removed
}

const pushRemovalEvent = (state: GameState, piece: Piece, label: string): void => {
  state.events.push({
    id: `e${state.stateRevision}-${piece.id}-${label}`,
    type: 'unit_removed',
    atMs: Date.now(),
    pieceId: piece.id,
    label,
  })
}

const pieceSnapshot = (piece: Piece): Piece => ({
  ...piece,
  modifiers: [...piece.modifiers],
})

const pushCaptureEvent = (state: GameState, captured: Piece, destination: Coord): void => {
  state.events.push({
    id: `e${state.stateRevision}-${captured.id}-captured`,
    type: 'unit_captured',
    atMs: Date.now(),
    pieceId: captured.id,
    capturedPiece: pieceSnapshot(captured),
    side: captured.side,
    to: { ...destination },
    durationMs: CAPTURE_KNOCKOVER_ANIMATION_MS,
  })
}

const removePieceByIdWithEvent = (state: GameState, id: string, label: string): Piece | undefined => {
  const removed = removePieceById(state.pieces, id)
  if (removed) {
    pushRemovalEvent(state, removed, label)
  }
  return removed
}

const finishRun = (state: GameState, reason: string): void => {
  state.phase = 'gameOver'
  state.gameOverReason = reason
  if (!state.rewardClaimed) {
    const reward = Math.max(1, Math.floor(state.floor / 2) + 1)
    state.profile.currency += reward
    state.rewardClaimed = true
    state.message = `${reason} Salvaged ${reward} coins from floor ${state.floor}.`
  } else {
    state.message = reason
  }
}

const checkHeroRule = (state: GameState): void => {
  if (!findHero(state)) {
    finishRun(state, 'No heroic piece remains.')
  }
}

const movePieceTo = (state: GameState, piece: Piece, destination: Coord, durationMs?: number): MoveOutcome => {
  const from = { x: piece.x, y: piece.y }
  const captured = removeAt(state.pieces, destination)
  if (captured) {
    pushCaptureEvent(state, captured, destination)
  }
  piece.x = destination.x
  piece.y = destination.y
  pushEvent(state, piece, from, destination, durationMs)

  let expired = false
  let bonusMovesGained = 0
  if (!piece.heroic && piece.movesRemaining !== null) {
    piece.movesRemaining = Math.max(0, piece.movesRemaining - 1)
    if (piece.side === 'ally' && captured?.side === 'enemy') {
      piece.movesRemaining += CAPTURE_MOVE_BONUS
      bonusMovesGained = CAPTURE_MOVE_BONUS
    }
    if (piece.side === 'enemy' && captured?.side === 'ally') {
      const movesBeforeBonus = piece.movesRemaining
      piece.movesRemaining = Math.min(ENEMY_MAX_MOVES, piece.movesRemaining + CAPTURE_MOVE_BONUS)
      bonusMovesGained = piece.movesRemaining - movesBeforeBonus
    }
    if (piece.movesRemaining === 0) {
      removePieceById(state.pieces, piece.id)
      expired = true
      if (piece.side === 'ally') {
        state.message = 'A finite ally spent its last move and cleared the tile.'
      }
      state.events.push({
        id: `e${state.stateRevision}-${piece.id}-expired`,
        type: 'unit_removed',
        atMs: Date.now(),
        pieceId: piece.id,
        label: 'expired',
      })
    }
  }

  return { captured, expired, bonusMovesGained }
}

const distanceToHero = (state: GameState, coord: Coord): number => {
  const hero = findHero(state)
  if (!hero) {
    return Number.POSITIVE_INFINITY
  }
  return Math.abs(hero.x - coord.x) + Math.abs(hero.y - coord.y)
}

const enemyMovePriority = (state: GameState, move: Coord): number => {
  const target = pieceAt(state.pieces, move.x, move.y)
  if (target?.heroic) {
    return 0
  }
  if (target?.side === 'ally') {
    return 1
  }
  return 2
}

const chooseEnemyTurnAction = (state: GameState): { enemy: Piece; move: Coord } | null => {
  let best: { enemy: Piece; move: Coord; priority: number; distance: number; order: number } | null = null
  let order = 0

  for (const enemy of state.pieces.filter((piece) => piece.side === 'enemy')) {
    for (const move of getLegalMoves(state.pieces, enemy)) {
      const priority = enemyMovePriority(state, move)
      const distance = distanceToHero(state, move)
      const candidate = { enemy, move, priority, distance, order }
      if (
        !best ||
        candidate.priority < best.priority ||
        (candidate.priority === best.priority && candidate.distance < best.distance) ||
        (candidate.priority === best.priority && candidate.distance === best.distance && candidate.order < best.order)
      ) {
        best = candidate
      }
      order += 1
    }
  }

  return best ? { enemy: best.enemy, move: best.move } : null
}

const runEnemyTurn = (state: GameState): number => {
  state.phase = 'enemy'
  if (isGameOver(state)) {
    return 0
  }

  const action = chooseEnemyTurnAction(state)
  if (!action) {
    return 0
  }

  const { captured } = movePieceTo(state, action.enemy, action.move, ENEMY_MOVE_ANIMATION_MS)
  if (captured?.heroic) {
    finishRun(state, 'The heroic piece was captured.')
  }
  return 1
}

const applyUnlocks = (state: GameState): void => {
  const unlocked: string[] = []
  for (const unlock of UNLOCKS) {
    if (state.floor >= unlock.floor && unlockPiece(state.profile, unlock.kind)) {
      unlocked.push(unlock.kind)
    }
  }
  if (unlocked.length > 0) {
    state.message = `Unlocked ${unlocked.join(', ')} formations.`
  }
}

const advanceBoard = (state: GameState): void => {
  state.phase = 'scroll'
  for (const piece of state.pieces) {
    piece.y -= 1
  }
  for (const tile of state.specialTiles) {
    tile.y -= 1
  }

  const removed = state.pieces.filter((piece) => piece.y < 0)
  state.pieces = state.pieces.filter((piece) => piece.y >= 0)
  state.specialTiles = state.specialTiles.filter((tile) => tile.y >= 0)
  for (const piece of removed) {
    state.events.push({
      id: `e${state.stateRevision}-${piece.id}-removed`,
      type: 'unit_removed',
      atMs: state.serverTimeMs,
      pieceId: piece.id,
      label: 'scroll',
    })
  }

  state.floor += 1
  applyUnlocks(state)
  const formation = spawnFormation(state)
  spawnChestTile(state)
  state.events.push({
    id: `e${state.stateRevision}-floor-${state.floor}`,
    type: 'wave_phase_changed',
    atMs: state.serverTimeMs,
    label: formation,
  })
}

const alignMoveEventsAfterScroll = (state: GameState, fromEventIndex: number): void => {
  for (const event of state.events.slice(fromEventIndex)) {
    if (event.type === 'unit_moved') {
      if (event.from) {
        event.from = { ...event.from, y: event.from.y - 1 }
      }
      if (event.to) {
        event.to = { ...event.to, y: event.to.y - 1 }
      }
    }
    if (event.type === 'unit_captured' && event.to) {
      event.to = { ...event.to, y: event.to.y - 1 }
      if (event.capturedPiece) {
        event.capturedPiece = { ...event.capturedPiece, y: event.capturedPiece.y - 1 }
      }
    }
  }
}

export const crownSelectedPiece = (state: GameState): boolean => {
  const selected = getSelectedPiece(state)
  const oldHero = findHero(state)
  if (!selected || selected.side !== 'ally' || selected.heroic || selected.kind === 'stone') {
    return false
  }
  if (!oldHero) {
    selected.heroic = true
    selected.movesRemaining = null
    state.message = `${selected.kind} is now the heroic piece.`
    touchRevision(state)
    return true
  }

  oldHero.heroic = false
  oldHero.movesRemaining = 3 + state.profile.pieces[oldHero.kind as PlayableKind].level
  selected.heroic = true
  selected.movesRemaining = null
  state.message = `Crowned ${selected.kind}. The old hero has ${oldHero.movesRemaining} moves left.`
  touchRevision(state)
  return true
}

export const performPlayerMove = (state: GameState, destination: Coord): TurnResolution => {
  if (state.phase !== 'player') {
    return {
      moved: false,
      scrolled: false,
      enemyMoves: 0,
      enemyAnimationMs: ENEMY_MOVE_ANIMATION_MS,
      gameOver: state.phase === 'gameOver',
      message: state.message,
    }
  }

  const selected = getSelectedPiece(state)
  if (!selected) {
    return {
      moved: false,
      scrolled: false,
      enemyMoves: 0,
      enemyAnimationMs: ENEMY_MOVE_ANIMATION_MS,
      gameOver: false,
      message: 'Select an allied piece first.',
    }
  }

  const legalMoves = getLegalMoves(state.pieces, selected)
  if (!legalMoves.some((move) => coordsEqual(move, destination))) {
    state.message = 'That move is blocked.'
    return {
      moved: false,
      scrolled: false,
      enemyMoves: 0,
      enemyAnimationMs: ENEMY_MOVE_ANIMATION_MS,
      gameOver: false,
      message: state.message,
    }
  }

  const turnEventStart = state.events.length
  const heroicMovesAfterMove = selected.heroic ? state.heroicMovesSinceScroll + 1 : state.heroicMovesSinceScroll
  const shouldScroll = heroicMovesAfterMove >= HEROIC_MOVES_PER_SCROLL
  const { captured, expired, bonusMovesGained } = movePieceTo(state, selected, destination)
  const chestOutcome = selected.side === 'ally' ? openChestAt(state, destination) : null
  if (chestOutcome?.opened || chestOutcome?.blocked) {
    // openChestAt sets the player-facing message.
  } else if (captured?.side === 'enemy') {
    state.message =
      bonusMovesGained > 0
        ? `${selected.kind} captured ${captured.kind} and gained ${bonusMovesGained} moves.`
        : `${selected.kind} captured ${captured.kind}.`
  } else if (!expired && selected.kind !== 'stone') {
    state.message = `${selected.kind} advanced.`
  }
  state.selectedPieceId = null
  touchRevision(state)

  const enemyMoves = runEnemyTurn(state)
  let scrolled = false
  if (!isGameOver(state) && shouldScroll) {
    state.heroicMovesSinceScroll = 0
    advanceBoard(state)
    alignMoveEventsAfterScroll(state, turnEventStart)
    scrolled = true
    checkHeroRule(state)
  } else if (!isGameOver(state)) {
    state.heroicMovesSinceScroll = heroicMovesAfterMove
  }

  if (!isGameOver(state)) {
    state.phase = 'player'
    state.turn += 1
    state.cardPlayedThisTurn = false
    checkHeroRule(state)
    if (!scrolled && !isGameOver(state)) {
      const heroicMovesUntilScroll = HEROIC_MOVES_PER_SCROLL - state.heroicMovesSinceScroll
      state.message = `${state.message} Lift moves in ${heroicMovesUntilScroll} heroic move${heroicMovesUntilScroll === 1 ? '' : 's'}.`
    }
  }

  touchRevision(state)
  return {
    moved: true,
    scrolled,
    enemyMoves,
    enemyAnimationMs: ENEMY_MOVE_ANIMATION_MS,
    gameOver: isGameOver(state),
    message: state.message,
  }
}

const emptyCardResolution = (
  state: GameState,
  cardId: string | null,
  message: string,
): CardPlayResolution => {
  state.message = message
  return {
    moved: false,
    played: false,
    cardId,
    scrolled: false,
    enemyMoves: 0,
    enemyAnimationMs: ENEMY_MOVE_ANIMATION_MS,
    gameOver: state.phase === 'gameOver',
    message: state.message,
  }
}

const allBoardCoords = (): Coord[] => {
  const coords: Coord[] = []
  for (let y = 0; y < VISIBLE_ROWS; y += 1) {
    for (let x = 0; x < BOARD_COLUMNS; x += 1) {
      coords.push({ x, y })
    }
  }
  return coords
}

const isEmptySquare = (state: GameState, coord: Coord): boolean => {
  return (
    isInsideBoard(coord) &&
    !pieceAt(state.pieces, coord.x, coord.y) &&
    !specialTileAt(state.specialTiles, coord.x, coord.y)
  )
}

const cardTargetPiece = (state: GameState, coord: Coord | undefined): Piece | undefined => {
  return coord ? pieceAt(state.pieces, coord.x, coord.y) : undefined
}

const alliedTargetOptions = (state: GameState): Coord[] => {
  return state.pieces
    .filter((piece) => piece.side === 'ally' && piece.kind !== 'stone')
    .map((piece) => ({ x: piece.x, y: piece.y }))
}

const enemyTargetOptions = (state: GameState): Coord[] => {
  return state.pieces
    .filter((piece) => piece.side === 'enemy')
    .map((piece) => ({ x: piece.x, y: piece.y }))
}

const sacrificeSourceOptions = (state: GameState): Coord[] => {
  return state.pieces
    .filter((piece) => piece.side === 'ally' && !piece.heroic && piece.kind !== 'stone')
    .map((piece) => ({ x: piece.x, y: piece.y }))
}

const diagonalStrikeSourceOptions = (state: GameState): Coord[] => {
  return state.pieces
    .filter((piece) => piece.side === 'ally' && (piece.kind === 'bishop' || piece.kind === 'queen'))
    .map((piece) => ({ x: piece.x, y: piece.y }))
}

const adjacentEnemyOptions = (state: GameState, source: Piece): Coord[] => {
  const options: Coord[] = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue
      }
      const coord = { x: source.x + dx, y: source.y + dy }
      const target = cardTargetPiece(state, coord)
      if (target?.side === 'enemy') {
        options.push(coord)
      }
    }
  }
  return options
}

const diagonalEnemyOptions = (state: GameState, source: Piece): Coord[] => {
  const options: Coord[] = []
  for (const direction of [
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: -1 },
  ]) {
    let coord = { x: source.x + direction.x, y: source.y + direction.y }
    while (isInsideBoard(coord)) {
      const target = cardTargetPiece(state, coord)
      if (target) {
        if (target.side === 'enemy') {
          options.push(coord)
        }
        break
      }
      coord = { x: coord.x + direction.x, y: coord.y + direction.y }
    }
  }
  return options
}

export const getCardTargetOptions = (
  state: GameState,
  cardInstanceId: string | null,
  selectedTargets: Coord[] = [],
): Coord[] => {
  if (state.phase !== 'player' || state.cardPlayedThisTurn || !cardInstanceId) {
    return []
  }

  const card = state.cardHand.find((entry) => entry.instanceId === cardInstanceId)
  if (!card || !isSupportedCardId(card.definitionId)) {
    return []
  }

  const firstTarget = selectedTargets[0]
  const firstPiece = cardTargetPiece(state, firstTarget)

  switch (card.definitionId) {
    case 'destroy_target_piece':
      return selectedTargets.length === 0 ? enemyTargetOptions(state) : []
    case 'teleport_piece':
      if (selectedTargets.length === 0) {
        return alliedTargetOptions(state)
      }
      return firstPiece?.side === 'ally' ? allBoardCoords().filter((coord) => isEmptySquare(state, coord)) : []
    case 'swap_places':
      if (selectedTargets.length === 0) {
        return alliedTargetOptions(state)
      }
      return firstPiece?.side === 'ally'
        ? alliedTargetOptions(state).filter((coord) => !coordsEqual(coord, firstTarget))
        : []
    case 'diagonal_strike':
      if (selectedTargets.length === 0) {
        return diagonalStrikeSourceOptions(state)
      }
      return firstPiece?.side === 'ally' && (firstPiece.kind === 'bishop' || firstPiece.kind === 'queen')
        ? diagonalEnemyOptions(state, firstPiece)
        : []
    case 'sacrifice_pact':
      if (selectedTargets.length === 0) {
        return sacrificeSourceOptions(state)
      }
      return firstPiece?.side === 'ally' && !firstPiece.heroic ? adjacentEnemyOptions(state, firstPiece) : []
  }
}

const moveWithoutCapture = (state: GameState, piece: Piece, destination: Coord): void => {
  const from = { x: piece.x, y: piece.y }
  piece.x = destination.x
  piece.y = destination.y
  pushEvent(state, piece, from, destination)
}

const applyCardEffect = (state: GameState, cardId: SupportedCardId, targets: Coord[]): string | null => {
  switch (cardId) {
    case 'destroy_target_piece': {
      const target = cardTargetPiece(state, targets[0])
      if (target?.side !== 'enemy') {
        return null
      }
      removePieceByIdWithEvent(state, target.id, 'card-destroy')
      return `Rupture destroyed ${target.kind}.`
    }
    case 'teleport_piece': {
      const source = cardTargetPiece(state, targets[0])
      const destination = targets[1]
      if (source?.side !== 'ally' || !destination || !isEmptySquare(state, destination)) {
        return null
      }
      moveWithoutCapture(state, source, destination)
      return `Blink moved ${source.kind}.`
    }
    case 'swap_places': {
      const first = cardTargetPiece(state, targets[0])
      const second = cardTargetPiece(state, targets[1])
      if (first?.side !== 'ally' || second?.side !== 'ally' || first.id === second.id) {
        return null
      }
      const firstFrom = { x: first.x, y: first.y }
      const secondFrom = { x: second.x, y: second.y }
      pushEvent(state, first, firstFrom, secondFrom)
      pushEvent(state, second, secondFrom, firstFrom)
      first.x = secondFrom.x
      first.y = secondFrom.y
      second.x = firstFrom.x
      second.y = firstFrom.y
      return `Swap Places exchanged ${first.kind} and ${second.kind}.`
    }
    case 'diagonal_strike': {
      const source = cardTargetPiece(state, targets[0])
      const target = cardTargetPiece(state, targets[1])
      if (
        source?.side !== 'ally' ||
        (source.kind !== 'bishop' && source.kind !== 'queen') ||
        target?.side !== 'enemy' ||
        !diagonalEnemyOptions(state, source).some((coord) => coordsEqual(coord, target))
      ) {
        return null
      }
      removePieceByIdWithEvent(state, target.id, 'card-diagonal')
      return `Diagonal Strike destroyed ${target.kind}.`
    }
    case 'sacrifice_pact': {
      const source = cardTargetPiece(state, targets[0])
      const target = cardTargetPiece(state, targets[1])
      if (
        source?.side !== 'ally' ||
        source.heroic ||
        target?.side !== 'enemy' ||
        !adjacentEnemyOptions(state, source).some((coord) => coordsEqual(coord, target))
      ) {
        return null
      }
      removePieceByIdWithEvent(state, source.id, 'card-sacrifice')
      removePieceByIdWithEvent(state, target.id, 'card-sacrifice')
      return `Sacrifice Pact traded ${source.kind} for ${target.kind}.`
    }
  }
}

export const playCard = (
  state: GameState,
  cardInstanceId: string,
  targets: Coord[],
): CardPlayResolution => {
  if (state.phase !== 'player') {
    return emptyCardResolution(state, null, state.message)
  }
  if (state.cardPlayedThisTurn) {
    return emptyCardResolution(state, null, 'One card can be played each turn. Move a piece to continue.')
  }

  const cardIndex = state.cardHand.findIndex((card) => card.instanceId === cardInstanceId)
  const card = state.cardHand[cardIndex]
  if (!card) {
    return emptyCardResolution(state, null, 'Select a card first.')
  }
  if (!isSupportedCardId(card.definitionId)) {
    return emptyCardResolution(state, card.definitionId, `${formatCardName(card.definitionId)} is not ready yet.`)
  }

  const message = applyCardEffect(state, card.definitionId, targets)
  if (!message) {
    return emptyCardResolution(state, card.definitionId, 'Choose valid card targets.')
  }

  state.cardHand.splice(cardIndex, 1)
  state.selectedPieceId = null
  state.cardPlayedThisTurn = true
  state.message = message
  touchRevision(state)
  checkHeroRule(state)

  return {
    moved: false,
    played: true,
    cardId: card.definitionId,
    scrolled: false,
    enemyMoves: 0,
    enemyAnimationMs: ENEMY_MOVE_ANIMATION_MS,
    gameOver: isGameOver(state),
    message: state.message,
  }
}

export const pieceLabel = (piece: Piece): string => {
  const hero = piece.heroic ? ' heroic' : ''
  const moves = piece.movesRemaining === null ? '' : ` ${piece.movesRemaining}`
  const modifiers = piece.modifiers.length > 0 ? ` ${piece.modifiers.join('+')}` : ''
  return `${piece.side} ${piece.kind}${hero}${moves}${modifiers}`
}

export const unlockedKinds = (profile: Profile): PlayableKind[] => {
  return PLAYABLE_KINDS.filter((kind) => profile.pieces[kind].unlocked)
}
