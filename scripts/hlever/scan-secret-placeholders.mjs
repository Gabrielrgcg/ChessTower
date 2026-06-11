import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'artifacts', 'resources'])
const textExtensions = new Set(['.md', '.json', '.mjs', '.ps1', '.psm1', '.ts', '.yml', '.yaml', '.gitignore'])
const files = []

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name))
      }
      continue
    }

    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name))
    }
  }
}

const suspiciousPatterns = [
  { name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { name: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9_]{30,}/u },
  { name: 'Stripe secret key', pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/u },
  { name: 'Slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/u },
  { name: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/u },
  { name: 'Discord webhook URL', pattern: /discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/u },
  { name: 'JWT', pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/u },
]

const secretAssignmentPattern = /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|WEBHOOK|PRIVATE_KEY|SSH_KEY)[A-Z0-9_]*\s*=\s*([^\s#]+)/u
const allowedPlaceholderPattern = /^(?:|<[^>]+>|\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}|changeme|placeholder|example|YOUR_[A-Z0-9_]+)$/iu

walk(root)

const failures = []

for (const file of files) {
  const relative = path.relative(root, file)
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/u)
  lines.forEach((line, index) => {
    for (const { name, pattern } of suspiciousPatterns) {
      if (pattern.test(line)) {
        failures.push(`${relative}:${index + 1} matched ${name}`)
      }
    }

    const assignment = line.match(secretAssignmentPattern)
    if (assignment) {
      const value = assignment[1] ?? ''
      if (!allowedPlaceholderPattern.test(value)) {
        failures.push(`${relative}:${index + 1} has non-placeholder secret-like assignment`)
      }
    }
  })
}

if (failures.length > 0) {
  console.error('Potential secret leakage detected:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`Scanned ${files.length} text files for secret placeholders.`)
