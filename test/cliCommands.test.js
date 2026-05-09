import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { config } from '../src/cli/config.js'

test('config set creates CODEX_HOME when missing', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-config-cli-'))
  const codexHome = path.join(root, 'missing-codex-home')
  t.after(() => fs.rm(root, { recursive: true, force: true }))

  const previousCodexHome = process.env.CODEX_HOME
  const originalLog = console.log
  console.log = () => {}
  process.env.CODEX_HOME = codexHome
  try {
    await config(['set', 'behavior.cooldownSeconds', '5'])
  } finally {
    console.log = originalLog
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME
    else process.env.CODEX_HOME = previousCodexHome
  }

  const written = JSON.parse(await fs.readFile(path.join(codexHome, 'codex-attention.json'), 'utf8'))
  assert.equal(written.behavior.cooldownSeconds, 5)
})

test('config preset writes minimal preset values', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-preset-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))

  const previousCodexHome = process.env.CODEX_HOME
  const originalLog = console.log
  console.log = () => {}
  process.env.CODEX_HOME = root
  try {
    await config(['preset', 'minimal'])
  } finally {
    console.log = originalLog
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME
    else process.env.CODEX_HOME = previousCodexHome
  }

  const written = JSON.parse(await fs.readFile(path.join(root, 'codex-attention.json'), 'utf8'))
  assert.equal(written.events.permissionRequest, true)
  assert.equal(written.events.stop, false)
  assert.equal(written.behavior.cooldownSeconds, 0)
})
