import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  handleHookPayload,
  mergeConfig,
  looksLikeQuestion,
  matchRule,
  parseMacIdleSeconds,
  shouldSendWebhook,
  shouldThrottle,
  summarizeToolInput
} = require('../src/hook/codex-attention-hook.cjs')

// --- Rich Notification Content ---

test('PermissionRequest shows tool name and input summary', () => {
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: `${process.env.HOME}/my-api`,
    tool_name: 'Bash',
    tool_input: { command: 'npm install express' }
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.equal(result.title, 'Codex · my-api')
  assert.equal(result.message, 'Bash: npm install express')
  assert.equal(result.subtitle, 'Approval needed')
})

test('PermissionRequest for apply_patch shows filename', () => {
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: `${process.env.HOME}/project`,
    tool_name: 'apply_patch',
    tool_input: '--- a/src/index.js\n+++ b/src/index.js\n@@ -1,3 +1,4 @@'
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.match(result.message, /apply_patch/)
  assert.match(result.message, /index\.js/)
})

test('PermissionRequest with file path object shows basename', () => {
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: `${process.env.HOME}/project`,
    tool_name: 'Write',
    tool_input: { path: '/tmp/test-output.json' }
  }, mergeConfig())

  assert.match(result.message, /test-output\.json/)
})

test('PermissionRequest hides tool input when showToolInput is false', () => {
  const config = mergeConfig({ behavior: { showToolInput: false } })
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: `${process.env.HOME}/project`,
    tool_name: 'Bash',
    tool_input: { command: 'echo SECRET_TOKEN=abc123' }
  }, config)

  assert.equal(result.shouldNotify, true)
  assert.doesNotMatch(result.message, /SECRET_TOKEN|abc123/)
  assert.match(result.message, /input hidden/)
})

test('PermissionRequest redacts common secrets from command previews', () => {
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: `${process.env.HOME}/project`,
    tool_name: 'Bash',
    tool_input: { command: 'OPENAI_API_KEY=sk-test PASSWORD=hunter2 npm test -- --token abc123' }
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.doesNotMatch(result.message, /sk-test|hunter2|abc123/)
  assert.match(result.message, /<redacted>/)
})

test('Stop with question shows last message', () => {
  const result = handleHookPayload({
    hook_event_name: 'Stop',
    session_id: 's1',
    cwd: `${process.env.HOME}/repo`,
    last_assistant_message: 'Should I also add unit tests for this?'
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.match(result.message, /unit tests/)
  assert.equal(result.subtitle, 'Waiting for reply')
})

test('Stop without question shows turn finished', () => {
  const result = handleHookPayload({
    hook_event_name: 'Stop',
    session_id: 's1',
    cwd: `${process.env.HOME}/repo`,
    last_assistant_message: 'Done. Created 3 files.'
  }, mergeConfig())

  assert.equal(result.shouldNotify, true)
  assert.match(result.message, /Turn finished/)
  assert.equal(result.subtitle, 'Turn finished')
  assert.deepEqual(result.stopResponse, { continue: true, suppressOutput: true })
})

// --- Per-Event Sounds ---

test('PermissionRequest uses permissionSound', () => {
  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp/project',
    tool_name: 'Bash'
  }, mergeConfig())

  assert.equal(result.sound, 'Basso')
})

test('Stop uses stopSound', () => {
  const result = handleHookPayload({
    hook_event_name: 'Stop',
    session_id: 's1',
    cwd: '/tmp/project'
  }, mergeConfig())

  assert.equal(result.sound, 'Ping')
})

test('Custom per-event sounds from config', () => {
  const config = mergeConfig({ notifier: { permissionSound: 'Glass', stopSound: 'Hero' } })

  const perm = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp',
    tool_name: 'Bash'
  }, config)
  assert.equal(perm.sound, 'Glass')

  const stop = handleHookPayload({
    hook_event_name: 'Stop',
    session_id: 's1',
    cwd: '/tmp'
  }, config)
  assert.equal(stop.sound, 'Hero')
})

// --- Enhanced Question Detection ---

test('looksLikeQuestion enhanced mode catches question phrases', () => {
  assert.equal(looksLikeQuestion('Should I continue with the migration?', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Would you like me to add tests?', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Please confirm before I proceed.', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Let me know if this looks correct.', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Done. All files created.', 'enhanced'), false)
})

test('looksLikeQuestion enhanced mode detects numbered options', () => {
  assert.equal(looksLikeQuestion('Which approach do you prefer:\n1. Use a map\n2. Use a switch', 'enhanced'), true)
})

test('looksLikeQuestion basic mode only checks trailing ?', () => {
  assert.equal(looksLikeQuestion('Should I continue?', 'basic'), true)
  assert.equal(looksLikeQuestion('Would you like me to add tests', 'basic'), false)
  assert.equal(looksLikeQuestion('Done.', 'basic'), false)
})

test('looksLikeQuestion enhanced finds ? on any line', () => {
  assert.equal(looksLikeQuestion('First line\nIs this correct?\nLast line', 'enhanced'), true)
})

