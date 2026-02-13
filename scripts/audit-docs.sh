#!/bin/bash
# ============================================================================
# LIFE SCORE - Documentation Audit Script
#
# Introspects the codebase and reports what has changed since
# manuals were last updated. Run after any significant code changes
# to identify documentation that needs updating.
#
# Usage: bash scripts/audit-docs.sh
#
# Dependencies: grep, wc, find (standard Unix tools)
# ============================================================================

set -euo pipefail

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         LIFE SCORE - Documentation Audit Report             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ============================================================================
# 1. COUNT API ENDPOINTS
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. API ENDPOINTS (api/**/*.ts)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
API_COUNT=$(find api -name "*.ts" -not -path "*/shared/*" -not -path "*/node_modules/*" | wc -l)
echo "   Total API files: $API_COUNT"
echo "   Files:"
find api -name "*.ts" -not -path "*/shared/*" -not -path "*/node_modules/*" | sort | while read f; do
  echo "     - $f"
done
echo ""

# ============================================================================
# 2. COUNT COMPONENTS
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. REACT COMPONENTS (src/components/*.tsx)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
COMP_COUNT=$(find src/components -name "*.tsx" -maxdepth 1 | wc -l)
echo "   Total components: $COMP_COUNT"
find src/components -name "*.tsx" -maxdepth 1 -printf "     - %f\n" | sort
echo ""

# ============================================================================
# 3. COUNT HOOKS
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. CUSTOM HOOKS (src/hooks/*.ts)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HOOK_COUNT=$(find src/hooks -name "*.ts" -maxdepth 1 | wc -l)
echo "   Total hooks: $HOOK_COUNT"
find src/hooks -name "*.ts" -maxdepth 1 -printf "     - %f\n" | sort
echo ""

# ============================================================================
# 4. COUNT SERVICES
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. SERVICES (src/services/*.ts)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SVC_COUNT=$(find src/services -name "*.ts" -maxdepth 1 | wc -l)
echo "   Total services: $SVC_COUNT"
find src/services -name "*.ts" -maxdepth 1 -printf "     - %f\n" | sort
echo ""

# ============================================================================
# 5. COUNT DATABASE MIGRATIONS
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. DATABASE MIGRATIONS (supabase/migrations/*.sql)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MIG_COUNT=$(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l)
echo "   Total migrations: $MIG_COUNT"
echo "   Latest 10:"
find supabase/migrations -name "*.sql" 2>/dev/null | sort | tail -10 | while read f; do
  echo "     - $(basename $f)"
done
echo ""

# ============================================================================
# 6. ENVIRONMENT VARIABLES
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. ENVIRONMENT VARIABLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Count process.env references in API files
SERVER_VARS=$(grep -roh 'process\.env\.\w\+' api/ 2>/dev/null | sort -u | wc -l)
# Count VITE_ references in src files
CLIENT_VARS=$(grep -roh 'import\.meta\.env\.\w\+' src/ 2>/dev/null | sort -u | wc -l)
echo "   Server-side (process.env.*): $SERVER_VARS unique"
echo "   Client-side (import.meta.env.*): $CLIENT_VARS unique"
echo ""

# ============================================================================
# 7. MANUAL LAST-UPDATED DATES
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. MANUAL VERSIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for manual in docs/manuals/*.md; do
  name=$(basename "$manual")
  version=$(grep -m1 'Version:' "$manual" 2>/dev/null | head -1 || echo "unknown")
  updated=$(grep -m1 'Updated:' "$manual" 2>/dev/null | head -1 || echo "unknown")
  echo "   $name"
  echo "     $version"
  echo "     $updated"
done
echo ""

# ============================================================================
# 8. RECENTLY MODIFIED FILES (last 7 days)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. RECENTLY MODIFIED FILES (last 7 days)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
find api src supabase -name "*.ts" -o -name "*.tsx" -o -name "*.sql" 2>/dev/null | while read f; do
  if [ -f "$f" ]; then
    mod_time=$(stat -c %Y "$f" 2>/dev/null || echo 0)
    seven_days_ago=$(date -d '7 days ago' +%s 2>/dev/null || echo 0)
    if [ "$mod_time" -gt "$seven_days_ago" ] 2>/dev/null; then
      echo "   $(date -d @$mod_time '+%Y-%m-%d') $f"
    fi
  fi
done | sort -r | head -30
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   API endpoints:  $API_COUNT"
echo "   Components:     $COMP_COUNT"
echo "   Hooks:          $HOOK_COUNT"
echo "   Services:       $SVC_COUNT"
echo "   Migrations:     $MIG_COUNT"
echo "   Server env vars: $SERVER_VARS"
echo "   Client env vars: $CLIENT_VARS"
echo ""
echo "Compare these counts against APP_SCHEMA_MANUAL.md to find gaps."
echo "If counts differ, manuals may need updating."
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    AUDIT COMPLETE                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
