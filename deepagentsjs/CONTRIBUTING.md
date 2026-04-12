# Contributing (ASST / `deepagentsjs`)

- **Production-style code:** avoid filler comments and noisy AI-style prose; explain non-obvious invariants only.
- **Tests — no mocks (strict):** do **not** use `vi.mock`, `jest.mock`, module stubs, spies on `fetch`/`child_process`/FS, or fake implementations of collaborators. Exercise **real** code with **real** inputs: temp files on disk, real `pnpm exec tsx` / `git` / `semgrep` when on `PATH`, and integration tests that run the actual CLI. Pure in-memory **fixtures** (plain objects, JSON literals) are allowed only for data that is not an external system.
- **Assurance Run:** P2 Semgrep/SARIF lives under `examples/assurance-run/`; see [docs/TOOLS-MAP.md](docs/TOOLS-MAP.md) for the TOOLS catalog mapping.
- **Tests:** `pnpm test:unit` from `deepagentsjs/` runs library unit tests plus `@asst/assurance-run`. Coverage gate: `pnpm --filter @asst/assurance-run test:coverage`.
- **Integration:** `pnpm --filter @asst/assurance-run test:int` runs manifest writer integration tests.
