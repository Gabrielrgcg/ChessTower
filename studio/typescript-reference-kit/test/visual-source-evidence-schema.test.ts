import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.resolve(
  currentDirectory,
  '../../../../Skin/templates/sprite-adoption/visual-source-evidence.schema.json',
)

type EvidenceRecord = {
  runtime?: {
    kind?: string
  }
  selection?: {
    authority?: unknown
  }
  geometry?: {
    recolorable?: boolean
    directions?: string[]
    paletteMaskPath?: string
    addonPaths?: string[]
    palette?: {
      defaultColors?: Record<string, string>
      neutralTargets?: {
        sampleColors?: string[]
        maxSaturation?: number
      }
    }
  }
}

const validateHleverEvidenceRules = (record: EvidenceRecord): string[] => {
  const failures: string[] = []

  if (record.runtime?.kind === 'corpse' && !record.selection?.authority) {
    failures.push('corpse evidence requires selection.authority')
  }

  if (
    (record.runtime?.kind === 'outfit' || record.runtime?.kind === 'vocation') &&
    record.geometry?.recolorable === true
  ) {
    if (!record.geometry.directions?.length) {
      failures.push('recolorable outfit evidence requires directions')
    }
    if (!record.geometry.paletteMaskPath) {
      failures.push('recolorable outfit evidence requires paletteMaskPath')
    }
    if (!Array.isArray(record.geometry.addonPaths)) {
      failures.push('recolorable outfit evidence requires addonPaths')
    }
    if (!record.geometry.palette?.defaultColors || Object.keys(record.geometry.palette.defaultColors).length === 0) {
      failures.push('recolorable outfit evidence requires defaultColors')
    }
    if (!record.geometry.palette?.neutralTargets?.sampleColors?.length) {
      failures.push('recolorable outfit evidence requires neutral color samples')
    }
  }

  return failures
}

test('visual source schema encodes corpse authority and recolorable outfit requirements', () => {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))

  assert.equal(schema.properties.selection.properties.authority.required.includes('sourceKind'), true)
  assert.equal(schema.properties.geometry.properties.palette.$ref, '#/$defs/palette')
  assert.equal(schema.$defs.palette.required.includes('neutralTargets'), true)

  const validCorpse = {
    runtime: {
      kind: 'corpse',
    },
    selection: {
      authority: {
        sourceKind: 'xml-look-corpse',
        sourceId: 4242,
        precedence: 'authoritative',
        beatsSlugOrName: true,
      },
    },
  }

  const invalidCorpse = {
    runtime: {
      kind: 'corpse',
    },
    selection: {},
  }

  const validOutfit = {
    runtime: {
      kind: 'outfit',
    },
    geometry: {
      recolorable: true,
      directions: ['north', 'east', 'south', 'west'],
      paletteMaskPath: '/game-assets/hlever/outfits/example-mask.png',
      addonPaths: [],
      palette: {
        defaultColors: {
          primary: '#a3a3a3',
        },
        neutralTargets: {
          sampleColors: ['#a3a3a3'],
          maxSaturation: 0.08,
        },
      },
    },
  }

  const invalidOutfit = {
    runtime: {
      kind: 'vocation',
    },
    geometry: {
      recolorable: true,
      directions: ['south'],
      addonPaths: [],
    },
  }

  assert.deepEqual(validateHleverEvidenceRules(validCorpse), [])
  assert.deepEqual(validateHleverEvidenceRules(validOutfit), [])
  assert.match(validateHleverEvidenceRules(invalidCorpse).join('\n'), /selection\.authority/u)
  assert.match(validateHleverEvidenceRules(invalidOutfit).join('\n'), /paletteMaskPath/u)
  assert.match(validateHleverEvidenceRules(invalidOutfit).join('\n'), /neutral color/u)
})
