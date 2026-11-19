import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { DEFAULT_LIMITS, FaultSignal, SceneBuilder, canonicalJson, cmdUnits, color, hashOf, point, q, sha256 } from '../core/index.ts';
import { evalPure } from '../core/ops.ts';
import { restoreScene, snapScene } from '../core/scene-snap.ts';
import { GROUP_SIG, PRIMITIVES, PRIMITIVE_KINDS } from '../core/primitives.ts';

const ev = (op: Parameters<typeof evalPure>[0], ...args: Parameters<typeof evalPure>[1]) => evalPure(op, args, {}, 1000);
const fault = (f: () => unknown): string => {
  try { f(); } catch (e) { if (e instanceof FaultSignal) return e.code; throw e; }
  return 'none';
};

describe('canonicalJson / hashOf', () => {
  it('sorts keys at every depth and writes no whitespace', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 2], c: null } })).toBe('{"a":{"c":null,"d":[3,2]},"b":1}');
  });
  it('writes -0 as 0 and rejects NaN and Infinity (they cannot be hashed)', () => {
    expect(canonicalJson(-0)).toBe('0');
    expect(canonicalJson({ x: -0 })).toBe('{"x":0}');
    for (const bad of [NaN, Infinity, -Infinity]) expect(() => canonicalJson(bad)).toThrow(/non-finite/);
    expect(() => canonicalJson({ deep: [1, { x: NaN }] })).toThrow(/non-finite/);
  });
  it('drops undefined object members but keeps array positions (as null)', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
    expect(canonicalJson([1, undefined])).toBe('[1,null]');
  });
  it('escapes strings like JSON.stringify', () => {
    expect(canonicalJson('a"b\n')).toBe('"a\\"b\\n"');
  });
  it('hashOf is insensitive to key order but sensitive to values', () => {
    expect(hashOf({ a: 1, b: 2 })).toBe(hashOf({ b: 2, a: 1 }));
    expect(hashOf({ a: 1 })).not.toBe(hashOf({ a: 2 }));
    expect(hashOf({ a: 1 })).toBe(createHash('sha256').update('{"a":1}').digest('hex'));
  });
});

describe('sha256 on binary input and block boundaries', () => {
  it('matches node:crypto around the 55/56/64-byte padding boundaries', () => {
    for (const n of [0, 1, 55, 56, 57, 63, 64, 65, 119, 120, 128]) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 31 + 7) & 255);
      expect(sha256(bytes), `${n} bytes`).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
  });
  it('hashes a string as UTF-8, not UTF-16', () => {
    expect(sha256('héllo ✓')).toBe(createHash('sha256').update('héllo ✓', 'utf8').digest('hex'));
  });
});

describe('evalPure arithmetic', () => {
  it('does ordinary arithmetic and keeps the sign of the dividend for %', () => {
    expect(ev('add', 2, 3)).toBe(5);
    expect(ev('sub', 2, 3)).toBe(-1);
    expect(ev('mul', 4, 2.5)).toBe(10);
    expect(ev('div', 7, 2)).toBe(3.5);
    expect(ev('mod', -7, 3)).toBe(-1);
    expect(ev('neg', 4)).toBe(-4);
  });
  it('faults R001 instead of producing NaN or Infinity', () => {
    expect(fault(() => ev('div', 1, 0))).toBe('R001');
    expect(fault(() => ev('div', 0, 0))).toBe('R001');
    expect(fault(() => ev('mod', 1, 0))).toBe('R001');
    expect(fault(() => ev('mul', 1e308, 10))).toBe('R001');
  });
});

describe('evalPure comparison, strings, lists', () => {
  it('compares', () => {
    expect(ev('lt', 1, 2)).toBe(true);
    expect(ev('le', 2, 2)).toBe(true);
    expect(ev('gt', 1, 2)).toBe(false);
    expect(ev('ge', 2, 3)).toBe(false);
    expect(ev('eq', 'a', 'a')).toBe(true);
    expect(ev('ne', 1, 2)).toBe(true);
    expect(ev('not', false)).toBe(true);
  });
  it('== compares colours by value, not identity', () => {
    expect(ev('eq', color(1, 2, 3), color(1, 2, 3))).toBe(true);
    expect(ev('eq', color(1, 2, 3), color(1, 2, 4))).toBe(false);
  });
  it('concat enforces the string limit exactly at the boundary (R009)', () => {
    expect(evalPure('concat', ['ab', 'cd'], {}, 4)).toBe('abcd');
    expect(fault(() => evalPure('concat', ['ab', 'cde'], {}, 4))).toBe('R009');
  });
  it('list builds a frozen copy; len counts it', () => {
    const src = [1, 2, 3];
    const l = ev('list', ...src) as number[];
    expect(l).toEqual([1, 2, 3]);
    expect(Object.isFrozen(l)).toBe(true);
    expect(ev('len', l)).toBe(3);
  });
  it('index is bounds- and integer-checked (R002) with the valid range in the message', () => {
    const xs = [10, 20, 30];
    expect(ev('index', xs, 2)).toBe(30);
    for (const i of [-1, 3, 1.5]) expect(fault(() => ev('index', xs, i)), `index ${i}`).toBe('R002');
    expect(() => ev('index', xs, 3)).toThrow(/0\.\.2/);
    expect(() => ev('index', [], 0)).toThrow(/0\.\.-1/);
  });
  it('field reads colour channels and point coordinates', () => {
    expect(evalPure('field', [color(10, 20, 30, 1)], { field: 'g' }, 10)).toBe(20);
    expect(evalPure('field', [point(4, 5)], { field: 'y' }, 10)).toBe(5);
  });
  it('rejects an impure op rather than guessing', () => {
    expect(() => ev('call' as never)).toThrow(/not pure/);
  });
});

