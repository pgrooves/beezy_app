import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * The portability boundary is the single most important architectural rule in
 * this codebase (docs/DECISIONS.md#0001), and it is enforced by lint config
 * that is easy to break by accident. These tests fail if the enforcement stops
 * working — a green `npm run lint` on a clean tree proves nothing on its own.
 */

async function lintSource(relativePath: string, source: string) {
  // Files must sit at their real paths for the config's `files` globs to match.
  const dir = join(process.cwd(), 'src', '__boundary_fixture__');
  const scratch = mkdtempSync(join(tmpdir(), 'beezy-'));
  try {
    const target = join(process.cwd(), relativePath);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, source);
    const eslint = new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintFiles([target]);
    rmSync(target);
    return result?.messages ?? [];
  } finally {
    rmSync(scratch, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('portability boundary', () => {
  it('rejects browser globals outside src/lib/platform', async () => {
    const messages = await lintSource(
      'src/components/__boundary_check__.tsx',
      'export const a = window.innerWidth;\nexport const b = document.title;\n' +
        'export const c = navigator.userAgent;\nexport const d = localStorage.getItem("k");\n',
    );
    const restricted = messages.filter((m) => m.ruleId === 'no-restricted-globals');
    expect(restricted.map((m) => m.message).join('\n')).toContain('src/lib/platform');
    expect(restricted).toHaveLength(4);
  });

  it('allows browser globals inside src/lib/platform', async () => {
    const messages = await lintSource(
      'src/lib/platform/__boundary_check__.ts',
      'export const a = window.innerWidth;\n',
    );
    expect(messages.filter((m) => m.ruleId === 'no-restricted-globals')).toHaveLength(0);
  });

  it('keeps React out of the portable logic layer', async () => {
    const messages = await lintSource(
      'src/core/__boundary_check__.ts',
      'import { useState } from "react";\nexport const a = useState;\n',
    );
    const restricted = messages.filter((m) => m.ruleId === 'no-restricted-imports');
    expect(restricted).toHaveLength(1);
    expect(restricted[0]?.message).toContain('portable logic layer');
  });

  it('keeps the view layer out of the portable logic layer', async () => {
    const messages = await lintSource(
      'src/core/__boundary_check__.ts',
      'import { InstallSheet } from "../components/InstallSheet";\nexport const a = InstallSheet;\n',
    );
    expect(messages.filter((m) => m.ruleId === 'no-restricted-imports')).toHaveLength(1);
  });
});
