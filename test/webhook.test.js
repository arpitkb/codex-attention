import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildWebhookPayload } = require('../src/hook/codex-attention-hook.cjs')

test('Slack webhook payload has blocks and text', () => {
  const payload = buildWebhookPayload({
    title: 'Codex · my-api',
    subtitle: 'Approval needed',
    message: 'Bash: npm install express',
    eventName: 'PermissionRequest',
    sessionId: 's1'
  }, { notifier: { webhookFormat: 'slack' } })

  assert.ok(payload.text)
  assert.ok(payload.blocks)
  assert.equal(payload.blocks[0].type, 'section')
  assert.match(payload.blocks[0].text.text, /Codex · my-api/)
  assert.match(payload.blocks[0].text.text, /npm install express/)
})

test('Discord webhook payload has content', () => {
  const payload = buildWebhookPayload({
    title: 'Codex · my-api',
    subtitle: 'Approval needed',
    message: 'Bash: npm install',
    eventName: 'PermissionRequest',
    sessionId: 's1'
  }, { notifier: { webhookFormat: 'discord' } })

  assert.ok(payload.content)
  assert.match(payload.content, /Codex · my-api/)
  assert.match(payload.content, /npm install/)
})

test('Raw webhook payload has structured fields', () => {
  const payload = buildWebhookPayload({
    title: 'Codex · my-api',
    subtitle: 'Turn finished',
    message: 'Turn finished in ~/project',
    eventName: 'Stop',
    sessionId: 's1'
  }, { notifier: { webhookFormat: 'raw' } })

  assert.equal(payload.title, 'Codex · my-api')
  assert.equal(payload.subtitle, 'Turn finished')
  assert.equal(payload.event, 'Stop')
  assert.equal(payload.session, 's1')
  assert.ok(payload.timestamp)
})

test('Webhook payload handles missing fields gracefully', () => {
  const payload = buildWebhookPayload({}, { notifier: { webhookFormat: 'slack' } })
  assert.ok(payload.text !== undefined)
  assert.ok(payload.blocks)
})
