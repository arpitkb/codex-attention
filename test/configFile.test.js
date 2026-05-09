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

test('mergeConfig includes v2 fields', () => {
  const config = mergeConfig({})

  // Per-event sounds
  assert.equal(config.notifier.permissionSound, 'Basso')
  assert.equal(config.notifier.stopSound, 'Ping')

  // Subtitles
  assert.ok(config.messages.permissionSubtitle)
  assert.ok(config.messages.stopSubtitle)
  assert.ok(config.messages.questionSubtitle)

  // Behavior
  assert.equal(config.behavior.questionDetection, 'enhanced')
  assert.equal(config.behavior.showToolInput, true)
  assert.equal(config.behavior.cooldownSeconds, 3)
  assert.deepEqual(config.behavior.rules, [])

  // Webhook
  assert.equal(config.notifier.webhookUrl, '')
  assert.equal(config.notifier.webhookEnabled, false)
  assert.equal(config.notifier.webhookWhen, 'always')
  assert.equal(config.notifier.webhookIdleSeconds, 120)

  // Logging
  assert.equal(config.logging.format, 'json')
  assert.equal(config.logging.maxSizeBytes, 1048576)
})

test('mergeConfig preserves user overrides for new fields', () => {
  const config = mergeConfig({
    notifier: { permissionSound: 'Glass', webhookUrl: 'https://example.com/hook' },
    behavior: { cooldownSeconds: 10, rules: [{ event: 'Stop', notify: false }] }
  })

  assert.equal(config.notifier.permissionSound, 'Glass')
  assert.equal(config.notifier.webhookUrl, 'https://example.com/hook')
  assert.equal(config.behavior.cooldownSeconds, 10)
  assert.equal(config.behavior.rules.length, 1)
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

test('writeDefaultConfig can apply explicit installer choices to existing config', async (t) => {
  const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-config-override-'))
  t.after(() => fs.rm(codexHome, { recursive: true, force: true }))

  await fs.writeFile(path.join(codexHome, 'codex-attention.json'), JSON.stringify({
    notifier: {
      permissionSound: 'Basso',
      stopSound: 'Ping',
      webhookWhen: 'idle'
    }
  }, null, 2))

  await writeDefaultConfig(codexHome, {
    notifier: {
      permissionSound: 'Glass',
      stopSound: 'Basso'
    }
  }, { applyOverridesToExisting: true })

  const config = await readAttentionConfig(codexHome)
  assert.equal(config.notifier.permissionSound, 'Glass')
  assert.equal(config.notifier.stopSound, 'Basso')
  assert.equal(config.notifier.webhookWhen, 'idle')
})
