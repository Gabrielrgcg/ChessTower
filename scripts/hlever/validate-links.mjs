import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'artifacts', 'resources'])
const markdownFiles = []

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name))
      }
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      markdownFiles.push(path.join(directory, entry.name))
    }
  }
}

const stripCodeBlocks = (text) => text.replace(/```[\s\S]*?```/gu, '')

const isExternalTarget = (target) => /^(?:https?:|mailto:|tel:|#)/iu.test(target)

const normalizeTarget = (rawTarget) => {
  let target = rawTarget.trim()
  if (target.startsWith('<') && target.endsWith('>')) {
    target = target.slice(1, -1)
  }
  const hashIndex = target.indexOf('#')
  if (hashIndex >= 0) {
    target = target.slice(0, hashIndex)
  }
  return decodeURIComponent(target.trim())
}

walk(root)

const failures = []
const linkPattern = /\[[^\]\n]+\]\(([^)\n]+)\)/gu

for (const file of markdownFiles) {
  const text = stripCodeBlocks(fs.readFileSync(file, 'utf8'))
  for (const match of text.matchAll(linkPattern)) {
    const rawTarget = match[1]
    if (!rawTarget || isExternalTarget(rawTarget.trim())) {
      continue
    }

    const target = normalizeTarget(rawTarget)
    if (!target) {
      continue
    }

    const resolved = path.resolve(path.dirname(file), target)
    if (!fs.existsSync(resolved)) {
      failures.push(`${path.relative(root, file)} -> ${rawTarget}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Broken Markdown links:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Validated Markdown links in ${markdownFiles.length} files.`)
