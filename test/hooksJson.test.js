import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeHooksJson, removeManagedHooks } from '../src/lib/hooksJson.js'

test('mergeHooksJson adds PermissionRequest and Stop without deleting existing hooks', () => {
  const existing = {
    hooks: {
      SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'echo hi' }] }]
    }
  }

  const merged = mergeHooksJson(existing, {
    nodePath: '/usr/local/bin/node',
    hookPath: '/tmp/codex-attention-hook.cjs'
  })

  assert.equal(merged.hooks.SessionStart.length, 1)
  assert.equal(merged.hooks.PermissionRequest.length, 1)
  assert.equal(merged.hooks.Stop.length, 1)
  assert.match(merged.hooks.PermissionRequest[0].hooks[0].command, /'\/tmp\/codex-attention-hook\.cjs'/)
})

test('mergeHooksJson is idempotent', () => {
  const hookSpec = {
    nodePath: '/usr/local/bin/node',
    hookPath: '/tmp/codex-attention-hook.cjs'
  }
  const once = mergeHooksJson({}, hookSpec)
  const twice = mergeHooksJson(once, hookSpec)

  assert.equal(twice.hooks.PermissionRequest.length, 1)
  assert.equal(twice.hooks.Stop.length, 1)
})

test('removeManagedHooks removes only managed hook commands inside mixed entries', () => {
  const hookPath = '/tmp/codex-attention-hook.cjs'
  const merged = mergeHooksJson({
    hooks: {
      Stop: [{
        matcher: '*',
        hooks: [
          { type: 'command', command: 'echo keep' },
          { type: 'command', command: `'node' '${hookPath}'`, name: 'codex-attention' }
        ]
      }]
    }
  }, {
    nodePath: '/usr/local/bin/node',
    hookPath
  })

  const removed = removeManagedHooks(merged, hookPath)

  assert.equal(removed.hooks.Stop.length, 1)
  assert.equal(removed.hooks.Stop[0].hooks.length, 1)
  assert.equal(removed.hooks.Stop[0].hooks[0].command, 'echo keep')
  assert.equal(removed.hooks.PermissionRequest, undefined)
})