describe('scene helpers', () => {
  it('q quantizes to 1e-4 and never returns -0', () => {
    expect(q(1.23456)).toBe(1.2346);
    expect(q(-0.00001)).toBe(0);
    expect(Object.is(q(-0.00001), -0)).toBe(false);
    expect(q(2)).toBe(2);
  });
  it('cmdUnits: 1 per shape, plus path points, plus one per 16 characters of text', () => {
    expect(cmdUnits('circle', undefined, undefined)).toBe(1);
    expect(cmdUnits('path', [[0, 0], [1, 1], [2, 2]], undefined)).toBe(4);
    expect(cmdUnits('text', undefined, '')).toBe(1);
    expect(cmdUnits('text', undefined, 'x'.repeat(16))).toBe(2);
    expect(cmdUnits('text', undefined, 'x'.repeat(17))).toBe(3);
  });
  it('snapScene/restoreScene rewind and fast-forward without aliasing the live buffer', () => {
    const s = new SceneBuilder(DEFAULT_LIMITS);
    const circle = (x: number) => s.draw('circle', [x, 0, 1, color(1, 1, 1), null, 1]);
    circle(1);
    const early = snapScene(s);
    circle(2);
    circle(3);
    const late = snapScene(s);
    restoreScene(s, early);
    expect(s.cmds).toHaveLength(1);
    expect(s.units).toBe(1);
    circle(9); // drawing after a restore must not mutate either snapshot
    expect(early.cmds).toHaveLength(1);
    expect(late.cmds).toHaveLength(3);
    restoreScene(s, late); // forward in time: the array is replaced, not truncated
    expect(s.cmds.map((c) => c.a.x)).toEqual([1, 2, 3]);
    expect(s.units).toBe(3);
  });
  it('snapScene keeps the group stack: popping after a restore returns to the right transform', () => {
    const s = new SceneBuilder(DEFAULT_LIMITS);
    s.pushGroup(point(10, 0), 0, 1, 1);
    const inside = snapScene(s);
    s.popGroup();
    expect(s.depth()).toBe(0);
    restoreScene(s, inside);
    expect(s.depth()).toBe(1);
    s.draw('circle', [0, 0, 1, color(1, 1, 1), null, 1]);
    expect(s.cmds[0]!.m[4]).toBe(10);
  });
});

describe('SceneBuilder groups', () => {
  it('composes translate, rotate and scale in order and clamps opacity', () => {
    const s = new SceneBuilder(DEFAULT_LIMITS);
    s.pushGroup(point(5, 6), 90, 2, 0.5);
    s.pushGroup(point(0, 0), 0, 1, 4); // opacity multiplies, clamped to 1 per group
    s.draw('circle', [0, 0, 1, color(1, 1, 1), null, 1]);
    const [a, b, c, d, e, f] = s.cmds[0]!.m;
    expect([a, b, c, d, e, f]).toEqual([0, 2, -2, 0, 5, 6]);
    expect(s.cmds[0]!.o).toBe(0.5);
  });
  it('faults R011 past the group depth limit, and popGroup never pops the root', () => {
    const s = new SceneBuilder({ ...DEFAULT_LIMITS, maxGroupDepth: 2 });
    for (let i = 0; i < 2; i++) s.pushGroup(point(0, 0), 0, 1, 1);
    expect(s.depth()).toBe(2);
    expect(fault(() => s.pushGroup(point(0, 0), 0, 1, 1))).toBe('R011');
    const t = new SceneBuilder(DEFAULT_LIMITS);
    t.popGroup();
    t.popGroup();
    expect(t.depth()).toBe(0);
  });
  it('faults R010 on a negative radius and R005 past the per-frame draw limit', () => {
    const s = new SceneBuilder({ ...DEFAULT_LIMITS, maxDrawsPerFrame: 2 });
    expect(fault(() => s.draw('circle', [0, 0, -1, color(1, 1, 1), null, 1]))).toBe('R010');
    s.draw('circle', [0, 0, 1, color(1, 1, 1), null, 1]);
    s.draw('circle', [0, 0, 1, color(1, 1, 1), null, 1]);
    expect(fault(() => s.draw('circle', [0, 0, 1, color(1, 1, 1), null, 1]))).toBe('R005');
  });
});

describe('primitive signature table', () => {
  it('every parameter has a type, defaults only after required ones, and the doc names each parameter', () => {
    for (const kind of PRIMITIVE_KINDS) {
      const sig = PRIMITIVES[kind]!;
      let seenDefault = false;
      for (const p of sig.params) {
        expect(p.type.length, `${kind}.${p.name}`).toBeGreaterThan(0);
        if ('default' in p) seenDefault = true;
        else expect(seenDefault, `${kind}.${p.name} is required after an optional one`).toBe(false);
        expect(sig.doc, `${kind} doc mentions ${p.name}`).toContain(p.name);
      }
    }
    expect(GROUP_SIG.params.map((p) => p.name)).toEqual(['translate', 'rotate', 'scale', 'opacity']);
  });
  it('the table is the five documented primitives', () => {
    expect(PRIMITIVE_KINDS.sort()).toEqual(['circle', 'line', 'path', 'rect', 'text']);
  });
});
