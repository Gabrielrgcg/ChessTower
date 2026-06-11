import { normalizeCardCatalog, supportedCardDefinitions, type CardCatalog } from './cards.ts'
import type { CardDefinition } from './types.ts'

export interface GameAssets {
  playerSheet: HTMLImageElement
  enemySheet: HTMLImageElement
  tiles: HTMLImageElement
  noiseTexture: HTMLImageElement
  hud: HTMLImageElement
  chestClosed: HTMLImageElement
  chestOpen: HTMLImageElement
  crownOverlay: HTMLImageElement
  cardDefinitions: CardDefinition[]
}

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load image: ${src}`))
    image.src = src
  })
}

const loadImageWithFallback = async (src: string, fallback: string): Promise<HTMLImageElement> => {
  try {
    return await loadImage(src)
  } catch {
    return loadImage(fallback)
  }
}

const loadCardCatalog = async (): Promise<CardCatalog> => {
  const response = await fetch('/assets/sprites/chess_cards_pixel_art_two_sheets.json')
  if (!response.ok) {
    throw new Error(`Could not load card catalog: ${response.status}`)
  }
  return normalizeCardCatalog(await response.json())
}

export const loadAssets = async (): Promise<GameAssets> => {
  const cardCatalog = await loadCardCatalog()
  const cardSheetFiles = new Set(
    [...cardCatalog.cards, cardCatalog.back].map((definition) => definition.sprite.sheet),
  )
  await Promise.all([...cardSheetFiles].map((sheet) => loadImage(`/assets/sprites/${sheet}`)))

  const [
    playerSheet,
    enemySheet,
    tiles,
    noiseTexture,
    hud,
    chestClosed,
    chestOpen,
    crownOverlay,
  ] = await Promise.all([
    loadImage('/assets/sprites/player_sheet.png'),
    loadImage('/assets/sprites/enemy_sheet.png'),
    loadImage('/assets/sprites/tiles.png'),
    loadImage('/assets/sprites/noiseTexture.png'),
    loadImage('/assets/sprites/HUD.png'),
    loadImageWithFallback('/assets/sprites/chest_closed.png', '/assets/sprites/chest.png'),
    loadImageWithFallback('/assets/sprites/chest_open.png', '/assets/sprites/chest.png'),
    loadImage('/assets/sprites/crown.png'),
  ])

  return {
    playerSheet,
    enemySheet,
    tiles,
    noiseTexture,
    hud,
    chestClosed,
    chestOpen,
    crownOverlay,
    cardDefinitions: supportedCardDefinitions(cardCatalog),
  }
}
