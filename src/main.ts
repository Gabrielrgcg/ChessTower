import './styles.css'
import { cardById, isSupportedCardId, targetCountForCardId } from './game/cards.ts'
import { loadAssets } from './game/assets.ts'
import { TowerAudio } from './game/audio.ts'
import { buyUpgrade, loadProfile, saveProfile, upgradeCost } from './game/persistence.ts'
import { GameRenderer } from './game/renderer.ts'
import { coordsEqual, getLegalMoves, pieceAt } from './game/rules.ts'
import {
  createGame,
  crownSelectedPiece,
  getCardTargetOptions,
  getSelectedLegalMoves,
  getSelectedPiece,
  playCard,
  performPlayerMove,
  selectPieceAt,
} from './game/state.ts'
import {
  MAX_HAND_SIZE,
  PLAYABLE_KINDS,
  STARTING_HERO_KINDS,
  type CardDefinition,
  type Coord,
  type GameState,
  type Piece,
  type PlayableKind,
  type StartingHeroKind,
  type TurnResolution,
} from './game/types.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
const statusLine = document.querySelector<HTMLElement>('#status-line')
const cardHand = document.querySelector<HTMLElement>('#card-hand')
const newRunButton = document.querySelector<HTMLButtonElement>('#new-run')
const crownButton = document.querySelector<HTMLButtonElement>('#crown-piece')
const upgradeStrip = document.querySelector<HTMLElement>('#upgrade-strip')
const startingPieceButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-starting-kind]')]

if (
  !canvas ||
  !statusLine ||
  !cardHand ||
  !newRunButton ||
  !crownButton ||
  !upgradeStrip ||
  startingPieceButtons.length === 0
) {
  throw new Error('Required UI elements are missing.')
}

const audio = new TowerAudio()
let startingHeroKind: StartingHeroKind = 'pawn'
let state: GameState = createGame(loadProfile(), startingHeroKind)
let renderer: GameRenderer | null = null
let cardDefinitions: CardDefinition[] = []
let inputLockedUntil = 0
let lockTimer: number | undefined
let selectedCardInstanceId: string | null = null
let selectedCardTargets: Coord[] = []

interface PendingPreMove {
  pieceId: string
  from: Coord
  to: Coord
}

let pendingPreMove: PendingPreMove | null = null

interface DragInteraction {
  pointerId: number
  pieceId: string
  origin: Coord
  pointer: Coord
  legalMoves: Coord[]
  moved: boolean
}

const DRAG_MOVE_THRESHOLD = 5
let dragInteraction: DragInteraction | null = null

const save = (): void => {
  saveProfile(state.profile)
}

const formatKind = (kind: PlayableKind): string => {
  switch (kind) {
    case 'specialPawn':
      return 'Special pawn'
    default:
      return `${kind[0]?.toUpperCase() ?? ''}${kind.slice(1)}`
  }
}

const createCardArt = (definition: CardDefinition): HTMLElement => {
  const { sprite } = definition
  const art = document.createElement('span')
  art.className = 'card-art'
  art.style.setProperty('--sprite-width', String(sprite.width))
  art.style.setProperty('--sprite-height', String(sprite.height))
  art.style.setProperty('--sheet-columns', String(sprite.sheetWidth / sprite.width))
  art.style.setProperty('--sheet-rows', String(sprite.sheetHeight / sprite.height))
  art.style.setProperty('--sprite-column', String(sprite.x / sprite.width))
  art.style.setProperty('--sprite-row', String(sprite.y / sprite.height))

  const image = document.createElement('img')
  image.src = `/assets/sprites/${sprite.sheet}`
  image.alt = ''
  image.loading = 'lazy'
  image.decoding = 'async'
  image.setAttribute('aria-hidden', 'true')
  art.append(image)
  return art
}

const clearCardSelection = (): void => {
  selectedCardInstanceId = null
  selectedCardTargets = []
}

const isInputLocked = (): boolean => performance.now() < inputLockedUntil && state.phase !== 'gameOver'

const clearPendingPreMove = (): void => {
  pendingPreMove = null
}

const selectedCard = (): { instanceId: string; definitionId: string } | undefined => {
  return selectedCardInstanceId
    ? state.cardHand.find((card) => card.instanceId === selectedCardInstanceId)
    : undefined
}

