import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { handleHookPayload, mergeConfig } = require('../src/hook/codex-attention-hook.cjs')

test('PermissionRequest produces approval notification', () => {
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: `${process.env.HOME}/repo`,
    tool_name: 'Bash',
    tool_input: { command: 'cat secret.txt' }
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.equal(result.title, 'Codex needs approval')
  assert.equal(result.message, 'Bash is waiting in ~/repo')
})

test('Stop emits valid stop response', () => {
  const result = handleHookPayload({
    hook_event_name: 'Stop',
    session_id: 's1',
    cwd: `${process.env.HOME}/repo`,
    last_assistant_message: 'Done.'
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.deepEqual(result.stopResponse, { continue: true, suppressOutput: true })
})
