# API security testing (Schemathesis-style)

When an HTTP service with an **OpenAPI** specification ships under `apps/` (or elsewhere), add contract and fuzz testing:

- [Schemathesis](https://schemathesis.readthedocs.io/) against `openapi.json`, or
- RESTler / similar for stateful fuzzing.

Until an API exists, rely on Semgrep, dependency audit (supply-chain lane), and CI hardening in `.github/workflows/`.
