# Decisions log

Any decision that deviates from the locked decisions in §0 of `homestead_prompt_doc.md`,
recorded here with reasoning. The §0 table is settled and not re-litigated; this file is
only for genuine, justified deviations and for resolving flagged unknowns.

## 2026-07-25 — Setup

- **Environment: Windows, not macOS.** The build doc's setup commands assume macOS
  (`~/Desktop`, `brew`, Terminal). Adapted to Windows 11 / PowerShell. Project root is
  `C:\Users\irsal\Desktop\homestead`. No functional deviation — same repo, same structure.
- No deviations from §0 locked decisions.

## 2026-07-25 — Deploy wiring

- **Vercel project pre-existed** (created by Irene): `homestead` under team
  `irsaliendradf-projects`, Git-connected to the GitHub `main` branch. Production URL:
  https://homestead-rho-lac.vercel.app/ . No `vercel link` / CLI login was needed on my
  side — the GitHub → Vercel integration drives deploys.
- Framework preset shows `null` in project settings, but Vercel **auto-detects Vite** from
  `package.json` on each build (confirmed in build logs: `vite build` → `dist/`). Working as
  the doc intends; no manual preset needed. If a future build ever fails to detect, set
  preset = Vite / output = dist in the dashboard.
- **Repo is PUBLIC**, not private as the doc's `gh repo create --private` suggested (it's
  Irene's existing repo). Not a blocker: no secrets are committed and `.env*` is gitignored.
  IMPORTANT for Phase 6.3 — the Anthropic key must live ONLY in Vercel env vars, never
  committed, which matters more given the repo is public. Flagged, not changed.
- Fonts: confirmed staying on Google Fonts per Irene (2026-07-25). No @fontsource dep.
