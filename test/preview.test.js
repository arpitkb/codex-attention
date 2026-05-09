import test from 'node:test'
import assert from 'node:assert/strict'
import { preview } from '../src/cli/preview.js'

test('preview approval renders a realistic notification without sending it', async () => {
  const originalLog = console.log
  const lines = []
  console.log = (...args) => lines.push(args.join(' '))
  try {
    await preview(['approval', '--tool', 'Bash', '--input', 'npm test', '--cwd', '/tmp/my-api'])
  } finally {
    console.log = originalLog
  }

  const output = lines.join('\n')
  assert.match(output, /Codex · my-api/)
  assert.match(output, /Approval needed/)
  assert.match(output, /Bash: npm test/)
})

test('preview stop can render question notification', async () => {
  const originalLog = console.log
  const lines = []
  console.log = (...args) => lines.push(args.join(' '))
  try {
    await preview(['stop', '--message', 'Should I continue?', '--cwd', '/tmp/my-api'])
  } finally {
    console.log = originalLog
  }

  const output = lines.join('\n')
  assert.match(output, /Waiting for reply/)
  assert.match(output, /Should I continue/)
})
