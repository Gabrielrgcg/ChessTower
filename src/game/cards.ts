import type { CardDefinition } from './types.ts'

export const CHEST_SPAWN_CHANCE = 0.1

export const SUPPORTED_CARD_IDS = [
  'destroy_target_piece',
  'teleport_piece',
  'swap_places',
  'diagonal_strike',
  'sacrifice_pact',
] as const

export type SupportedCardId = (typeof SUPPORTED_CARD_IDS)[number]

export const CARD_TARGET_COUNTS: Record<SupportedCardId, number> = {
  destroy_target_piece: 1,
  teleport_piece: 2,
  swap_places: 2,
  diagonal_strike: 2,
  sacrifice_pact: 2,
}

export interface CardCatalog {
  cards: CardDefinition[]
  back: CardDefinition
}

const supportedCardIds = new Set<string>(SUPPORTED_CARD_IDS)

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object'
}

const readString = (value: Record<string, unknown>, key: string): string => {
  const field = value[key]
  if (typeof field !== 'string' || field.trim().length === 0) {
    throw new Error(`Card catalog entry is missing ${key}.`)
  }
  return field
}

const readInteger = (value: Record<string, unknown>, key: string, minimum: number): number => {
  const field = value[key]
  if (typeof field !== 'number' || !Number.isInteger(field) || field < minimum) {
    throw new Error(`Card catalog entry has invalid ${key}.`)
  }
  return field
}

interface SheetContext {
  file: string
  sheetWidth: number
  sheetHeight: number
  tileWidth: number
  tileHeight: number
}

const normalizeCard = (value: unknown, sheet: SheetContext): CardDefinition => {
  if (!isRecord(value)) {
    throw new Error('Card catalog entry must be an object.')
  }

  const x = readInteger(value, 'x', 0)
  const y = readInteger(value, 'y', 0)
  if (x + sheet.tileWidth > sheet.sheetWidth || y + sheet.tileHeight > sheet.sheetHeight) {
    throw new Error(`${readString(value, 'id')} has a sprite rectangle outside ${sheet.file}.`)
  }
  if (x % sheet.tileWidth !== 0 || y % sheet.tileHeight !== 0) {
    throw new Error(`${readString(value, 'id')} is not aligned to the card sheet grid.`)
  }

  const card = {
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    effect: readString(value, 'effect'),
    sprite: {
      sheet: sheet.file,
      sheetWidth: sheet.sheetWidth,
      sheetHeight: sheet.sheetHeight,
      x,
      y,
      width: sheet.tileWidth,
      height: sheet.tileHeight,
    },
  }

  return card
}

const normalizeSheetCards = (
  sheetValue: unknown,
  sheetWidth: number,
  sheetHeight: number,
  tileWidth: number,
  tileHeight: number,
): CardDefinition[] => {
  if (!isRecord(sheetValue)) {
    throw new Error('Card catalog sheet must be an object.')
  }

  readString(sheetValue, 'id')
  const file = readString(sheetValue, 'file')
  const cards = sheetValue.cards
  if (!Array.isArray(cards)) {
    throw new Error(`${file} must include a cards array.`)
  }

  return cards.map((card) => normalizeCard(card, { file, sheetWidth, sheetHeight, tileWidth, tileHeight }))
}

export const normalizeCardCatalog = (value: unknown): CardCatalog => {
  if (!isRecord(value)) {
    throw new Error('Card catalog must be an object.')
  }

  const sheetWidth = readInteger(value, 'sheetWidth', 1)
  const sheetHeight = readInteger(value, 'sheetHeight', 1)
  const tileWidth = readInteger(value, 'tileWidth', 1)
  const tileHeight = readInteger(value, 'tileHeight', 1)
  const sheets = value.sheets
  if (!Array.isArray(sheets)) {
    throw new Error('Card catalog must include a sheets array.')
  }

  const cards = sheets.flatMap((sheet) => normalizeSheetCards(sheet, sheetWidth, sheetHeight, tileWidth, tileHeight))
  const backCards = cards.filter((card) => card.id === 'card_back')
  if (backCards.length !== 1) {
    throw new Error('Card catalog must include exactly one card_back entry.')
  }

  const ids = new Set<string>()
  for (const card of cards) {
    if (ids.has(card.id)) {
      throw new Error(`Card catalog contains duplicate card id: ${card.id}.`)
    }
    ids.add(card.id)
  }

  return {
    cards: cards.filter((card) => card.id !== 'card_back'),
    back: backCards[0],
  }
}

export const isSupportedCardId = (id: string): id is SupportedCardId => supportedCardIds.has(id)

export const supportedCardDefinitions = (catalog: CardCatalog): CardDefinition[] => {
  return catalog.cards.filter((card) => isSupportedCardId(card.id))
}

export const cardById = (cards: CardDefinition[], id: string): CardDefinition | undefined => {
  return cards.find((card) => card.id === id)
}

export const targetCountForCardId = (id: SupportedCardId): number => CARD_TARGET_COUNTS[id]
