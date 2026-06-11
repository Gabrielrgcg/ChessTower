import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const spriteDirectory = path.join(root, 'public', 'assets', 'sprites')
const catalogPath = path.join(spriteDirectory, 'chess_card_sprites.json')
const supportedCardIds = new Set([
  'destroy_target_piece',
  'teleport_piece',
  'swap_places',
  'diagonal_strike',
  'sacrifice_pact',
])

const failures = []

const readCatalog = () => {
  try {
    return JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
  } catch (error) {
    failures.push(`chess_card_sprites.json could not be read: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

const isCardSprite = (sprite) => typeof sprite === 'string' && /^card.*\.png$/u.test(sprite)

const checkSprite = (sprite, label) => {
  if (!isCardSprite(sprite)) {
    failures.push(`${label} uses invalid sprite name: ${String(sprite)}`)
    return
  }
  if (!fs.existsSync(path.join(spriteDirectory, sprite))) {
    failures.push(`${label} references missing sprite: ${sprite}`)
  }
}

const catalog = readCatalog()
if (catalog) {
  if (!Array.isArray(catalog.cards)) {
    failures.push('Catalog cards must be an array.')
  } else {
    const supportedFound = new Set()
    for (const entry of catalog.cards) {
      if (!entry || typeof entry !== 'object') {
        failures.push('Card entry must be an object.')
        continue
      }
      if (typeof entry.id !== 'string' || typeof entry.name !== 'string' || typeof entry.effect !== 'string') {
        failures.push(`Card entry ${String(entry.id)} is missing id, name, or effect.`)
      }
      checkSprite(entry.sprite, `Card ${String(entry.id)}`)
      if (supportedCardIds.has(entry.id)) {
        supportedFound.add(entry.id)
      }
    }
    for (const supportedId of supportedCardIds) {
      if (!supportedFound.has(supportedId)) {
        failures.push(`Supported card is missing from catalog: ${supportedId}`)
      }
    }
  }

  if (!catalog.back || typeof catalog.back !== 'object') {
    failures.push('Catalog back card must be an object.')
  } else {
    checkSprite(catalog.back.sprite, 'Card back')
  }
}

if (failures.length > 0) {
  console.error('Card asset validation failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Validated card catalog sprite references.')
