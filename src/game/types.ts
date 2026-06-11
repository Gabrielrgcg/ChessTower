export const TILE_SIZE = 64
export const BOARD_COLUMNS = 8
export const VISIBLE_ROWS = 10
export const VISUAL_GUTTER_ROWS = 1
export const SCENE_ROWS = VISIBLE_ROWS + VISUAL_GUTTER_ROWS * 2
export const HUD_HEIGHT = 96
export const WALL_WIDTH = 64
export const CANVAS_WIDTH = WALL_WIDTH * 2 + BOARD_COLUMNS * TILE_SIZE
export const CANVAS_HEIGHT = HUD_HEIGHT + SCENE_ROWS * TILE_SIZE + 96
export const HEROIC_MOVES_PER_SCROLL = 2
export const PLAYER_MOVE_ANIMATION_MS = 220
export const ENEMY_MOVE_ANIMATION_MS = 1500
export const CAPTURE_KNOCKOVER_ANIMATION_MS = 420
export const CAPTURE_MOVE_BONUS = 3
export const ENEMY_MIN_MOVES = 3
export const ENEMY_MAX_MOVES = 6
export const MAX_HAND_SIZE = 3

export const STARTING_HERO_KINDS = ['pawn', 'king'] as const
export const PLAYABLE_KINDS = ['king', 'queen', 'bishop', 'knight', 'rook', 'specialPawn', 'pawn'] as const
export const PIECE_KINDS = [...PLAYABLE_KINDS, 'stone'] as const
export const PIECE_SHEET_ORDER: Record<PlayableKind, number> = {
  king: 0,
  queen: 1,
  bishop: 2,
  knight: 3,
  rook: 4,
  specialPawn: 5,
  pawn: 6,
}

export type PlayableKind = (typeof PLAYABLE_KINDS)[number]
export type StartingHeroKind = (typeof STARTING_HERO_KINDS)[number]
export type PieceKind = (typeof PIECE_KINDS)[number]
export type Side = 'ally' | 'enemy' | 'stone'
export type EnemyModifier = 'immobile'
export type GamePhase = 'player' | 'enemy' | 'scroll' | 'gameOver'
export type VisualEventType =
  | 'unit_moved'
  | 'unit_spawned'
  | 'unit_removed'
  | 'unit_captured'
  | 'wave_phase_changed'
export type SpecialTileKind = 'chest'
export type SpecialTileState = 'closed' | 'open'

export interface Coord {
  x: number
  y: number
}

export interface Piece {
  id: string
  kind: PieceKind
  side: Side
  x: number
  y: number
  heroic: boolean
  movesRemaining: number | null
  modifiers: EnemyModifier[]
}

export interface PieceUpgradeState {
  unlocked: boolean
  level: number
}

export type PieceProgression = Record<PlayableKind, PieceUpgradeState>

export interface Profile {
  currency: number
  pieces: PieceProgression
}

export interface CardSpriteDefinition {
  sheet: string
  sheetWidth: number
  sheetHeight: number
  x: number
  y: number
  width: number
  height: number
}

export interface CardDefinition {
  id: string
  name: string
  effect: string
  sprite: CardSpriteDefinition
}

export interface CardInstance {
  instanceId: string
  definitionId: string
}

export interface SpecialTile {
  id: string
  kind: SpecialTileKind
  state: SpecialTileState
  x: number
  y: number
}

export interface VisualEvent {
  id: string
  type: VisualEventType
  atMs: number
  pieceId?: string
  capturedPiece?: Piece
  side?: Side
  from?: Coord
  to?: Coord
  label?: string
  durationMs?: number
}

export interface GameState {
  pieces: Piece[]
  specialTiles: SpecialTile[]
  cardHand: CardInstance[]
  cardPlayedThisTurn: boolean
  runSeed: number
  floor: number
  turn: number
  heroicMovesSinceScroll: number
  phase: GamePhase
  selectedPieceId: string | null
  profile: Profile
  message: string
  gameOverReason: string | null
  rewardClaimed: boolean
  nextPieceNumber: number
  nextCardNumber: number
  nextTileNumber: number
  stateRevision: number
  serverTimeMs: number
  events: VisualEvent[]
  lastFormation: string
}

export interface TurnResolution {
  moved: boolean
  scrolled: boolean
  enemyMoves: number
  enemyAnimationMs: number
  gameOver: boolean
  message: string
}

export interface CardPlayResolution extends TurnResolution {
  played: boolean
  cardId: string | null
}

export interface FormationPieceSpec {
  kind: PlayableKind
  side: 'ally' | 'enemy'
  x: number
  rowFromTop: number
  movesRemaining?: number
  modifiers?: EnemyModifier[]
}

export interface FormationTemplate {
  name: string
  minFloor: number
  mirrorable: boolean
  pieces: FormationPieceSpec[]
}
