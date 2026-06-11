import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { normalizeCardCatalog, supportedCardDefinitions } from '../src/game/cards.ts'
import { createDefaultProfile } from '../src/game/persistence.ts'
import {
  createGame,
  getCardTargetOptions,
  performPlayerMove,
  playCard,
  spawnChestTile,
  specialTileAt,
} from '../src/game/state.ts'
import { MAX_HAND_SIZE, VISIBLE_ROWS, type CardInstance, type GameState, type Piece, type SpecialTile } from '../src/game/types.ts'

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
  movesRemaining: null,
  modifiers: partial.modifiers ?? [],
})

const chest = (partial: Partial<SpecialTile>): SpecialTile => ({
  id: partial.id ?? 'chest',
  kind: 'chest',
  state: 'closed',
  x: partial.x ?? 0,
  y: partial.y ?? VISIBLE_ROWS - 1,
})

const card = (definitionId: string, instanceId = 'card'): CardInstance => ({
  instanceId,
  definitionId,
})

const cleanState = (): GameState => {
  const state = createGame(createDefaultProfile())
  state.pieces = []
  state.specialTiles = []
  state.cardHand = []
  state.cardPlayedThisTurn = false
  state.selectedPieceId = null
  state.phase = 'player'
  state.turn = 1
  state.heroicMovesSinceScroll = 0
  state.gameOverReason = null
  state.events = []
  return state
}

test('card catalog validates supported card sheet sprites from public assets', () => {
  const catalogUrl = new URL('../public/assets/sprites/chess_cards_pixel_art_two_sheets.json', import.meta.url)
  const catalog = normalizeCardCatalog(JSON.parse(fs.readFileSync(catalogUrl, 'utf8')))
  const supported = supportedCardDefinitions(catalog)

  assert.equal(supported.length, 5)
  assert.equal(catalog.back.id, 'card_back')
  for (const cardDefinition of [...catalog.cards, catalog.back]) {
    const sprite = cardDefinition.sprite
    assert.match(sprite.sheet, /^chess_cards_pixel_art_sheet_.*\.png$/u)
    assert.equal(fs.existsSync(new URL(`../public/assets/sprites/${sprite.sheet}`, import.meta.url)), true)
    assert.equal(sprite.width, 416)
    assert.equal(sprite.height, 496)
    assert.equal(sprite.sheetWidth, 1664)
    assert.equal(sprite.sheetHeight, 992)
    assert.equal(sprite.x % sprite.width, 0)
    assert.equal(sprite.y % sprite.height, 0)
    assert.equal(sprite.x + sprite.width <= sprite.sheetWidth, true)
    assert.equal(sprite.y + sprite.height <= sprite.sheetHeight, true)
  }
})

test('chests spawn only under the configured chance and use empty top-area tiles', () => {
  const state = cleanState()
  state.pieces = [ally({ id: 'blocker', x: 0, y: VISIBLE_ROWS - 1 })]

  assert.equal(spawnChestTile(state, 0.5), false)
  assert.equal(state.specialTiles.length, 0)
  assert.equal(spawnChestTile(state, 0.05), true)
  assert.equal(state.specialTiles.length, 1)

  const spawned = state.specialTiles[0]
  assert.ok(spawned)
  assert.equal(spawned.kind, 'chest')
  assert.equal(spawned.y >= VISIBLE_ROWS - 3, true)
  assert.equal(spawned.x === 0 && spawned.y === VISIBLE_ROWS - 1, false)
})

test('chest tiles scroll with the board and fall off-screen', () => {
  const state = cleanState()
  const hero = ally({ id: 'hero', x: 1, y: 1, heroic: true })
  state.pieces = [hero]
  state.specialTiles = [chest({ id: 'falling', x: 0, y: 0 })]
  state.heroicMovesSinceScroll = 1
  state.selectedPieceId = hero.id

  const result = performPlayerMove(state, { x: 1, y: 2 })

  assert.equal(result.scrolled, true)
  assert.equal(state.specialTiles.some((tile) => tile.id === 'falling'), false)
})

