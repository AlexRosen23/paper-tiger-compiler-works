// The static "Try it" demo build (VITE_DEMO=1) must not carry the loopback address or port, and must not
// reach the server on load (the /health probe is guarded by DEMO).
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

describe('demo build', () => {
  it('has no loopback address or API port in the shipped bundle', async () => {
    const out = mkdtempSync(path.join(tmpdir(), 'pt-demo-'));
    const prev = process.env.VITE_DEMO;
    process.env.VITE_DEMO = '1';
    try {
      await build({ configFile: path.resolve('web/vite.config.ts'), logLevel: 'silent', base: '/demos/x/', build: { outDir: out, emptyOutDir: true, sourcemap: false, assetsInlineLimit: 0 } });
      const files = readdirSync(path.join(out, 'assets')).filter((f) => /\.(js|css)$/.test(f));
      expect(files.length).toBeGreaterThan(0);
      const all = [...files.map((f) => readFileSync(path.join(out, 'assets', f), 'utf8')), readFileSync(path.join(out, 'index.html'), 'utf8')].join('\n');
      expect(all).not.toContain('127.0.0.1');
      expect(all).not.toContain('5580');
      expect(all).toContain('browser demo');
    } finally {
      if (prev === undefined) delete process.env.VITE_DEMO; else process.env.VITE_DEMO = prev;
      rmSync(out, { recursive: true, force: true });
    }
  }, 120_000);
});