const renderCardHand = (): void => {
  cardHand.innerHTML = ''
  const locked = isInputLocked() || state.phase !== 'player' || state.cardPlayedThisTurn

  for (let index = 0; index < MAX_HAND_SIZE; index += 1) {
    const card = state.cardHand[index]
    if (!card) {
      const empty = document.createElement('div')
      empty.className = 'card-slot is-empty'
      empty.textContent = 'Empty'
      cardHand.append(empty)
      continue
    }

    const definition = cardById(cardDefinitions, card.definitionId)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'card-slot'
    button.classList.toggle('is-selected', card.instanceId === selectedCardInstanceId)
    button.disabled = locked || !definition || !isSupportedCardId(card.definitionId)
    button.title = definition ? `${definition.name}: ${definition.effect}` : card.definitionId
    button.setAttribute('aria-pressed', String(card.instanceId === selectedCardInstanceId))
    button.setAttribute('aria-label', button.title)

    if (definition) {
      button.append(createCardArt(definition))

      const name = document.createElement('span')
      name.className = 'card-name'
      name.textContent = definition.name
      button.append(name)

      const effect = document.createElement('span')
      effect.className = 'card-effect'
      effect.textContent = definition.effect
      button.append(effect)
    } else {
      button.textContent = card.definitionId
    }

    button.addEventListener('click', () => {
      audio.unlock()
      if (button.disabled) {
        return
      }
      if (selectedCardInstanceId === card.instanceId) {
        clearCardSelection()
        state.message = 'Card canceled.'
      } else {
        state.selectedPieceId = null
        selectedCardInstanceId = card.instanceId
        selectedCardTargets = []
        state.message = definition ? `Choose target for ${definition.name}.` : 'Choose card target.'
      }
      syncUi()
      redraw()
    })

    cardHand.append(button)
  }
}

const isStartingHeroKind = (value: string | undefined): value is StartingHeroKind => {
  return STARTING_HERO_KINDS.includes(value as StartingHeroKind)
}

const renderStartingPieceChoice = (): void => {
  for (const button of startingPieceButtons) {
    const kind = button.dataset.startingKind
    const selected = kind === startingHeroKind
    button.disabled = isInputLocked()
    button.classList.toggle('is-selected', selected)
    button.setAttribute('aria-pressed', String(selected))
  }
}

const renderUpgrades = (): void => {
  upgradeStrip.innerHTML = ''
  for (const kind of PLAYABLE_KINDS) {
    const progress = state.profile.pieces[kind]
    const button = document.createElement('button')
    button.type = 'button'
    const cost = upgradeCost(state.profile, kind)
    button.textContent = progress.unlocked
      ? `${formatKind(kind)} Lv ${progress.level} - ${cost}`
      : `${formatKind(kind)} locked`
    button.disabled = isInputLocked() || !progress.unlocked || state.profile.currency < cost
    button.addEventListener('click', () => {
      audio.unlock()
      if (buyUpgrade(state.profile, kind)) {
        state.message = `${formatKind(kind)} upgraded.`
        save()
        syncUi()
      }
    })
    upgradeStrip.append(button)
  }
}

const syncUi = (): void => {
  const locked = isInputLocked()
  statusLine.textContent = state.message
  if (locked && pendingPreMove) {
    statusLine.textContent = 'Pre-move queued.'
  } else if (locked) {
    statusLine.textContent = 'Enemies are moving...'
  }
  const selected = getSelectedPiece(state)
  newRunButton.disabled = locked
  crownButton.disabled =
    locked ||
    Boolean(selectedCardInstanceId) ||
    !selected ||
    selected.side !== 'ally' ||
    selected.heroic ||
    selected.kind === 'stone'
  renderStartingPieceChoice()
  renderCardHand()
  renderUpgrades()
}

const redraw = (now = performance.now()): void => {
  const cardTargetOptions = selectedCardInstanceId
    ? getCardTargetOptions(state, selectedCardInstanceId, selectedCardTargets)
    : []
  renderer?.render(
    state,
    selectedCardInstanceId ? [] : getSelectedLegalMoves(state),
    now,
    dragInteraction ? { pieceId: dragInteraction.pieceId, pointer: dragInteraction.pointer } : undefined,
    selectedCardInstanceId ? { options: cardTargetOptions, selected: selectedCardTargets } : undefined,
    pendingPreMove ? { from: pendingPreMove.from, to: pendingPreMove.to } : undefined,
  )
}

const loop = (now: number): void => {
  redraw(now)
  requestAnimationFrame(loop)
}