test('allied pieces open chests by landing on them and draw one card', () => {
  const state = cleanState()
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  state.pieces = [hero]
  state.specialTiles = [chest({ id: 'reward', x: 0, y: 2 })]
  state.selectedPieceId = hero.id

  const result = performPlayerMove(state, { x: 0, y: 2 })

  assert.equal(result.moved, true)
  assert.equal(state.cardHand.length, 1)
  assert.equal(specialTileAt(state.specialTiles, 0, 2), undefined)
  assert.match(state.message, /Opened chest/u)
})

test('full hands keep chest tiles closed when a piece lands on them', () => {
  const state = cleanState()
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  state.pieces = [hero]
  state.cardHand = [
    card('destroy_target_piece', 'c1'),
    card('teleport_piece', 'c2'),
    card('swap_places', 'c3'),
  ]
  state.specialTiles = [chest({ id: 'blocked', x: 0, y: 2 })]
  state.selectedPieceId = hero.id

  performPlayerMove(state, { x: 0, y: 2 })

  assert.equal(state.cardHand.length, MAX_HAND_SIZE)
  assert.equal(specialTileAt(state.specialTiles, 0, 2)?.state, 'closed')
  assert.match(state.message, /Hand full/u)
})

test('enemy pieces can land on chest tiles without granting cards', () => {
  const state = cleanState()
  const hero = ally({ id: 'hero', x: 0, y: 1, heroic: true })
  const pawn = enemy({ id: 'enemy-pawn', x: 4, y: 5 })
  state.pieces = [hero, pawn]
  state.specialTiles = [chest({ id: 'enemy-step', x: 4, y: 4 })]
  state.selectedPieceId = hero.id

  performPlayerMove(state, { x: 0, y: 2 })

  assert.equal(state.cardHand.length, 0)
  assert.equal(specialTileAt(state.specialTiles, 4, 4)?.id, 'enemy-step')
  assert.equal(pawn.y, 4)
})

test('destroy target card removes one enemy without consuming the player turn', () => {
  const state = cleanState()
  state.heroicMovesSinceScroll = 1
  state.pieces = [
    ally({ id: 'hero', x: 0, y: 0, heroic: true }),
    enemy({ id: 'target', x: 2, y: 2 }),
  ]
  state.cardHand = [card('destroy_target_piece')]

  const result = playCard(state, 'card', [{ x: 2, y: 2 }])

  assert.equal(result.played, true)
  assert.equal(result.enemyMoves, 0)
  assert.equal(state.turn, 1)
  assert.equal(state.phase, 'player')
  assert.equal(state.heroicMovesSinceScroll, 1)
  assert.equal(state.cardPlayedThisTurn, true)
  assert.equal(state.cardHand.length, 0)
  assert.equal(state.pieces.some((piece) => piece.id === 'target'), false)

  state.selectedPieceId = 'hero'
  const moveResult = performPlayerMove(state, { x: 0, y: 1 })

  assert.equal(moveResult.moved, true)
  assert.equal(moveResult.scrolled, true)
  assert.equal(state.turn, 2)
  assert.equal(state.cardPlayedThisTurn, false)
})

test('invalid card targets preserve the card and the turn', () => {
  const state = cleanState()
  state.pieces = [ally({ id: 'hero', x: 0, y: 0, heroic: true })]
  state.cardHand = [card('destroy_target_piece')]

  const result = playCard(state, 'card', [{ x: 0, y: 0 }])

  assert.equal(result.played, false)
  assert.equal(state.turn, 1)
  assert.equal(state.cardPlayedThisTurn, false)
  assert.equal(state.cardHand.length, 1)
})

