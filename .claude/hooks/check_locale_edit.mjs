#!/usr/bin/env node
// Claude Code hook (PostToolUse, set in .claude/settings.json).
// After Claude edits a file in src/locales/, runs scripts/check-locales.mjs:
// for en.json against every language, for any other file against that
// language only. If keys are missing, extra or have different {{placeholders}},
// it exits 2 so Claude sees the report and can add the strings to every
// language. Any other file, or anything unexpected, exits 0 and changes nothing.
import { spawnSync } from 'node:child_process'
import { relative, resolve, join } from 'node:path'

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  let event
  try {
    event = JSON.parse(input)
  } catch {
    process.exit(0)
  }
  const root = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd()
  const file = event?.tool_input?.file_path
  if (!file) process.exit(0)
  const rel = relative(root, resolve(root, file)).split('\\').join('/')
  const match = rel.match(/^src\/locales\/([^/]+)\.json$/)
  if (!match) process.exit(0)

  const args = [join(root, 'scripts', 'check-locales.mjs')]
  if (match[1] !== 'en') args.push(match[1])
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 30000 })
  if (run.status !== 1) process.exit(0)

  const lines = `${run.stdout}${run.stderr}`.trim().split('\n')
  const shown = lines.length > 60 ? [...lines.slice(0, 60), `... ${lines.length - 60} more lines`] : lines
  process.stderr.write(
    `scripts/check-locales.mjs found problems after this edit. Every string in en.json needs a ` +
      `translation in all 11 other languages, with the same {{placeholders}}:\n${shown.join('\n')}\n`,
  )
  process.exit(2)
})