const queuePreMove = (piece: Piece, destination: Coord): boolean => {
  if (!isInputLocked() || state.phase !== 'player' || piece.side !== 'ally') {
    return false
  }

  const currentPiece = state.pieces.find((candidate) => candidate.id === piece.id)
  if (!currentPiece || currentPiece.side !== 'ally') {
    clearPendingPreMove()
    state.selectedPieceId = null
    state.message = 'Pre-move canceled.'
    syncUi()
    redraw()
    return true
  }

  const legalMoves = getLegalMoves(state.pieces, currentPiece)
  if (!legalMoves.some((move) => coordsEqual(move, destination))) {
    clearPendingPreMove()
    state.selectedPieceId = null
    state.message = 'Pre-move canceled: that move is blocked.'
    syncUi()
    redraw()
    return true
  }

  clearCardSelection()
  state.selectedPieceId = currentPiece.id
  pendingPreMove = {
    pieceId: currentPiece.id,
    from: { x: currentPiece.x, y: currentPiece.y },
    to: { ...destination },
  }
  state.message = `${currentPiece.kind} pre-move queued.`
  syncUi()
  redraw()
  return true
}

const resolvePendingPreMove = (): void => {
  const queued = pendingPreMove
  if (!queued) {
    syncUi()
    redraw()
    return
  }

  clearPendingPreMove()
  const piece = state.pieces.find((candidate) => candidate.id === queued.pieceId)
  if (!piece || piece.side !== 'ally' || state.phase !== 'player') {
    state.selectedPieceId = null
    state.message = 'Pre-move canceled: board position changed.'
    syncUi()
    redraw()
    return
  }

  const legalMoves = getLegalMoves(state.pieces, piece)
  if (!legalMoves.some((move) => coordsEqual(move, queued.to))) {
    state.selectedPieceId = null
    state.message = 'Pre-move canceled: that move is blocked.'
    syncUi()
    redraw()
    return
  }

  state.selectedPieceId = piece.id
  const resolution = performPlayerMove(state, queued.to)
  applyTurnResolution(resolution)
}

const applyTurnResolution = (resolution: TurnResolution): void => {
  if (resolution.scrolled) {
    renderer?.triggerScroll()
    audio.playScrollClank()
  }
  if (resolution.enemyMoves > 0 && !resolution.gameOver) {
    inputLockedUntil = performance.now() + resolution.enemyAnimationMs
    window.clearTimeout(lockTimer)
    lockTimer = window.setTimeout(() => {
      inputLockedUntil = 0
      resolvePendingPreMove()
    }, resolution.enemyAnimationMs)
  }
  save()
  syncUi()
  redraw()
}

const finishPlayerMove = (destination: Coord): void => {
  if (!renderer) {
    return
  }

  clearPendingPreMove()
  const resolution = performPlayerMove(state, destination)
  applyTurnResolution(resolution)
}

const clearDragInteraction = (): void => {
  if (dragInteraction && canvas.hasPointerCapture(dragInteraction.pointerId)) {
    canvas.releasePointerCapture(dragInteraction.pointerId)
  }
  dragInteraction = null
  canvas.classList.remove('is-dragging')
}

const beginDragInteraction = (event: PointerEvent, origin: Coord): void => {
  if (!renderer || !selectPieceAt(state, origin)) {
    return
  }

  const selected = getSelectedPiece(state)
  if (!selected) {
    return
  }

  dragInteraction = {
    pointerId: event.pointerId,
    pieceId: selected.id,
    origin,
    pointer: renderer.toCanvasPoint(event.clientX, event.clientY),
    legalMoves: getSelectedLegalMoves(state),
    moved: false,
  }
  canvas.setPointerCapture(event.pointerId)
  canvas.classList.add('is-dragging')
  syncUi()
  redraw()
}

const resolveSelectedCardTarget = (coord: Coord): boolean => {
  const card = selectedCard()
  if (!card || !selectedCardInstanceId || !isSupportedCardId(card.definitionId)) {
    clearCardSelection()
    return false
  }

  const options = getCardTargetOptions(state, selectedCardInstanceId, selectedCardTargets)
  if (!options.some((option) => coordsEqual(option, coord))) {
    state.message = 'Choose a highlighted card target.'
    syncUi()
    redraw()
    return true
  }

  selectedCardTargets.push(coord)
  const requiredTargets = targetCountForCardId(card.definitionId)
  if (selectedCardTargets.length >= requiredTargets) {
    const resolution = playCard(state, selectedCardInstanceId, selectedCardTargets)
    if (resolution.played) {
      clearCardSelection()
    }
    applyTurnResolution(resolution)
    return true
  }

  const nextOptions = getCardTargetOptions(state, selectedCardInstanceId, selectedCardTargets)
  if (nextOptions.length === 0) {
    selectedCardTargets = []
    state.message = 'No valid follow-up target.'
  } else {
    state.message = 'Choose next card target.'
  }
  syncUi()
  redraw()
  return true
}