test('only one card can be played before the next player move', () => {
  const state = cleanState()
  state.pieces = [
    ally({ id: 'hero', x: 0, y: 0, heroic: true }),
    enemy({ id: 'first-target', x: 2, y: 2 }),
    enemy({ id: 'second-target', kind: 'rook', x: 7, y: 8, modifiers: ['immobile'] }),
  ]
  state.cardHand = [
    card('destroy_target_piece', 'first-card'),
    card('destroy_target_piece', 'second-card'),
  ]

  const first = playCard(state, 'first-card', [{ x: 2, y: 2 }])
  const blocked = playCard(state, 'second-card', [{ x: 7, y: 8 }])

  assert.equal(first.played, true)
  assert.equal(blocked.played, false)
  assert.match(blocked.message, /One card/u)
  assert.equal(state.turn, 1)
  assert.equal(state.cardPlayedThisTurn, true)
  assert.equal(state.cardHand.length, 1)
  assert.equal(state.pieces.some((piece) => piece.id === 'second-target'), true)

  state.selectedPieceId = 'hero'
  const move = performPlayerMove(state, { x: 0, y: 1 })
  assert.equal(move.moved, true)
  assert.equal(state.cardPlayedThisTurn, false)

  const second = playCard(state, 'second-card', [{ x: 7, y: 8 }])
  assert.equal(second.played, true)
  assert.equal(state.pieces.some((piece) => piece.id === 'second-target'), false)
})

test('teleport card moves one allied piece to an empty square', () => {
  const state = cleanState()
  state.pieces = [ally({ id: 'hero', x: 0, y: 0, heroic: true })]
  state.cardHand = [card('teleport_piece')]

  const result = playCard(state, 'card', [
    { x: 0, y: 0 },
    { x: 3, y: 3 },
  ])

  assert.equal(result.played, true)
  assert.equal(state.pieces.find((piece) => piece.id === 'hero')?.x, 3)
  assert.equal(state.pieces.find((piece) => piece.id === 'hero')?.y, 3)
})

test('swap places card exchanges two allied pieces', () => {
  const state = cleanState()
  state.pieces = [
    ally({ id: 'hero', x: 0, y: 0, heroic: true }),
    ally({ id: 'finite', x: 2, y: 2, movesRemaining: 2 }),
  ]
  state.cardHand = [card('swap_places')]

  const result = playCard(state, 'card', [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
  ])

  assert.equal(result.played, true)
  assert.deepEqual(
    state.pieces.map((piece) => ({ id: piece.id, x: piece.x, y: piece.y })).sort((a, b) => a.id.localeCompare(b.id)),
    [
      { id: 'finite', x: 0, y: 0 },
      { id: 'hero', x: 2, y: 2 },
    ],
  )
})

test('diagonal strike destroys the first enemy on a selected diagonal', () => {
  const state = cleanState()
  state.pieces = [
    ally({ id: 'hero', x: 0, y: 0, heroic: true }),
    ally({ id: 'bishop', kind: 'bishop', x: 1, y: 1, movesRemaining: 2 }),
    enemy({ id: 'first', x: 3, y: 3 }),
    enemy({ id: 'second', x: 4, y: 4 }),
  ]
  state.cardHand = [card('diagonal_strike')]

  const options = getCardTargetOptions(state, 'card', [{ x: 1, y: 1 }])
  const result = playCard(state, 'card', [
    { x: 1, y: 1 },
    { x: 3, y: 3 },
  ])

  assert.deepEqual(options, [{ x: 3, y: 3 }])
  assert.equal(result.played, true)
  assert.equal(state.pieces.some((piece) => piece.id === 'first'), false)
  assert.equal(state.pieces.some((piece) => piece.id === 'second'), true)
})

test('sacrifice pact trades one non-hero ally for an adjacent enemy', () => {
  const state = cleanState()
  state.pieces = [
    ally({ id: 'hero', x: 0, y: 0, heroic: true }),
    ally({ id: 'finite', x: 2, y: 2, movesRemaining: 2 }),
    enemy({ id: 'adjacent', x: 3, y: 3 }),
  ]
  state.cardHand = [card('sacrifice_pact')]

  const result = playCard(state, 'card', [
    { x: 2, y: 2 },
    { x: 3, y: 3 },
  ])

  assert.equal(result.played, true)
  assert.equal(state.pieces.some((piece) => piece.id === 'finite'), false)
  assert.equal(state.pieces.some((piece) => piece.id === 'adjacent'), false)
  assert.equal(state.pieces.some((piece) => piece.id === 'hero'), true)
})
