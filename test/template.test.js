import test from 'node:test'
import assert from 'node:assert/strict'
import { buildTemplateContext, looksLikeQuestion, renderTemplate } from '../src/lib/template.js'

test('renders known payload fields without command arguments', () => {
  const context = buildTemplateContext({
    hook_event_name: 'PermissionRequest',
    cwd: `${process.env.HOME}/project`,
    tool_name: 'Bash',
    tool_input: { command: 'cat secret.txt' }
  })

  assert.equal(renderTemplate('{{toolName}} in {{cwdShort}}', context), 'Bash in ~/project')
  assert.equal(renderTemplate('{{tool_input}}', context), '')
})

test('detects basic question endings', () => {
  assert.equal(looksLikeQuestion('Should I continue?'), true)
  assert.equal(looksLikeQuestion('Done.'), false)
})