canvas.addEventListener('pointerdown', (event) => {
  audio.unlock()
  if (!renderer || dragInteraction || state.phase === 'gameOver') {
    return
  }

  const coord = renderer.hitTest(event.clientX, event.clientY)
  if (!coord) {
    return
  }

  const locked = isInputLocked()
  if (locked) {
    const legalMoves = getSelectedLegalMoves(state)
    const selected = getSelectedPiece(state)
    if (selected && legalMoves.some((move) => coordsEqual(move, coord))) {
      queuePreMove(selected, coord)
      return
    }

    const pressedPiece = pieceAt(state.pieces, coord.x, coord.y)
    if (pressedPiece?.side === 'ally') {
      beginDragInteraction(event, coord)
      return
    }

    clearPendingPreMove()
    selectPieceAt(state, coord)
    state.message = state.selectedPieceId ? state.message : 'Pre-move canceled.'
    syncUi()
    redraw()
    return
  }

  if (selectedCardInstanceId && resolveSelectedCardTarget(coord)) {
    return
  }

  const legalMoves = getSelectedLegalMoves(state)
  const selected = getSelectedPiece(state)
  if (selected && legalMoves.some((move) => coordsEqual(move, coord))) {
    finishPlayerMove(coord)
    return
  }

  const pressedPiece = pieceAt(state.pieces, coord.x, coord.y)
  if (pressedPiece?.side === 'ally') {
    beginDragInteraction(event, coord)
    return
  }

  selectPieceAt(state, coord)
  syncUi()
  redraw()
})

canvas.addEventListener('pointermove', (event) => {
  if (!renderer || dragInteraction?.pointerId !== event.pointerId) {
    return
  }

  const pointer = renderer.toCanvasPoint(event.clientX, event.clientY)
  const deltaX = pointer.x - dragInteraction.pointer.x
  const deltaY = pointer.y - dragInteraction.pointer.y
  dragInteraction.pointer = pointer
  dragInteraction.moved =
    dragInteraction.moved || Math.hypot(deltaX, deltaY) >= DRAG_MOVE_THRESHOLD
  redraw()
})

canvas.addEventListener('pointerup', (event) => {
  if (!renderer || dragInteraction?.pointerId !== event.pointerId) {
    return
  }

  const drag = dragInteraction
  const releaseCoord = renderer.hitTest(event.clientX, event.clientY)
  const releasedOnLegalMove = releaseCoord
    ? drag.legalMoves.some((move) => coordsEqual(move, releaseCoord))
    : false
  clearDragInteraction()

  if (releaseCoord && releasedOnLegalMove && (drag.moved || !coordsEqual(drag.origin, releaseCoord))) {
    if (isInputLocked()) {
      const piece = state.pieces.find((candidate) => candidate.id === drag.pieceId)
      if (piece) {
        queuePreMove(piece, releaseCoord)
      }
      return
    }
    finishPlayerMove(releaseCoord)
    return
  }

  syncUi()
  redraw()
})

canvas.addEventListener('pointercancel', () => {
  clearDragInteraction()
  syncUi()
  redraw()
})

const startNewRun = (): void => {
  audio.unlock()
  if (isInputLocked()) {
    return
  }
  inputLockedUntil = 0
  window.clearTimeout(lockTimer)
  clearCardSelection()
  clearPendingPreMove()
  state = createGame(state.profile, startingHeroKind)
  save()
  syncUi()
  redraw()
}

newRunButton.addEventListener('click', () => {
  startNewRun()
})

for (const button of startingPieceButtons) {
  button.addEventListener('click', () => {
    const kind = button.dataset.startingKind
    if (!isStartingHeroKind(kind)) {
      return
    }
    startingHeroKind = kind
    startNewRun()
  })
}

crownButton.addEventListener('click', () => {
  audio.unlock()
  if (isInputLocked()) {
    return
  }
  if (crownSelectedPiece(state)) {
    save()
    syncUi()
    redraw()
  }
})

loadAssets()
  .then((assets) => {
    cardDefinitions = assets.cardDefinitions
    renderer = new GameRenderer(canvas, assets)
    syncUi()
    requestAnimationFrame(loop)
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    statusLine.textContent = `Asset load failed: ${message}`
  })
