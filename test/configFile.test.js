import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { mergeConfig, readAttentionConfig, writeDefaultConfig } from '../src/lib/configFile.js'

test('mergeConfig preserves defaults and applies nested overrides', () => {
  const config = mergeConfig({
    notifier: { activateBundleId: 'com.apple.Terminal' },
    events: { stop: false }
  })

  assert.equal(config.enabled, true)
  assert.equal(config.events.permissionRequest, true)
  assert.equal(config.events.stop, false)
  assert.equal(config.notifier.activateBundleId, 'com.apple.Terminal')
  assert.equal(config.notifier.sound, 'Ping')
})

test('writeDefaultConfig preserves an existing user config on reinstall', async (t) => {
  const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-config-'))
  t.after(() => fs.rm(codexHome, { recursive: true, force: true }))

  await writeDefaultConfig(codexHome, {
    notifier: { activateBundleId: 'com.googlecode.iterm2' }
  })
  await fs.writeFile(path.join(codexHome, 'codex-attention.json'), JSON.stringify({
    events: { stop: false },
    notifier: { activateBundleId: 'com.apple.Terminal' }
  }, null, 2))

  await writeDefaultConfig(codexHome, {
    notifier: { activateBundleId: 'com.googlecode.iterm2' }
  })

  const config = await readAttentionConfig(codexHome)
  assert.equal(config.events.stop, false)
  assert.equal(config.events.permissionRequest, true)
  assert.equal(config.notifier.activateBundleId, 'com.apple.Terminal')
})
