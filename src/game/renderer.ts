import type { GameAssets } from './assets.ts'
import { coordsEqual } from './rules.ts'
import {
  BOARD_COLUMNS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  HEROIC_MOVES_PER_SCROLL,
  HUD_HEIGHT,
  PIECE_SHEET_ORDER,
  SCENE_ROWS,
  TILE_SIZE,
  VISIBLE_ROWS,
  VISUAL_GUTTER_ROWS,
  WALL_WIDTH,
  type Coord,
  type GameState,
  type Piece,
  type PlayableKind,
} from './types.ts'

const boardLeft = WALL_WIDTH
const boardTop = HUD_HEIGHT + VISUAL_GUTTER_ROWS * TILE_SIZE
const boardWidth = BOARD_COLUMNS * TILE_SIZE
const boardHeight = VISIBLE_ROWS * TILE_SIZE
const sceneTop = boardTop - VISUAL_GUTTER_ROWS * TILE_SIZE
const sceneHeight = SCENE_ROWS * TILE_SIZE
const sceneBottom = sceneTop + sceneHeight

interface FogLayer {
  alphaMax: number
  alphaMin: number
  driftX: number
  driftY: number
  opacitySpeed: number
  phase: number
  scale: number
}

const fogLayers: FogLayer[] = [
  { alphaMin: 0.035, alphaMax: 0.1, driftX: 0.012, driftY: -0.004, opacitySpeed: 0.0011, phase: 0.3, scale: 1 },
  { alphaMin: 0.025, alphaMax: 0.075, driftX: -0.008, driftY: 0.01, opacitySpeed: 0.0008, phase: 2.1, scale: 1.55 },
  { alphaMin: 0.018, alphaMax: 0.055, driftX: 0.004, driftY: 0.017, opacitySpeed: 0.0015, phase: 4.4, scale: 2.2 },
]

export interface DragPreview {
  pieceId: string
  pointer: Coord
}

export interface CardTargetPreview {
  options: Coord[]
  selected: Coord[]
}

export interface PreMovePreview {
  from: Coord
  to: Coord
}

