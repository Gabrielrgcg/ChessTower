import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const spriteDirectory = path.join(root, 'public', 'assets', 'sprites')
const catalogPath = path.join(spriteDirectory, 'chess_cards_pixel_art_two_sheets.json')
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
    failures.push(`chess_cards_pixel_art_two_sheets.json could not be read: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

const readString = (value, key, label) => {
  const field = value?.[key]
  if (typeof field !== 'string' || field.trim().length === 0) {
    failures.push(`${label} is missing ${key}.`)
    return ''
  }
  return field
}

const readInteger = (value, key, minimum, label) => {
  const field = value?.[key]
  if (!Number.isInteger(field) || field < minimum) {
    failures.push(`${label} has invalid ${key}.`)
    return 0
  }
  return field
}

const readPngDimensions = (filePath) => {
  const bytes = fs.readFileSync(filePath)
  const pngSignature = bytes.subarray(0, 8).toString('hex')
  const chunkName = bytes.subarray(12, 16).toString('ascii')
  if (pngSignature !== '89504e470d0a1a0a' || chunkName !== 'IHDR') {
    throw new Error('not a PNG file')
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

const checkSheetFile = (file, expectedWidth, expectedHeight) => {
  if (!/^chess_cards_pixel_art_sheet_.*\.png$/u.test(file)) {
    failures.push(`Card sheet uses invalid file name: ${String(file)}`)
    return
  }
  const filePath = path.join(spriteDirectory, file)
  if (!fs.existsSync(filePath)) {
    failures.push(`Card sheet is missing: ${file}`)
    return
  }

  try {
    const dimensions = readPngDimensions(filePath)
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
      failures.push(`${file} is ${dimensions.width}x${dimensions.height}, expected ${expectedWidth}x${expectedHeight}.`)
    }
  } catch (error) {
    failures.push(`${file} dimensions could not be read: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const catalog = readCatalog()
if (catalog) {
  const sheetWidth = readInteger(catalog, 'sheetWidth', 1, 'Catalog')
  const sheetHeight = readInteger(catalog, 'sheetHeight', 1, 'Catalog')
  const columns = readInteger(catalog, 'columns', 1, 'Catalog')
  const rows = readInteger(catalog, 'rows', 1, 'Catalog')
  const tileWidth = readInteger(catalog, 'tileWidth', 1, 'Catalog')
  const tileHeight = readInteger(catalog, 'tileHeight', 1, 'Catalog')

  if (sheetWidth !== columns * tileWidth) {
    failures.push(`Catalog sheetWidth ${sheetWidth} does not match columns x tileWidth.`)
  }
  if (sheetHeight !== rows * tileHeight) {
    failures.push(`Catalog sheetHeight ${sheetHeight} does not match rows x tileHeight.`)
  }

  if (!Array.isArray(catalog.sheets)) {
    failures.push('Catalog sheets must be an array.')
  } else {
    const supportedFound = new Set()
    let backCount = 0
    if (catalog.sheets.length !== 2) {
      failures.push(`Catalog must include 2 sheets, found ${catalog.sheets.length}.`)
    }

    for (const sheet of catalog.sheets) {
      if (!sheet || typeof sheet !== 'object') {
        failures.push('Sheet entry must be an object.')
        continue
      }
      readString(sheet, 'id', 'Sheet entry')
      const file = readString(sheet, 'file', 'Sheet entry')
      checkSheetFile(file, sheetWidth, sheetHeight)

      if (!Array.isArray(sheet.cards)) {
        failures.push(`${file} cards must be an array.`)
        continue
      }

      for (const entry of sheet.cards) {
        if (!entry || typeof entry !== 'object') {
          failures.push(`${file} card entry must be an object.`)
          continue
        }

        const id = readString(entry, 'id', `Card in ${file}`)
        readString(entry, 'name', `Card ${id || 'unknown'}`)
        readString(entry, 'effect', `Card ${id || 'unknown'}`)
        const x = readInteger(entry, 'x', 0, `Card ${id || 'unknown'}`)
        const y = readInteger(entry, 'y', 0, `Card ${id || 'unknown'}`)
        if (x + tileWidth > sheetWidth || y + tileHeight > sheetHeight) {
          failures.push(`Card ${id || 'unknown'} sprite rectangle is outside ${file}.`)
        }
        if (x % tileWidth !== 0 || y % tileHeight !== 0) {
          failures.push(`Card ${id || 'unknown'} sprite rectangle is not aligned to the sheet grid.`)
        }
        if (id === 'card_back') {
          backCount += 1
        }
        if (supportedCardIds.has(id)) {
          supportedFound.add(id)
        }
      }
    }

    for (const supportedId of supportedCardIds) {
      if (!supportedFound.has(supportedId)) {
        failures.push(`Supported card is missing from catalog: ${supportedId}`)
      }
    }
    if (backCount !== 1) {
      failures.push(`Catalog must include exactly one card_back entry, found ${backCount}.`)
    }
  }
}

const oldIndividualCards = fs
  .readdirSync(spriteDirectory)
  .filter((name) => /^card_(?:\d{2}_.+|back)\.png$/u.test(name))
if (oldIndividualCards.length > 0) {
  failures.push(`Old individual card sprites should be removed: ${oldIndividualCards.join(', ')}`)
}

if (failures.length > 0) {
  console.error('Card asset validation failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Validated card sheet catalog and sprite references.')
