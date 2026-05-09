import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { install } from '../src/cli/install.js'
import { uninstall } from '../src/cli/uninstall.js'

test('install writes config, hooks, and a runnable copied hook', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-install-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const codexHome = path.join(root, 'codex-home')
  const fakeNotifier = path.join(root, 'terminal-notifier')
  const notifierLog = path.join(root, 'notifier.log')

  await fs.writeFile(fakeNotifier, '#!/bin/sh\nprintf "%s\\n" "$@" >> "$CODEX_ATTENTION_FAKE_NOTIFIER_LOG"\nexit 0\n')
  await fs.chmod(fakeNotifier, 0o755)

  const previousEnv = captureEnv()
  process.env.CODEX_HOME = codexHome
  process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER = fakeNotifier
  process.env.CODEX_ATTENTION_FAKE_NOTIFIER_LOG = notifierLog
  const logs = []
  const originalLog = console.log
  console.log = (...args) => logs.push(args.join(' '))
  try {
    await install(['--no-install-deps', '--activate-bundle-id', 'com.apple.Terminal'])
    await install(['--no-install-deps', '--activate-bundle-id', 'com.googlecode.iterm2'])
  } finally {
    console.log = originalLog
    restoreEnv(previousEnv)
  }

  const hookPath = path.join(codexHome, 'hooks/codex-attention-hook.cjs')
  const hooksJson = JSON.parse(await fs.readFile(path.join(codexHome, 'hooks.json'), 'utf8'))
  assert.equal(hooksJson.hooks.PermissionRequest.length, 1)
  assert.equal(hooksJson.hooks.Stop.length, 1)
  assert.match(hooksJson.hooks.PermissionRequest[0].hooks[0].command, /codex-attention-hook\.cjs/)

  const config = JSON.parse(await fs.readFile(path.join(codexHome, 'codex-attention.json'), 'utf8'))
  assert.equal(config.notifier.activateBundleId, 'com.apple.Terminal')

  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify({
      hook_event_name: 'PermissionRequest',
      session_id: 's1',
      cwd: `${process.env.HOME}/repo`,
      tool_name: 'Bash'
    }),
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_ATTENTION_TERMINAL_NOTIFIER: fakeNotifier,
      CODEX_ATTENTION_FAKE_NOTIFIER_LOG: notifierLog
    }
  })

  assert.equal(result.status, 0)
  assert.equal(result.stdout, '')
  assert.match(await fs.readFile(notifierLog, 'utf8'), /Codex/)
  assert.match(logs.join('\n'), /npx codex-attention@latest doctor --send-test/)
  assert.doesNotMatch(logs.join('\n'), /then run: codex-attention doctor --send-test/)
})

test('uninstall preserves unrelated hook commands in mixed entries', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-uninstall-'))
  t.after(() => fs.rm(root, { recursive: true, force: true }))
  const codexHome = path.join(root, 'codex-home')
  const fakeNotifier = path.join(root, 'terminal-notifier')

  await fs.writeFile(fakeNotifier, '#!/bin/sh\nexit 0\n')
  await fs.chmod(fakeNotifier, 0o755)

  const previousEnv = captureEnv()
  process.env.CODEX_HOME = codexHome
  process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER = fakeNotifier
  try {
    await install(['--no-install-deps'])
    const hooksPath = path.join(codexHome, 'hooks.json')
    const hooksJson = JSON.parse(await fs.readFile(hooksPath, 'utf8'))
    hooksJson.hooks.Stop[0].hooks.unshift({ type: 'command', command: 'echo keep' })
    await fs.writeFile(hooksPath, `${JSON.stringify(hooksJson, null, 2)}\n`)

    await uninstall()

    const after = JSON.parse(await fs.readFile(hooksPath, 'utf8'))
    assert.equal(after.hooks.Stop.length, 1)
    assert.equal(after.hooks.Stop[0].hooks.length, 1)
    assert.equal(after.hooks.Stop[0].hooks[0].command, 'echo keep')
    await assert.rejects(fs.access(path.join(codexHome, 'hooks/codex-attention-hook.cjs')))
  } finally {
    restoreEnv(previousEnv)
  }
})

function captureEnv() {
  return {
    CODEX_HOME: process.env.CODEX_HOME,
    CODEX_ATTENTION_TERMINAL_NOTIFIER: process.env.CODEX_ATTENTION_TERMINAL_NOTIFIER,
    CODEX_ATTENTION_FAKE_NOTIFIER_LOG: process.env.CODEX_ATTENTION_FAKE_NOTIFIER_LOG
  }
}

function restoreEnv(previousEnv) {
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}
