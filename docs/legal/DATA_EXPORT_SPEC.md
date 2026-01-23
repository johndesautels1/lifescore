# Data Export Specification

**Clues Intelligence LTD**
**Version:** 1.0 | **Last Updated:** January 23, 2026

---

## Overview

GDPR Article 20 "Right to Data Portability" - Users can download all their data in machine-readable format.

---

## API Endpoint

```
POST /api/user/export
Authorization: Bearer {token}

Response (200): { "downloadUrl": "https://...", "expiresAt": "..." }
```

---

## Export Format (JSON)

```json
{
  "exportInfo": {
    "generatedAt": "2026-01-23T12:00:00Z",
    "userId": "uuid",
    "format": "CLUES_DATA_EXPORT_V1"
  },
  "profile": {
    "email": "user@example.com",
    "fullName": "John Doe",
    "createdAt": "2025-06-15T...",
    "tier": "pro",
    "preferences": { ... }
  },
  "comparisons": [
    {
      "id": "uuid",
      "city1": "Austin, TX",
      "city2": "Miami, FL",
      "scores": { ... },
      "createdAt": "...",
      "notes": "..."
    }
  ],
  "oliviaConversations": [
    {
      "id": "uuid",
      "messages": [
        { "role": "user", "content": "...", "timestamp": "..." }
      ]
    }
  ],
  "reports": [
    {
      "id": "uuid",
      "comparison": "Austin vs Miami",
      "gammaUrl": "https://...",
      "createdAt": "..."
    }
  ]
}
```

---

## UI Location

**Path:** Account Settings > Privacy & Data > Download My Data

**Button:** "Download My Data" → Generates ZIP with JSON + PDF reports

---

## Security

- Requires re-authentication
- Download link expires in 1 hour
- Rate limit: 1 export per 24 hours
- Audit logged

---

**Implementation Status:** Specification Complete
**Estimated Effort:** 4-6 hours
