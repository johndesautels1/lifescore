# Olivia's Evidence Lookup (get_field_evidence)

**Last Updated:** October 3, 2026

When someone asks Olivia where a score came from, she can look up the web sources behind
any metric of the comparison they are viewing.

## How it works

- Olivia's chat route (`api/olivia/chat.ts`) offers Claude one tool, `get_field_evidence`,
  with two inputs: `metricId` (required) and `city` (optional, one of the two cities).
- When Claude calls it, the route runs `lookupFieldEvidence()` from
  `api/shared/fieldEvidence.ts` directly — there is no internal HTTP call — and returns the
  sources (title, link, quoted snippet) and both cities' scores for that metric.
- The comparison id comes from the comparison the user has open, never from the model.
- The lookup reads **only the signed-in user's own saved comparisons** (it once read any
  comparison by id; fixed 3 October 2026).
- Olivia may use the tool up to three times per message.

The same lookup also answers `POST /api/olivia/field-evidence` for the app's own screens.

## History

Before August 2026 this was an OpenAI Assistants "function" configured in OpenAI's
dashboard and answered through an HTTP call back into the app. OpenAI switched the
Assistants service off on 26 August 2026; the tool now lives entirely in this repository.