export class GameRenderer {
  private readonly context: CanvasRenderingContext2D
  private shakeUntil = 0
  private scrollStartedAt = -1000

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly assets: GameAssets,
  ) {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is not available.')
    }
    this.context = context
    this.canvas.width = CANVAS_WIDTH
    this.canvas.height = CANVAS_HEIGHT
  }

  triggerScroll(now = performance.now()): void {
    this.shakeUntil = now + 280
    this.scrollStartedAt = now
  }

  toCanvasPoint(clientX: number, clientY: number): Coord {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    }
  }

  hitTest(clientX: number, clientY: number): Coord | null {
    const { x: logicalX, y: logicalY } = this.toCanvasPoint(clientX, clientY)
    if (
      logicalX < boardLeft ||
      logicalX >= boardLeft + boardWidth ||
      logicalY < boardTop ||
      logicalY >= boardTop + boardHeight
    ) {
      return null
    }

    const x = Math.floor((logicalX - boardLeft) / TILE_SIZE)
    const topRow = Math.floor((logicalY - boardTop) / TILE_SIZE)
    return { x, y: VISIBLE_ROWS - 1 - topRow }
  }

  render(
    state: GameState,
    legalMoves: Coord[],
    now = performance.now(),
    dragPreview?: DragPreview,
    cardTargetPreview?: CardTargetPreview,
    preMovePreview?: PreMovePreview,
  ): void {
    const ctx = this.context
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#11151d'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const shake = this.shakeUntil > now ? Math.sin(now * 0.09) * 5 : 0
    ctx.translate(shake, 0)

    const scrollOffset = this.scrollOffset(now)
    this.drawWalls(state, scrollOffset)
    this.drawBoard(state, scrollOffset)
    this.drawSpecialTiles(state, scrollOffset)
    this.drawHighlights(state, legalMoves, scrollOffset, cardTargetPreview, preMovePreview)
    this.drawPieces(state, scrollOffset, dragPreview)
    this.drawFog(state, now, scrollOffset)
    this.drawSceneFades()
    this.drawHud(state)
    this.drawFooter(state)

    if (state.phase === 'gameOver') {
      this.drawGameOver(state)
    }

    ctx.restore()
  }

  private scrollOffset(now: number): number {
    const elapsed = now - this.scrollStartedAt
    if (elapsed < 0 || elapsed > 260) {
      return 0
    }
    const t = 1 - elapsed / 260
    return t * TILE_SIZE
  }

  private drawWalls(state: GameState, scrollOffset: number): void {
    const ctx = this.context
    const palette = ['#29313c', '#3c4654', '#596371', '#202833']
    const mortar = '#111821'
    const offset = (state.floor * 11 + scrollOffset * 0.35) % 32
    for (const sideX of [0, boardLeft + boardWidth]) {
      ctx.fillStyle = '#171d26'
      ctx.fillRect(sideX, sceneTop - 16, WALL_WIDTH, sceneHeight + 40)
      for (let y = sceneTop - 32 - offset; y < CANVAS_HEIGHT; y += 32) {
        for (let x = sideX; x < sideX + WALL_WIDTH; x += 32) {
          const stagger = Math.floor((y + state.floor * 3) / 32) % 2 === 0 ? 0 : 16
          const blockX = x + stagger - 16
          ctx.fillStyle = mortar
          ctx.fillRect(blockX, y, 31, 31)
          ctx.fillStyle = palette[Math.abs(Math.floor(blockX / 16 + y / 32)) % palette.length] ?? '#3c4654'
          ctx.fillRect(blockX + 2, y + 2, 27, 27)
        }
      }
      ctx.fillStyle = 'rgba(8, 11, 16, 0.36)'
      ctx.fillRect(sideX, sceneTop - 16, WALL_WIDTH, sceneHeight + 40)
    }
  }

  private drawBoard(state: GameState, scrollOffset: number): void {
    const ctx = this.context
    ctx.save()
    ctx.beginPath()
    ctx.rect(boardLeft, sceneTop, boardWidth, sceneHeight)
    ctx.clip()

    for (let y = -VISUAL_GUTTER_ROWS - 1; y < VISIBLE_ROWS + VISUAL_GUTTER_ROWS + 1; y += 1) {
      for (let x = 0; x < BOARD_COLUMNS; x += 1) {
        const boardY = VISIBLE_ROWS - 1 - y
        const tileIndex = (x + boardY + state.floor) % 2 === 0 ? 0 : 1
        ctx.drawImage(
          this.assets.tiles,
          tileIndex * TILE_SIZE,
          0,
          TILE_SIZE,
          TILE_SIZE,
          boardLeft + x * TILE_SIZE,
          boardTop + y * TILE_SIZE + scrollOffset,
          TILE_SIZE,
          TILE_SIZE,
        )
      }
    }

    ctx.restore()
    ctx.strokeStyle = '#c9b67d'
    ctx.lineWidth = 2
    ctx.strokeRect(boardLeft, boardTop, boardWidth, boardHeight)
  }

  private drawSpecialTiles(state: GameState, scrollOffset: number): void {
    const ctx = this.context
    ctx.save()
    ctx.beginPath()
    ctx.rect(boardLeft, boardTop, boardWidth, boardHeight)
    ctx.clip()

    for (const tile of state.specialTiles) {
      if (tile.kind !== 'chest') {
        continue
      }
      const image = tile.state === 'open' ? this.assets.chestOpen : this.assets.chestClosed
      const { x, y } = this.cellTopLeft(tile, scrollOffset)
      ctx.drawImage(image, x + 6, y + 15, TILE_SIZE - 12, 34)
      ctx.strokeStyle = 'rgba(255, 225, 142, 0.72)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 7, y + 14, TILE_SIZE - 14, 36)
    }

    ctx.restore()
  }

  private drawHighlights(
    state: GameState,
    legalMoves: Coord[],
    scrollOffset: number,
    cardTargetPreview?: CardTargetPreview,
    preMovePreview?: PreMovePreview,
  ): void {
    const ctx = this.context
    const selected = state.selectedPieceId ? state.pieces.find((piece) => piece.id === state.selectedPieceId) : undefined
    ctx.save()
    ctx.beginPath()
    ctx.rect(boardLeft, boardTop, boardWidth, boardHeight)
    ctx.clip()

    for (const move of legalMoves) {
      const target = state.pieces.find((piece) => coordsEqual(piece, move))
      const { x, y } = this.cellTopLeft(move, scrollOffset)
      ctx.fillStyle = target ? 'rgba(190, 74, 65, 0.42)' : 'rgba(85, 166, 118, 0.38)'
      ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16)
    }

    if (cardTargetPreview) {
      for (const option of cardTargetPreview.options) {
        const { x, y } = this.cellTopLeft(option, scrollOffset)
        ctx.fillStyle = 'rgba(88, 151, 218, 0.36)'
        ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12)
        ctx.strokeStyle = 'rgba(190, 226, 255, 0.76)'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16)
      }

      for (const target of cardTargetPreview.selected) {
        const { x, y } = this.cellTopLeft(target, scrollOffset)
        ctx.strokeStyle = '#fff4b5'
        ctx.lineWidth = 4
        ctx.strokeRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6)
      }
    }

    if (preMovePreview) {
      const from = this.cellTopLeft(preMovePreview.from, scrollOffset)
      const to = this.cellTopLeft(preMovePreview.to, scrollOffset)
      ctx.fillStyle = 'rgba(98, 194, 214, 0.32)'
      ctx.fillRect(to.x + 8, to.y + 8, TILE_SIZE - 16, TILE_SIZE - 16)
      ctx.strokeStyle = '#9fe8f2'
      ctx.lineWidth = 3
      ctx.strokeRect(from.x + 6, from.y + 6, TILE_SIZE - 12, TILE_SIZE - 12)
      ctx.strokeRect(to.x + 4, to.y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
      ctx.beginPath()
      ctx.moveTo(from.x + TILE_SIZE / 2, from.y + TILE_SIZE / 2)
      ctx.lineTo(to.x + TILE_SIZE / 2, to.y + TILE_SIZE / 2)
      ctx.stroke()
    }

    if (selected) {
      const { x, y } = this.cellTopLeft(selected, scrollOffset)
      ctx.strokeStyle = '#f2d36b'
      ctx.lineWidth = 4
      ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8)
    }

    ctx.restore()
  }

  private drawPieces(state: GameState, scrollOffset: number, dragPreview?: DragPreview): void {
    const ctx = this.context
    ctx.save()
    ctx.beginPath()
    ctx.rect(boardLeft, sceneTop, boardWidth, sceneHeight)
    ctx.clip()

    const sorted = [...state.pieces].sort((a, b) => b.y - a.y)
    for (const piece of sorted) {
      if (piece.id === dragPreview?.pieceId) {
        continue
      }
      const { x, y } = this.visualTopLeft(state, piece, scrollOffset)
      this.drawPiece(piece, x, y)
    }
    this.drawCapturedPieces(state, scrollOffset)

    const draggedPiece = dragPreview
      ? state.pieces.find((piece) => piece.id === dragPreview.pieceId)
      : undefined
    if (dragPreview && draggedPiece) {
      ctx.save()
      ctx.globalAlpha = 0.94
      this.drawPiece(
        draggedPiece,
        Math.round(dragPreview.pointer.x - TILE_SIZE / 2),
        Math.round(dragPreview.pointer.y - TILE_SIZE / 2),
      )
      ctx.restore()
    }

    ctx.restore()
  }

  private drawFog(state: GameState, now: number, scrollOffset: number): void {
    const ctx = this.context
    const texture = this.assets.noiseTexture
    const floorDrift = state.floor * 17 + scrollOffset * 0.3
    ctx.save()
    ctx.beginPath()
    ctx.rect(boardLeft, sceneTop, boardWidth, sceneHeight)
    ctx.clip()
    ctx.globalCompositeOperation = 'screen'

    for (const layer of fogLayers) {
      const wave = 0.5 + Math.sin(now * layer.opacitySpeed + layer.phase) * 0.5
      ctx.globalAlpha = layer.alphaMin + (layer.alphaMax - layer.alphaMin) * wave
      this.drawNoiseLayer(
        texture,
        now * layer.driftX + floorDrift,
        now * layer.driftY - floorDrift,
        layer.scale,
      )
    }

    ctx.restore()
  }

  private drawNoiseLayer(texture: HTMLImageElement, offsetX: number, offsetY: number, scale: number): void {
    const ctx = this.context
    const width = Math.max(1, texture.width * scale)
    const height = Math.max(1, texture.height * scale)
    const normalizedX = ((offsetX % width) + width) % width
    const normalizedY = ((offsetY % height) + height) % height
    const startX = boardLeft - normalizedX
    const startY = sceneTop - normalizedY

    for (let y = startY; y < sceneBottom; y += height) {
      for (let x = startX; x < boardLeft + boardWidth; x += width) {
        ctx.drawImage(texture, x, y, width, height)
      }
    }
  }

  private drawSceneFades(): void {
    const ctx = this.context
    const topFade = ctx.createLinearGradient(0, sceneTop, 0, boardTop + TILE_SIZE * 0.75)
    topFade.addColorStop(0, 'rgba(5, 7, 11, 0.96)')
    topFade.addColorStop(0.5, 'rgba(5, 7, 11, 0.56)')
    topFade.addColorStop(1, 'rgba(5, 7, 11, 0)')

    ctx.fillStyle = topFade
    ctx.fillRect(boardLeft, sceneTop, boardWidth, TILE_SIZE * 1.75)

    const bottomFade = ctx.createLinearGradient(0, boardTop + boardHeight - TILE_SIZE * 0.25, 0, sceneBottom)
    bottomFade.addColorStop(0, 'rgba(5, 7, 11, 0)')
    bottomFade.addColorStop(0.58, 'rgba(5, 7, 11, 0.58)')
    bottomFade.addColorStop(1, 'rgba(5, 7, 11, 0.96)')

    ctx.fillStyle = bottomFade
    ctx.fillRect(boardLeft, boardTop + boardHeight - TILE_SIZE * 0.25, boardWidth, TILE_SIZE * 1.25)
  }

  private drawPiece(piece: Piece, x: number, y: number): void {
    const ctx = this.context
    if (piece.kind === 'stone' || piece.side === 'stone') {
      this.drawStone(x, y)
      return
    }

    if (piece.side === 'ally' && piece.heroic) {
      this.drawHeroAura(x, y)
    }

    const sheet = piece.side === 'enemy' ? this.assets.enemySheet : this.assets.playerSheet
    const sourceX = PIECE_SHEET_ORDER[piece.kind as PlayableKind] * TILE_SIZE
    ctx.drawImage(sheet, sourceX, 0, TILE_SIZE, TILE_SIZE * 2, x, y - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2)

    if (piece.side === 'ally' && piece.heroic) {
      ctx.strokeStyle = '#f6e27b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 24, 0, Math.PI * 2)
      ctx.stroke()
    }

    if (piece.heroic) {
      ctx.drawImage(this.assets.crownOverlay, x, y - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2)
    }

    if (piece.movesRemaining !== null) {
      const badgeColor = piece.side === 'enemy' ? '#5b2430' : '#1d3f54'
      this.drawBadge(x + 39, y + 42, String(piece.movesRemaining), badgeColor)
    }
    if (piece.modifiers.includes('immobile')) {
      this.drawBadge(x + 38, y + 5, 'I', '#4a5363')
    }
  }

  private drawHeroAura(x: number, y: number): void {
    const ctx = this.context
    const centerX = x + TILE_SIZE / 2
    const centerY = y + TILE_SIZE / 2
    const aura = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 36)
    aura.addColorStop(0, 'rgba(255, 239, 137, 0.42)')
    aura.addColorStop(0.58, 'rgba(240, 180, 58, 0.22)')
    aura.addColorStop(1, 'rgba(240, 180, 58, 0)')
    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.arc(centerX, centerY, 36, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 229, 103, 0.72)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2)
    ctx.stroke()
  }

  private drawStone(x: number, y: number): void {
    const ctx = this.context
    ctx.fillStyle = '#3f4752'
    ctx.fillRect(x + 7, y + 9, TILE_SIZE - 14, TILE_SIZE - 13)
    ctx.fillStyle = '#687382'
    ctx.fillRect(x + 12, y + 14, TILE_SIZE - 24, 9)
    ctx.strokeStyle = '#1d2530'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + 20, y + 23)
    ctx.lineTo(x + 29, y + 35)
    ctx.lineTo(x + 25, y + 49)
    ctx.moveTo(x + 42, y + 18)
    ctx.lineTo(x + 37, y + 31)
    ctx.lineTo(x + 47, y + 45)
    ctx.stroke()
  }

  private drawCapturedPieces(state: GameState, scrollOffset: number): void {
    const ctx = this.context
    const now = Date.now()
    for (const event of state.events) {
      if (event.type !== 'unit_captured' || !event.capturedPiece || !event.to) {
        continue
      }

      const duration = event.durationMs ?? 0
      const elapsed = now - event.atMs
      if (duration <= 0 || elapsed < 0 || elapsed >= duration) {
        continue
      }

      const progress = Math.min(1, Math.max(0, elapsed / duration))
      const eased = 1 - Math.pow(1 - progress, 3)
      const { x, y } = this.cellTopLeft(event.to, scrollOffset)
      const direction = event.capturedPiece.side === 'enemy' ? -1 : 1

      ctx.save()
      ctx.globalAlpha = 1 - progress
      ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2 + eased * 10)
      ctx.rotate(direction * eased * Math.PI * 0.48)
      this.drawPiece(event.capturedPiece, -TILE_SIZE / 2, -TILE_SIZE / 2)
      ctx.restore()
    }
  }

  private drawBadge(x: number, y: number, text: string, background: string): void {
    const ctx = this.context
    ctx.fillStyle = background
    ctx.fillRect(x, y, 22, 17)
    ctx.strokeStyle = '#f2dfb6'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, 22, 17)
    ctx.fillStyle = '#fff5d8'
    ctx.font = 'bold 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + 11, y + 9)
  }

  private drawHud(state: GameState): void {
    const ctx = this.context
    ctx.fillStyle = '#111821'
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT)
    ctx.fillStyle = '#202834'
    ctx.fillRect(0, HUD_HEIGHT - 12, CANVAS_WIDTH, 12)
    ctx.drawImage(this.assets.hud, 0, 0, 64, 64, 18, 16, 48, 48)
    ctx.drawImage(this.assets.hud, 64, 0, 128, 64, 86, 16, 96, 48)
    ctx.drawImage(this.assets.hud, 256, 0, 64, 64, 436, 16, 48, 48)
    ctx.drawImage(this.assets.hud, 320, 0, 64, 64, 516, 16, 48, 48)

    ctx.fillStyle = '#f7ead1'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`Floor ${state.floor}`, 196, 18)
    ctx.fillText(`Turn ${state.turn}`, 196, 45)
    ctx.font = 'bold 14px system-ui, sans-serif'
    const untilLift = Math.max(1, HEROIC_MOVES_PER_SCROLL - state.heroicMovesSinceScroll)
    ctx.fillText(`Lift ${untilLift}`, 312, 49)
    ctx.textAlign = 'center'
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.fillText(String(state.profile.currency), 500, 28)
    ctx.fillText(String(state.profile.pieces.pawn.level), 580, 28)
  }

  private drawFooter(state: GameState): void {
    const ctx = this.context
    const y = sceneBottom
    ctx.fillStyle = '#151b24'
    ctx.fillRect(0, y, CANVAS_WIDTH, CANVAS_HEIGHT - y)
    ctx.fillStyle = '#d7c6a4'
    ctx.font = 'bold 18px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`Formation: ${state.lastFormation}`, 20, y + 18)
    ctx.fillStyle = '#93b7a1'
    ctx.fillText(`Revision ${state.stateRevision}`, 20, y + 48)
  }

  private drawGameOver(state: GameState): void {
    const ctx = this.context
    ctx.fillStyle = 'rgba(8, 10, 13, 0.72)'
    ctx.fillRect(boardLeft, boardTop + 170, BOARD_COLUMNS * TILE_SIZE, 150)
    ctx.strokeStyle = '#c66055'
    ctx.strokeRect(boardLeft + 14, boardTop + 184, BOARD_COLUMNS * TILE_SIZE - 28, 122)
    ctx.fillStyle = '#fff0d0'
    ctx.font = 'bold 31px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText('RUN ENDED', CANVAS_WIDTH / 2, boardTop + 205)
    ctx.font = 'bold 17px system-ui, sans-serif'
    ctx.fillText(state.gameOverReason ?? 'The tower closed.', CANVAS_WIDTH / 2, boardTop + 252)
  }

  private cellTopLeft(coord: Coord, scrollOffset: number): Coord {
    return {
      x: boardLeft + coord.x * TILE_SIZE,
      y: boardTop + (VISIBLE_ROWS - 1 - coord.y) * TILE_SIZE + scrollOffset,
    }
  }

  private visualTopLeft(state: GameState, piece: Piece, scrollOffset: number): Coord {
    const now = Date.now()
    for (let index = state.events.length - 1; index >= 0; index -= 1) {
      const event = state.events[index]
      if (
        event?.type !== 'unit_moved' ||
        event.pieceId !== piece.id ||
        event.side !== 'enemy' ||
        !event.from ||
        !event.to
      ) {
        continue
      }

      const duration = event.durationMs ?? 0
      const elapsed = now - event.atMs
      if (elapsed < 0 || elapsed >= duration) {
        continue
      }

      const progress = Math.min(1, Math.max(0, elapsed / duration))
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
      const from = this.cellTopLeft(event.from, scrollOffset)
      const to = this.cellTopLeft(event.to, scrollOffset)
      return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      }
    }

    return this.cellTopLeft(piece, scrollOffset)
  }
}
