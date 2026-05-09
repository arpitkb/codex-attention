import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { doctor } from '../src/cli/doctor.js'

test('doctor reports unknown config keys as warnings, not passes', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-doctor-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.mkdir(path.join(root, 'hooks'), { recursive: true })
  await fs.writeFile(path.join(root, 'codex-attention.json'), JSON.stringify({ extra: true }, null, 2))
  await fs.writeFile(path.join(root, 'hooks/codex-attention-hook.cjs'), '')
  await fs.writeFile(path.join(root, 'hooks.json'), JSON.stringify({
    hooks: {
      PermissionRequest: [{ hooks: [{ command: path.join(root, 'hooks/codex-attention-hook.cjs') }] }],
      Stop: [{ hooks: [{ command: path.join(root, 'hooks/codex-attention-hook.cjs') }] }]
    }
  }))
  await fs.writeFile(path.join(root, 'config.toml'), '[features]\ncodex_hooks = true\n')

  const fakeNotifier = path.join(root, 'terminal-notifier')
  await fs.writeFile(fakeNotifier, '#!/bin/sh\nexit 0\n')
  await fs.chmod(fakeNotifier, 0o755)

  const previousCodexHome = process.env.CODEX_HOME
  const previousNotifier = process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER
  const originalLog = console.log
  const lines = []
  console.log = (...args) => lines.push(args.join(' '))
  process.env.CODEX_HOME = root
  process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER = fakeNotifier
  try {
    await doctor([])
  } finally {
    console.log = originalLog
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME
    else process.env.CODEX_HOME = previousCodexHome
    if (previousNotifier === undefined) delete process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER
    else process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER = previousNotifier
  }

  const output = lines.join('\n')
  assert.match(output, /⚠ config schema/)
  assert.doesNotMatch(output, /✓ config schema/)
})

test('doctor fails invalid config value types', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-doctor-types-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  await fs.writeFile(path.join(root, 'codex-attention.json'), JSON.stringify({
    behavior: { cooldownSeconds: 'slow' }
  }, null, 2))

  const previousCodexHome = process.env.CODEX_HOME
  const previousNotifier = process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER
  const originalLog = console.log
  const previousExitCode = process.exitCode
  const lines = []
  console.log = (...args) => lines.push(args.join(' '))
  process.env.CODEX_HOME = root
  delete process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER
  process.exitCode = undefined
  try {
    await doctor([])
  } finally {
    console.log = originalLog
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME
    else process.env.CODEX_HOME = previousCodexHome
    if (previousNotifier === undefined) delete process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER
    else process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER = previousNotifier
    process.exitCode = previousExitCode
  }

  assert.match(lines.join('\n'), /Invalid value types: behavior\.cooldownSeconds/)
})
