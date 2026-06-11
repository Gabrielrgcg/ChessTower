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
const cardSpritePattern = /^card[\w-]*\.png$/u

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

const normalizeCard = (value: unknown, requireEffect = true): CardDefinition => {
  if (!isRecord(value)) {
    throw new Error('Card catalog entry must be an object.')
  }

  const card = {
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    effect: requireEffect ? readString(value, 'effect') : '',
    sprite: readString(value, 'sprite'),
  }

  if (!cardSpritePattern.test(card.sprite)) {
    throw new Error(`${card.id} uses invalid card sprite ${card.sprite}.`)
  }

  return card
}

export const normalizeCardCatalog = (value: unknown): CardCatalog => {
  if (!isRecord(value)) {
    throw new Error('Card catalog must be an object.')
  }

  const cards = value.cards
  if (!Array.isArray(cards)) {
    throw new Error('Card catalog must include a cards array.')
  }

  const back = value.back
  if (!isRecord(back)) {
    throw new Error('Card catalog must include a back card.')
  }

  return {
    cards: cards.map((card) => normalizeCard(card)),
    back: normalizeCard(back, false),
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
