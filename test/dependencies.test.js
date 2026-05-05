import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { assertMacOS, findExecutable } from '../src/lib/dependencies.js'

test('findExecutable honors explicit env override', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-attention-deps-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const binary = path.join(dir, 'terminal-notifier')
  await fs.writeFile(binary, '#!/bin/sh\nexit 0\n')
  await fs.chmod(binary, 0o755)

  assert.equal(findExecutable('terminal-notifier', {
    env: { CODEX_ATTENTION_TERMINAL_NOTIFIER: binary, PATH: '' }
  }), binary)
})

test('assertMacOS rejects non-mac platforms', () => {
  assert.throws(() => assertMacOS('linux'), /macOS only/)
})
