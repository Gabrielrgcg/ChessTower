import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'artifacts', 'resources'])
const jsonFiles = []

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name))
      }
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      jsonFiles.push(path.join(directory, entry.name))
    }
  }
}

walk(root)

const failures = []

for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    failures.push(`${path.relative(root, file)}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error('Invalid JSON files:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Validated JSON syntax in ${jsonFiles.length} files.`)
