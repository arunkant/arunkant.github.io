---
title: Arun Kant Sharma
permalink: /resume/
---

**Engineering Leader · AI Products & Infrastructure**

Bengaluru, India (open to remote) · iarunkant@gmail.com

---

## Experience

### Qure.AI Technology Pvt. Ltd. — *Jul 2018 – May 2025*
Medical-imaging AI company building deep-learning products deployed across 80+ countries and 2,000+ sites.

**VP of Engineering, Global Health Business Unit** — *2023 – May 2025*
- Led engineering for qXR (chest X-ray AI) bundled with qTrack (patient workflow and care-coordination), Qure’s largest deployed product line, scaling its global footprint to 80+ countries and 2,000+ deployment sites.
- Built and ran a team of ~20 engineers (direct + indirect reports) across product engineering, deployment, and operations.
- Standardized and automated the on-prem deployment process, cutting deployment time from ~2 hours to ~15 minutes per site and enabling a single engineer to oversee ~10 concurrent deployments.
- Reduced product-related customer complaints through a mix of eliminating root causes, designing graceful fallbacks for failure modes, and routing recurring issues into the product roadmap.
- Tightened the development process for shipping ML models to edge hardware (laptops attached to X-ray machines): partner-in-the-loop testing, regression coverage, and structured incident response.
- Partnered with regulatory/QMS function on engineering inputs for CE/FDA-aligned processes.

**VP of Engineering** — *2021 – 2023*
- Took on a platform-engineering charter spanning Qure’s three product lines (qXR, qER, qTrack), which had been operating as independent engineering and product orgs with significant duplicated effort. Worked alongside the existing product teams rather than above them.
- Drove the consolidation of all product engineering into a **single monorepo and unified platform** with Bazel as the build system — executed by a small dedicated team of 2–3 engineers over ~6 months while the product teams continued delivering against business commitments.
- Personally led the migration hands-on and owned the platform through stabilization before handing off ownership to a dedicated team.
- Within ~1 year, the legacy product stacks were frozen to maintenance-only and many existing cloud customers were migrated onto the new platform — turning the platform from an internal initiative into the de facto base for all new product work.
- Outcomes:
  - **Flexible staffing** — engineers could move across product lines without context-switching cost, ending the "engineer is stuck on product X" bottleneck.
  - **Unified test suite** — eliminated entire classes of artifact-versioning and cross-product integration bugs that previously surfaced only at release time.
  - **Reusable platform features** — capabilities built once (auth, model serving, deployment, telemetry) became available to every product, removing the duplicated-work tax across teams.
- Unified the customer-facing APIs across products on top of this platform, reducing integration surface area for hospital/partner customers and for internal teams building on top.

**AI Engineer / Backend Engineer** — *2018 – 2021*
- Designed and built the backend serving deep-learning models over web APIs — Python services, model-runner workers, reliable job queues, and persistent storage.
- Architected cloud infrastructure for qXR (chest X-ray), qER (head CT), and qTrack (patient workflow and care-coordination), including the separation of inference workloads from API tier for scalability.
- Established patterns for reliable async inference (queueing, retries, idempotency) that later became the basis for Qure’s broader serving stack.

### Times Internet Ltd., Noida — *Software Developer · Aug 2015 – Sep 2017*
- Built the backend for **NewsPoint**, a news-aggregator app: feed crawling, HTTP APIs, publisher on-boarding automation, admin panel, reporting, error monitoring, and a system to dedupe near-identical articles.
- Built a daily pipeline to convert PDF newspapers into mobile-optimized formats for distribution.
- Designed a centralized, scalable email service consolidating fragmented email sending across the org, lowering TCO and improving monitoring.
- Led migration from MSSQL to **Titan (graph DB) + Cassandra**: redesigned data models, built sync services between old and new stores, and shipped APIs for downstream applications.

---

## Independent Projects — *May 2025 – Present*

After leaving Qure, took focused time to build AI products solo. Both are live; pre-traction.

- **[releasedog.com](https://releasedog.com)** — AI-powered changelog tool that turns commits, PRs, and tickets into structured release notes for product and engineering teams.
- **[Vellum](https://www.arunkant.com/vellum/)** — AI-powered screenshot app for macOS. Auto-describes screenshots, extracts text (OCR) to make them searchable, suggests AI-generated tags, and provides keyboard shortcuts for common workflows (send to Slack/Jira, add shadow, etc.).

Continuing to build and ship while exploring full-time engineering leadership roles.

---

## Education

**B.Tech, Electrical Engineering** — *Indian Institute of Technology Kanpur, 2015*

---

## Selected Achievements

- **Winner, AnalyzeThis 2014** (American Express, 700+ teams from IITs) — multinomial logistic regression for filtering, p-value-based feature selection, random forest classification.
- **All India Rank 377, IIT-JEE 2010** (out of ~500,000 candidates).

---

## Technical Skills

**Languages:** Python, Java, JavaScript, Bash
**AI / ML Serving:** model serving over HTTP, async inference pipelines, job queues, edge deployment of DL models
**Infrastructure:** AWS, Docker, CI/CD, Bazel, on-prem deployment automation
**Data:** PostgreSQL, RabbitMQ / queue-based messaging
**Practices:** distributed systems design, API design, incident response, engineering process for regulated/clinical software
