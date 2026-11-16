# PAPER TIGER COMPILER WORKS: features

**Retired.** PAPER TIGER COMPILER WORKS was merged into THE IMPOSSIBLE COMPILER WORKS on 2026-11-13. Its compiler,
virtual machine, reference interpreter, fuzzer and browser IDE now live, with their history, as the Compiler wing of
that combined project. This repository stays available as it was. This file is short on purpose: the full feature
list is in the base repository's `FEATURES.md`.

- **Repo:** AlexRosen23/paper-tiger-compiler-works (public) · **Folder:** `~/Desktop/Claude Projects/Paper Tiger Compiler Works`
- **Status:** *Retired (absorbed into THE IMPOSSIBLE COMPILER WORKS, repo `impossible-compiler-works`)* · **Version:** 0.2.0 · **`main`:** `d15777b` (2026-11-15)
- **Last updated:** 2026-11-15, written from the README, docs, tests and merged-PR history.
- **Base repo:** [AlexRosen23/impossible-compiler-works](https://github.com/AlexRosen23/impossible-compiler-works). Its `FEATURES.md` was not on its `main` when this file was written (checked 2026-11-15), so its pull-request list may carry it.

## Where each former feature lives now

The base project keeps the compiler under `wings/compiler/` (its README names `wings/compiler/docs/LIMITATIONS.md`,
`wings/compiler/evidence/` and `wings/compiler/examples/`). Folder-level mapping beyond those paths is *unverified*.

| Former feature (this repo) | Where it lives now |
| --- | --- |
| FOLIO language: typed diagram DSL, 13 example programs in `examples/` | Compiler wing, `wings/compiler/examples/` |
| Front end: hand-written lexer, recursive-descent parser, static checker, documented diagnostic codes | Compiler wing |
| Middle end: register IR in basic blocks, IR verifier, three passes (constant folding with propagation, dead-code elimination, CSE with copy propagation) | Compiler wing; the Witness wing also checks every order and repetition of these passes against the reference interpreter |
| Back end: stack bytecode with sha256 hash, bytecode verifier, sandboxed VM (fuel, stack and call-depth limits) | Compiler wing |
| Reference interpreter (the oracle), differential tests over 7 pass configurations | Compiler wing |
| Seeded type-directed fuzzer with reducer; fault lab (14 red-team cases in `examples/failures/`) | Compiler wing (`npm run fuzz`, `npm run pass-check`) |
| Run receipts and `reproduce` (rebuild from scratch, reject tampering) | Compiler wing, `wings/compiler/evidence/receipts/` |
| Eight-mode browser IDE: Editorial, Syntax Furnace, Type Observatory, Lowering Floor, Optimization Duel, Bytecode Theater, Failure Gallery, Proof Cabinet | `/compiler/` page of the combined app (`http://127.0.0.1:5720/compiler/` per the base README) |
| Loopback API with SQLite project history | Compiler wing server (not described further here; *unverified*) |
| Debugger, formatter, command-line compiler (`npm run folio`) | Compiler wing (`npm run folio -- wings/compiler/examples/03-orrery.folio`) |

## What was dropped

- Nothing is recorded as dropped. The base README says the compiler "lives on, with its history".
- The app name, repo name and its own port are retired as a product. The IDE is now one of two wings under a shared shell.
- The static browser demo (below) is described in this repo only; whether the base project carries it is *unverified*.

## What this repo still contains (frozen)

- **FOLIO compiler, VM, oracle and IDE** at version 0.2.0 (`core/`, `server/`, `web/`, `examples/`, `docs/`).
- **Static browser demo** *(Live in this repo)*: building with `VITE_DEMO=1` makes the IDE make no server call. The
  server chip reads "browser demo · local only"; save, history, fork, bundle import and the Proof Cabinet's run
  records say they need the full app. Edits are kept in `sessionStorage`. `web/src/demoCsp.ts`, `tests/demo-build.test.ts`.
- **Evidence** committed in the repo: fuzz summary, benchmarks, three receipts and seven screenshots (`evidence/`).

## How to run the old version

It still runs from this repo. Needs Node 24 or newer; no native add-ons (SQLite is `node:sqlite`).

```bash
npm install
npm start          # builds the IDE and serves it with the API on 127.0.0.1:5580
npm run check      # typecheck, lint, tests, build
npm run folio -- examples/03-orrery.folio --opt --ir --bc
```

Environment names read by the app are listed in `docs/` and `server/`; none is needed for a default run.
Hot-reload development: `npm run server` (API, 127.0.0.1:5580) and `npm run web` (IDE, 127.0.0.1:5581).

## Tests and evidence (as of the last commit)

- The README states 126 unit, differential, fuzz, optimizer, bytecode, debugger, receipt, regression, security and
  API tests (`npm test`), and 10 Playwright tests (`npm run e2e`).
- Counted from source on 2026-11-15, not run: `it(` or `test(` lines per file are `e2e/ide.spec.ts` 10,
  `tests/backend.test.ts` 14, `demo-build` 1, `differential` 4 (these expand to 21 tests through table-driven cases),
  `docs` 2, `frontend` 17, `optimizer` 12, `regressions` 10, `security` 16, `server` 15, `static` 4. Source-line
  counts differ from the README's total because some tests are generated from tables; the README figure is the
  recorded one (as of version 0.2.0, 2026-11-13).
- Recorded evidence: `evidence/fuzz-summary.json`, `evidence/benchmarks.json`, `evidence/receipts/`.
  The base README quotes a 4,000-program fuzz run with 0 divergences for the Compiler wing.

## Change log

| Date | PR | Change |
| --- | --- | --- |
| 2026-11-15 | #7 | Static browser demo mode (`VITE_DEMO=1`): no server calls, CSP-safe editor styles. |
| 2026-11-13 | #6 | README links the combined project under its new repository name. |
| 2026-11-13 | #5 | README notes the merge into THE IMPOSSIBLE COMPILER WORKS and links the public combined repo. |
| 2026-11-13 | #4 | Security round: CI actions pinned to commit SHAs; inline icon annotated for the static scanner. |
| 2026-11-13 | #3 | Version 0.2.0: every red-team finding fixed and covered by a regression test; public security policy; evidence regenerated. |
| 2026-11-13 | #2 | Only the owner's own app may frame the IDE (frame-embedding rule). |
| 2026-11-12 | #1 | Version 0.1: FOLIO compiler, VM, reference interpreter, fuzzer, receipts, loopback API and eight-mode IDE. |

## Keeping this file true

- This repo is frozen. Feature work happens in `impossible-compiler-works`; update its `FEATURES.md` there.
- Only change this file if something here changes (for example a new static-demo fix) or the mapping above is checked and corrected.
- Only what is true: items marked *unverified* stay that way until someone checks the base repo.
