import test from 'node:test'
import assert from 'node:assert/strict'
import { ensureCodexHooksEnabled } from '../src/lib/configToml.js'

test('adds features section when missing', () => {
  const result = ensureCodexHooksEnabled('model = "gpt-5"\n')
  assert.match(result, /\[features\]\ncodex_hooks = true/)
})

test('adds codex_hooks to existing features section', () => {
  const result = ensureCodexHooksEnabled('[features]\nmulti_agent = true\n\n[tui]\nnotifications = true\n')
  assert.match(result, /\[features\]\nmulti_agent = true\ncodex_hooks = true\n\n\[tui\]/)
})

test('updates existing codex_hooks value', () => {
  const result = ensureCodexHooksEnabled('[features]\ncodex_hooks = false\n')
  assert.equal(result, '[features]\ncodex_hooks = true\n')
})