// --- Conditional Rules ---

test('matchRule returns first matching rule', () => {
  const rules = [
    { event: 'PermissionRequest', toolName: 'Bash', notify: true, sound: 'Glass' },
    { event: 'PermissionRequest', toolName: 'apply_patch', notify: false }
  ]

  const bashRule = matchRule(rules, 'PermissionRequest', 'Bash')
  assert.equal(bashRule.sound, 'Glass')

  const patchRule = matchRule(rules, 'PermissionRequest', 'apply_patch')
  assert.equal(patchRule.notify, false)

  const noMatch = matchRule(rules, 'Stop', 'Bash')
  assert.equal(noMatch, null)
})

test('rule suppresses notification for specific tool', () => {
  const config = mergeConfig({
    behavior: {
      rules: [{ event: 'PermissionRequest', toolName: 'apply_patch', notify: false }]
    }
  })

  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp/project',
    tool_name: 'apply_patch',
    tool_input: 'patch content'
  }, config)

  assert.equal(result.shouldNotify, false)
})

test('rule overrides sound for specific tool', () => {
  const config = mergeConfig({
    behavior: {
      rules: [{ event: 'PermissionRequest', toolName: 'Bash', notify: true, sound: 'Submarine' }]
    }
  })

  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp/project',
    tool_name: 'Bash',
    tool_input: { command: 'rm -rf /' }
  }, config)

  assert.equal(result.shouldNotify, true)
  assert.equal(result.sound, 'Submarine')
})

test('sound-only rule does not re-enable globally disabled event', () => {
  const config = mergeConfig({
    events: { permissionRequest: false },
    behavior: {
      rules: [{ event: 'PermissionRequest', toolName: 'Bash', sound: 'Glass' }]
    }
  })

  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp/project',
    tool_name: 'Bash',
    tool_input: { command: 'npm install' }
  }, config)

  assert.equal(result.shouldNotify, false)
})

test('explicit notify true rule can re-enable globally disabled event', () => {
  const config = mergeConfig({
    events: { permissionRequest: false },
    behavior: {
      rules: [{ event: 'PermissionRequest', toolName: 'Bash', notify: true, sound: 'Glass' }]
    }
  })

  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp/project',
    tool_name: 'Bash',
    tool_input: { command: 'npm install' }
  }, config)

  assert.equal(result.shouldNotify, true)
  assert.equal(result.sound, 'Glass')
})

// --- Disabled Config ---

test('disabled config suppresses all notifications', () => {
  const config = mergeConfig({ enabled: false })

  const result = handleHookPayload({
    hook_event_name: 'PermissionRequest',
    session_id: 's1',
    cwd: '/tmp',
    tool_name: 'Bash'
  }, config)

  assert.equal(result.shouldNotify, false)
})

test('disabled event suppresses that event type', () => {
  const config = mergeConfig({ events: { stop: false } })

  const result = handleHookPayload({
    hook_event_name: 'Stop',
    session_id: 's1',
    cwd: '/tmp'
  }, config)

  assert.equal(result.shouldNotify, false)
  assert.deepEqual(result.stopResponse, { continue: true, suppressOutput: true })
})

test('cooldown never throttles approval requests', () => {
  assert.equal(shouldThrottle('/tmp/codex-attention-test', 's1', 'PermissionRequest', 3), false)
  assert.equal(shouldThrottle('/tmp/codex-attention-test', 's1', 'PermissionRequest', 3), false)
})

// --- Webhook idle gate ---

test('webhook defaults to always send when enabled', () => {
  const config = mergeConfig({ notifier: { webhookEnabled: true, webhookUrl: 'https://example.com' } })
  assert.equal(shouldSendWebhook(config, 0), true)
})

test('webhook idle mode skips when user is active', () => {
  const config = mergeConfig({
    notifier: {
      webhookEnabled: true,
      webhookUrl: 'https://example.com',
      webhookWhen: 'idle',
      webhookIdleSeconds: 120
    }
  })

  assert.equal(shouldSendWebhook(config, 30), false)
})

test('webhook idle mode sends after configured idle threshold', () => {
  const config = mergeConfig({
    notifier: {
      webhookEnabled: true,
      webhookUrl: 'https://example.com',
      webhookWhen: 'idle',
      webhookIdleSeconds: 120
    }
  })

  assert.equal(shouldSendWebhook(config, 180), true)
})

test('webhook idle mode skips when idle time cannot be detected', () => {
  const config = mergeConfig({
    notifier: {
      webhookEnabled: true,
      webhookUrl: 'https://example.com',
      webhookWhen: 'idle',
      webhookIdleSeconds: 120
    }
  })

  assert.equal(shouldSendWebhook(config, null), false)
})

test('parseMacIdleSeconds converts HIDIdleTime nanoseconds to seconds', () => {
  assert.equal(parseMacIdleSeconds('    "HIDIdleTime" = 125000000000\n'), 125)
  assert.equal(parseMacIdleSeconds('no idle time here'), null)
})
