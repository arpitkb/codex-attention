import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTemplateContext, looksLikeQuestion, renderTemplate, summarizeToolInput, truncate } from '../src/lib/template.js'

// --- Template Variables ---

test('renders projectName from cwd basename', () => {
  const context = buildTemplateContext({
    hook_event_name: 'PermissionRequest',
    cwd: `${process.env.HOME}/my-awesome-api`,
    tool_name: 'Bash',
    tool_input: { command: 'cat secret.txt' }
  })

  assert.equal(renderTemplate('{{projectName}}', context), 'my-awesome-api')
  assert.equal(renderTemplate('Codex · {{projectName}}', context), 'Codex · my-awesome-api')
})

test('renders toolInputShort for Bash commands', () => {
  const context = buildTemplateContext({
    hook_event_name: 'PermissionRequest',
    cwd: '/tmp/project',
    tool_name: 'Bash',
    tool_input: { command: 'npm install express body-parser' }
  })

  assert.equal(renderTemplate('{{toolName}}: {{toolInputShort}}', context), 'Bash: npm install express body-parser')
})

test('renders lastMessageShort from last_assistant_message', () => {
  const context = buildTemplateContext({
    hook_event_name: 'Stop',
    cwd: '/tmp/project',
    last_assistant_message: 'Should I proceed with the refactoring?'
  })

  assert.equal(renderTemplate('{{lastMessageShort}}', context), 'Should I proceed with the refactoring?')
})

test('truncates long messages', () => {
  const longMessage = 'A'.repeat(300)
  const context = buildTemplateContext({
    hook_event_name: 'Stop',
    cwd: '/tmp',
    last_assistant_message: longMessage
  })

  assert.ok(context.lastMessageShort.length <= 80)
  assert.ok(context.lastMessage.length <= 200)
  assert.ok(context.lastMessageShort.endsWith('…'))
})

test('renders model from payload', () => {
  const context = buildTemplateContext({
    hook_event_name: 'PermissionRequest',
    cwd: '/tmp',
    tool_name: 'Bash',
    model: 'o4-mini'
  })

  assert.equal(renderTemplate('{{model}}', context), 'o4-mini')
})

test('unknown template variables render as empty string', () => {
  const context = buildTemplateContext({ cwd: '/tmp' })
  assert.equal(renderTemplate('{{unknownVar}}', context), '')
})

test('projectName falls back to Codex when cwd is empty', () => {
  const context = buildTemplateContext({})
  assert.equal(context.projectName, 'Codex')
})

// --- Summarize Tool Input ---

test('summarizeToolInput: null returns empty', () => {
  assert.equal(summarizeToolInput(null), '')
  assert.equal(summarizeToolInput(undefined), '')
})

test('summarizeToolInput: Bash command', () => {
  assert.equal(summarizeToolInput({ command: 'ls -la' }), 'ls -la')
})

test('summarizeToolInput redacts common secret values', () => {
  const result = summarizeToolInput({ command: 'API_KEY=secret123 npm test --password hunter2 --token abc123' })
  assert.doesNotMatch(result, /secret123|hunter2|abc123/)
  assert.match(result, /<redacted>/)
})

test('summarizeToolInput: file path object', () => {
  assert.equal(summarizeToolInput({ path: '/home/user/src/index.js' }), 'index.js')
  assert.equal(summarizeToolInput({ file: '/tmp/output.txt' }), 'output.txt')
})

test('summarizeToolInput: patch-like string extracts filename', () => {
  const input = '--- a/src/utils.ts\n+++ b/src/utils.ts\n@@ -1,3 +1,4 @@'
  assert.match(summarizeToolInput(input), /utils\.ts/)
})

test('summarizeToolInput: long string gets truncated', () => {
  const input = 'A'.repeat(200)
  const result = summarizeToolInput(input, 80)
  assert.ok(result.length <= 80)
})

test('summarizeToolInput: unknown object shape uses JSON', () => {
  const result = summarizeToolInput({ foo: 'bar', baz: 42 })
  assert.match(result, /foo/)
})

// --- Truncate ---

test('truncate returns original when under limit', () => {
  assert.equal(truncate('hello', 80), 'hello')
})

test('truncate adds ellipsis when over limit', () => {
  const result = truncate('hello world', 6)
  assert.equal(result.length, 6)
  assert.ok(result.endsWith('…'))
})

// --- Question Detection ---

test('basic question detection: trailing ?', () => {
  assert.equal(looksLikeQuestion('Should I continue?', 'basic'), true)
  assert.equal(looksLikeQuestion('Done.', 'basic'), false)
})

test('enhanced question detection: phrase matching', () => {
  assert.equal(looksLikeQuestion('Would you like me to add tests', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Do you want me to proceed', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Please confirm this change', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Shall I refactor this', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Is that okay with you', 'enhanced'), true)
})

test('enhanced question detection: multi-line ?', () => {
  assert.equal(looksLikeQuestion('Here is my analysis:\nDoes this make sense?\nLet me know.', 'enhanced'), true)
})

test('enhanced question detection: numbered options', () => {
  assert.equal(looksLikeQuestion('Choose one:\n1. Option A\n2. Option B', 'enhanced'), true)
  assert.equal(looksLikeQuestion('Choose one:\n1) Option A\n2) Option B', 'enhanced'), true)
})

test('enhanced question detection: no false positive on statements', () => {
  assert.equal(looksLikeQuestion('Done. All files created.', 'enhanced'), false)
  assert.equal(looksLikeQuestion('I have completed the task.', 'enhanced'), false)
})

test('empty message is not a question', () => {
  assert.equal(looksLikeQuestion('', 'basic'), false)
  assert.equal(looksLikeQuestion('', 'enhanced'), false)
})
