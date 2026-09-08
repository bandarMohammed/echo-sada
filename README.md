# ECHO | صدى

**The Patient's Second Memory** — a healthcare *intelligence* layer that turns existing health data into a continuous, understandable health journey.

> ECHO **analyzes → detects → explains → recommends → alerts**. It **never diagnoses**, and it does **not** replace healthcare professionals. All data in this demo is **synthetic**.

---

## 1. Overview

ECHO is a bilingual (Arabic‑first, RTL/LTR) healthcare intelligence platform. It reads a patient's longitudinal record, detects clinically meaningful patterns deterministically, turns them into persistent **Clinical Threads**, and presents them to two audiences with one shared source of truth:

- **Patients** — a simple, reassuring view of what changed and what may deserve attention.
- **Doctors** — a concise, evidence‑linked pre‑visit briefing of the same patient story.

## 2. Problem

Healthcare data already exists, but it is fragmented across visits, labs, and reports. Important signals — a worsening trend, an overdue follow‑up, a recurring symptom — get lost between encounters. Patients don't see the thread; clinicians spend scarce minutes reconstructing it.

## 3. Solution

ECHO sits on top of existing data and makes the journey legible:

```
Encounter → Symptom → Lab → Result → Recommendation → Follow-up → Later encounter → New result
```

A **deterministic detection engine** finds five kinds of patterns — *unresolved follow‑up, repeated pattern, meaningful change, incomplete thread, preventive opportunity* — each traceable to real records. Detections become **Clinical Threads** with a lifecycle (open → acknowledged → resolved). An **AI layer** explains and prioritizes them in natural language for each audience, but never invents facts and never creates a thread.

## 4. Key Features

- **Deterministic detection engine** with a hidden **ground‑truth** harness (12/12 patterns detected).
- **Clinical Threads** — persistent, evidence‑grounded, deduplicated care items with a real lifecycle.
- **Doctor ECHO Pre‑Visit Briefing** — structured, evidence‑linked, non‑diagnostic synthesis.
- **Patient ECHO Chat** — streaming, grounded, bilingual, with an on‑demand explanation of any thread.
- **Alerts & Recommendations** — a derived presentation of open threads + data‑freshness nudges.
- **Central authorization** — patient‑level isolation and doctor‑to‑patient scoping enforced server‑side.
- **Arabic‑first** UI with full RTL/LTR support.

## 5. Patient Experience

Dashboard (insights + freshness) → Health Timeline → Lab Results (with trend charts) → Medications → Reports → Appointments → Care Team → Profile → **Care Threads** → **Alerts & Recommendations** → **ECHO Chat**. Language is plain and reassuring; every insight links to its source; nothing is presented as a diagnosis.

## 6. Doctor Experience

Caseload (authorized patients only) → Patient view: **Clinical Threads** (severity, status, evidence, recommendation) → attention/freshness → Labs & trends → Clinical timeline → **Doctor ECHO Pre‑Visit Briefing** (journey summary, key changes, unresolved threads, what's worth reviewing today) — the same underlying story, framed for a clinician.

## 7. AI / Intelligence Architecture

- **Detectors are the source of truth.** Deterministic domain code finds and evidences every pattern; it is unit‑tested and eval‑verified.
- **AI explains, never invents.** A swappable `AIProvider` interface (OpenAI adapter + deterministic mock adapter) synthesizes/prioritizes/narrates over a **bounded, authorized context**.
- **Validated & evidence‑scrubbed.** All AI output is Zod‑validated server‑side; evidence references are replaced with authoritative values from the record index, and unsupported claims are dropped.
- **Deterministic fallback.** If the model fails or returns invalid output, ECHO degrades to a grounded deterministic briefing — the experience never breaks.
- The **OpenAI key never leaves the server**; all AI calls are server‑side.

## 8. Technology Stack

- **Next.js 16** (App Router) · **TypeScript** · **Tailwind CSS**
- **PostgreSQL (Neon serverless)** · **Prisma** ORM
- **next-intl** (Arabic/English, RTL/LTR) · **Recharts** (trends) · **lucide-react**
- **Zod** (input + AI‑output validation) · **OpenAI** (behind a provider abstraction)
- **Vitest** (unit/domain) · **Playwright** (E2E)

## 9. Demo

Primary hero: **Patient 04**.

```
Patient 04 → Dashboard → ECHO detects the HbA1c change (6.4 → 8.3)
→ open it, see the evidence → see the overdue cardiology follow-up
→ Alerts & Recommendations → Ask ECHO
→ switch to Doctor → open Patient 04 → Doctor ECHO Pre-Visit Briefing
→ the same clinical story, from the doctor's side.
```

Demo mode opens directly into a role/patient switcher (no login) — while the architecture is built around real authorization so it can be added without a rewrite.

## 10. Project Structure

```
prisma/
  schema.prisma            # clinical data model
  seed/                    # deterministic synthetic generator + ground-truth + eval
src/
  app/[locale]/            # patient & doctor routes (RTL/LTR)
  app/api/echo/chat/       # streaming chat route (server-side AI)
  components/              # UI (patient, doctor, threads, shell)
  domain/                  # detection engine, threads, timeline, freshness, attention (pure)
  data/                    # HealthDataProvider + authorization policy + thread service
  ai/                      # AIProvider abstraction, adapters, context builders, schemas
  i18n/ · config/ · lib/
messages/                  # ar.json, en.json
tests/e2e/                 # Playwright specs
```

## 11. Running Locally

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values (see below)
npm run db:migrate          # apply schema to your database
npm run db:seed             # load synthetic data (10 patients, 50 doctors, Patient 04 hero)
npm run dev                 # http://localhost:3000
```

Quality gates:

```bash
npm run typecheck
npm test                    # unit/domain
npm run eval:groundtruth    # expect 12/12
npm run test:e2e            # Playwright (uses the mock AI provider)
npm run build
```

## 12. Environment Variables

Copy `.env.example` → `.env` and provide values (placeholders only shown here):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon **pooled** Postgres connection (runtime) |
| `DIRECT_URL` | Neon **direct** connection (migrations) |
| `AI_PROVIDER` | `openai` or `mock` (deterministic, no key) |
| `OPENAI_API_KEY` | OpenAI key — **server‑side only**, never exposed to the browser |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` |
| `DEMO_MODE` | `true` opens directly into the demo switcher |
| `APP_DEFAULT_LOCALE` | `ar` (Arabic‑first) or `en` |

Never commit `.env`. On Vercel, set these in the project's Environment Variables (the OpenAI key and database URLs stay server‑side).

## 13. Safety / Scope

- **ECHO does not diagnose** and does **not** replace healthcare professionals.
- All data is **synthetic/demo data** — no real patient data is used.
- Authorization, patient‑level isolation, and server‑side AI are first‑class, but this is a **prototype**, not a certified, production‑compliant healthcare system.
- Future integration with national healthcare platforms (e.g. Sehhaty) would require **official, authorized APIs** — no unofficial access is implemented or implied.

## 14. Hackathon Notes

- **Ground Truth: 12/12** designed patterns detected; **52 unit tests**, **11 E2E tests** passing; TypeScript clean; production build passing.
- The intelligence core, detection engine, Clinical Threads, and AI abstraction are modular and API‑ready for future data providers and care modules.
- Built as a coherent single architecture: *Detection → Clinical Thread → Alert/Recommendation/Briefing presentation.*

---

*ECHO | صدى — turning health data that already exists into a health journey people can understand.*
