# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@tm11/mmgeo` — an NPM package providing Myanmar geographic data (states → districts → townships) with bilingual (English/Myanmar) names. No runtime server; it's a small data library.

## Commands

- `npm test` — run Jest tests (ts-jest, tests live in `src/test/**/*.test.ts`)
- `npm test -- -t "test name"` — run a single test by name
- `npm run build` — compile TypeScript to `dist/` (also emits `.d.ts`)

## Architecture

- `data/db.json` — the source of truth: all states/districts/townships. Note: JSON uses `eng` for English names, while the public API exposes `en` — `src/index.ts` does this mapping. (A near-duplicate `db.json` also sits at the repo root; `src/index.ts` imports `data/db.json`.)
- `src/index.ts` — defines `Township`, `District`, `State` classes and `getStates()`, which wraps the JSON into class instances. Public entry point.
- `src/config.ts` — module-level global language state (`'en' | 'mm'`), set via `configure()` / read via `getCurrentLanguage()`.
- `src/hook.ts` — `initialize({ language })`, the public wrapper around `configure()`; re-exported from `index.ts`.
- `src/utils.ts` — `getName()` picks `en` vs `mm` based on the current global language. All `getName()` methods on the classes delegate here.
- `src/types.ts` — interfaces (`State`, `District`, `Township`, `MyanmarGeoData`); note these use `en`, matching the API shape, not the raw JSON.

Language selection is global mutable state: calling `initialize({ language: 'mm' })` affects all subsequent `getName()` calls package-wide. Tests rely on the default being `'en'`, so test order matters.

## Notes

- `tsconfig.json` uses `resolveJsonModule` to import `db.json` directly; `rootDir` is `src` but the JSON lives outside it, so build output layout depends on this import — be careful when moving `data/`.
- Package is published to NPM; `main`/`types` point at `dist/`.
