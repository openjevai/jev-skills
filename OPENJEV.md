# OpenJEV support

This fork adds optional [OpenJEV](https://openjev.sh) support alongside TypeSafe.
TypeSafe direct remains the default; anyone with a `TYPESAFE_API_KEY` sees zero
behaviour change.

## What was added

- **`examples/decisions/run.mjs`** — provider selection: `JEV_PROVIDER=openjev` wins;
  TypeSafe if its key is set (default); OpenJEV if only `OPENJEV_API_KEY` is set.
  The OpenJEV path uses `fetch` to `https://api.openjev.sh/v1/systemone` with model
  `openjev`, no SDK required. Handles HTTP 429/503 with `Retry-After`.
- **`.env.example`** — added `OPENJEV_API_KEY` and `JEV_PROVIDER` entries (commented).
- **`README.md`** — short OpenJEV note after the intro, TypeSafe credited first.
- **`examples/decisions/README.md`** — instructions for the OpenJEV live path.
- **`skills/jev-builder/references/setup.md`** — OpenJEV gateway section with endpoint,
  model, key, and overload-status differences.

## Provider selection rule

1. `JEV_PROVIDER=openjev` (explicit) → OpenJEV.
2. `TYPESAFE_API_KEY` set → TypeSafe direct (default, unchanged).
3. Only `OPENJEV_API_KEY` set → OpenJEV.

## Configuration

Set `OPENJEV_API_KEY` in the environment or a gitignored `.env` file. Get a key from
[the OpenJEV dashboard](https://openjev.sh/dashboard). To force OpenJEV even when a
TypeSafe key is present, set `JEV_PROVIDER=openjev`.

## Verification

A live POST to `https://api.openjev.sh/v1/systemone` with model `openjev`, state
`ping`, and one noul question returned HTTP 200. No repository code was executed.
Re-grep confirmed no hardcoded `api.typesafe.ai` default was introduced in the
OpenJEV path.

## Upstream

Original project: https://github.com/laguagu/jev-skills by @laguagu.
