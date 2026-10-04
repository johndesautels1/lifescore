# LIFE SCORE Gamma Prompts Manual

**Last Reviewed:** 4 October 2026
**Document ID:** LS-GPM-001
**For:** administrators and developers (restricted in the admin panel)

How LIFE SCORE turns a comparison into a Gamma visual report: where users ask for one, what is sent to Gamma, what the prompt contains, and how to change it. The Enhanced report's section list is written into this manual from the code each time it is opened. Each written section names the code it explains and is brought up to date automatically when that code changes (Technical Support Manual, section 14).

---

## 1. Where users make a report
<!-- covers: src/components/VisualsTab.tsx -->

**Visuals** tab → **Generate a New Report** → choose a saved comparison →

- **Report Type**: *Standard (35 pages)* for any comparison, or *Enhanced (82 pages)* for an Enhanced (multi-model) comparison; with Enhanced, **Include Gun Rights Comparison (adds 4 pages)**;
- **Export Format**: PDF or PowerPoint;
- **Generate Visual Report**.

The tab checks the month's Gamma allowance first (the server checks again and counts it). While Gamma works, the tab shows its progress; the finished report opens in the tab, with its PDF or PowerPoint, and is saved to the user's reports (browser and account). **View Existing Report** lists them.

---

## 2. What is sent to Gamma
<!-- covers: api/gamma.ts -->

The browser builds the prompt and posts it to `/api/gamma`, which calls Gamma:

| | |
|---|---|
| Create | `POST https://public-api.gamma.app/v1.0/generations/from-template`, header `X-API-KEY` (`GAMMA_API_KEY`) |
| Template | `gammaId` = `GAMMA_TEMPLATE_ID` (required) |
| Theme, folder | `themeId` = `GAMMA_THEME_ID` (ignored if it looks like a key, `sk-…`); `folderIds` = `GAMMA_FOLDER_ID`, when set |
| Prompt | the report text, at most 100,000 characters (the server refuses longer) |
| Export | `exportAs` = `pdf` or `pptx` |
| Sharing | workspace and external access: view |
| Status | `GET …/generations/{id}`, asked by the browser through `/api/gamma?generationId=…` |
| Time limits | 60 s per Gamma call; 30 s to copy an export |

- **The allowance** — creating a report needs sign-in and counts one Gamma report against the month's allowance (`requireFeature(…, 'gammaReports', { consume: true })`); if Gamma refuses the request, the report is given back (`refundFeature`). Checking status counts nothing.
- **Waiting** — the browser asks every 5 seconds: up to 5 minutes for a Standard report, 15 minutes for an Enhanced one (82 pages with images usually take 8–12).
- **Keeping the files** — when a report is finished, the server copies its PDF and PowerPoint from Gamma's links (which expire) into the `gamma-exports` bucket and returns the lasting links; if the copy fails, Gamma's own link is used.

---

## 3. The Standard report prompt
<!-- covers: src/services/gammaService.ts -->

Written by `formatComparisonForGamma()`. It carries the two cities, the winner and the score difference, a table of both cities' scores with the winner marked **🏆 WINNER**, every category with all of its metrics and both cities' scores, a short methodology and the company description, and asks Gamma for a **30-page** report with compact tables.

- **Trophy rule** — the prompt tells Gamma the 🏆 goes only next to the winner (Gamma used to put it beside the loser).
- The button says 35 pages; the prompt asks for 30.

---

## 4. The Enhanced report prompt
<!-- covers: src/services/gammaService.ts -->

Written by `formatEnhancedReportForGamma()` from the Enhanced comparison, the Judge's Report when there is one, and the gun-rights comparison when ticked. It opens with the report details (cities, winner and loser with scores, difference, date, report id), names the evaluators that scored this comparison (`llmsUsed`, with their current model names from `api/shared/models.ts`) and the judge, gives Gamma its layout vocabulary and colours, then the sections, in this order:

<!-- facts:gammasections -->
<!-- /facts:gammasections -->

- **Layout vocabulary** — Gamma's smart layouts: `semiCircle` gauges, `barStats` bars (used for the agreement heat maps, because Gamma drops colours set on `solidBoxes`), `processSteps`, `outlineBoxes`, `imagesText`, tables, `rings` / `venn` / `target` diagrams, labels, blockquotes and asides; images behind, left or right.
- **Colours** — winner gold #FFD700 / green #10B981; loser blue #1E90FF; law purple #6B46C1; lived teal #14B8A6; agreement above 90 % dark green, 85–90 % green, 70–85 % yellow, below 70 % orange; warnings red/orange.
- **Closing instructions** — all 82 pages, varied visuals, AI images for the lifestyle sections, no truncation, the model names as given, the colours throughout, gun rights unscored (facts only, no winner), citations from both cities.
- **Size** — the browser warns above 95,000 characters and stops above 100,000, suggesting the gun-rights section be left out.

---

## 5. Changing a prompt

- **The prompts that run are in the code** — `src/services/gammaService.ts`. Change them there, push, and make a report to see what Gamma does with it.
- **The admin panel's Prompts screen** (Gamma tab and the others) shows reference copies from the `app_prompts` table, last edited in March 2026. Nothing in the app reads them, so the screen says so and has no editing (John, 4 October 2026); the server refuses edits.
- **`docs/GAMMA_PROMPT_TEMPLATE.md`** is a copy of the Enhanced prompt as it stood on 7 February 2026, written for Gamma's support team; it is not used by the app.

---

## 6. Known problems (4 October 2026)

Read from the code while writing this manual; each changes what a report says, so each waits for a ruling (or says how it was ruled).

1. ~~Sections sent out of order and misnumbered~~ — **fixed 4 October 2026** (John: "keep order, renumber"): sections 1–13 and pages 1–82 now run in the order sent (`tests/gammaPrompt.test.ts`).
2. ~~The prompt always names all five evaluators~~ — **fixed 4 October 2026** (John: "only those used"): every list of models, and the count of scores, follows the models that took part (`tests/gammaModels.test.ts`).
3. **The Standard button says 35 pages; the prompt asks for 30.**
4. ~~The Prompts screen edits nothing~~ — **fixed 4 October 2026** (John: "say so, read-only"): it is marked as reference copies and editing is gone (`tests/gammaPrompt.test.ts`).
