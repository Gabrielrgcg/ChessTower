import { normalizeCardCatalog, supportedCardDefinitions } from './cards.ts'
import type { CardDefinition } from './types.ts'

export interface GameAssets {
  playerSheet: HTMLImageElement
  enemySheet: HTMLImageElement
  tiles: HTMLImageElement
  noiseTexture: HTMLImageElement
  hud: HTMLImageElement
  chestClosed: HTMLImageElement
  chestOpen: HTMLImageElement
  cardBack: HTMLImageElement
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

const loadCardDefinitions = async (): Promise<CardDefinition[]> => {
  const response = await fetch('/assets/sprites/chess_card_sprites.json')
  if (!response.ok) {
    throw new Error(`Could not load card catalog: ${response.status}`)
  }
  const catalog = normalizeCardCatalog(await response.json())
  return supportedCardDefinitions(catalog)
}

export const loadAssets = async (): Promise<GameAssets> => {
  const [playerSheet, enemySheet, tiles, noiseTexture, hud, chestClosed, chestOpen, cardBack, cardDefinitions] = await Promise.all([
    loadImage('/assets/sprites/player_sheet.png'),
    loadImage('/assets/sprites/enemy_sheet.png'),
    loadImage('/assets/sprites/tiles.png'),
    loadImage('/assets/sprites/noiseTexture.png'),
    loadImage('/assets/sprites/HUD.png'),
    loadImageWithFallback('/assets/sprites/chest_closed.png', '/assets/sprites/chest.png'),
    loadImageWithFallback('/assets/sprites/chest_open.png', '/assets/sprites/chest.png'),
    loadImage('/assets/sprites/card_back.png'),
    loadCardDefinitions(),
  ])

  return {
    playerSheet,
    enemySheet,
    tiles,
    noiseTexture,
    hud,
    chestClosed,
    chestOpen,
    cardBack,
    cardDefinitions,
  }
}
