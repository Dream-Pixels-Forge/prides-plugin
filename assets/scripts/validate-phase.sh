#!/usr/bin/env bash
# validate-phase.sh — Run deterministic checks before PRIDES phase transitions
# Usage: ./scripts/validate-phase.sh <FROM_PHASE> <TO_PHASE> [PROJECT_ROOT]
# Example: ./scripts/validate-phase.sh P R /path/to/project
#
# If PROJECT_ROOT is not given, uses $PWD.

set -uo pipefail
# NOTE: no -e — grep/find return 1 on no match, which is expected on new projects

FROM="${1:?Usage: validate-phase.sh <FROM> <TO> [PROJECT_ROOT]}"
TO="${2:?Usage: validate-phase.sh <FROM> <TO> [PROJECT_ROOT]}"
PROJECT_ROOT="${3:-$PWD}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS${NC}: $1"; echo "\"$1\": \"pass\""; }
fail() { echo -e "${RED}FAIL${NC}: $1"; echo "\"$1\": \"fail\""; }
warn() { echo -e "${YELLOW}WARN${NC}: $1"; echo "\"$1\": \"warn\""; }

cd "$PROJECT_ROOT" || { echo "Cannot cd to $PROJECT_ROOT"; exit 1; }

echo "=== PRIDES Gate: ${FROM}→${TO} ==="
echo "Project: $PROJECT_ROOT"
echo ""

check_prd_exists() {
  local found
  found=$(find . -maxdepth 3 \( -name "PRD*" -o -name "prd*" -o -name "requirements*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -5)
  if [ -n "$found" ]; then
    pass "prd_exists"
  else
    fail "prd_exists"
  fi
}

check_requirements_clear() {
  local file
  file=$(find . -maxdepth 3 \( -name "PRD*" -o -name "prd*" -o -name "requirements*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -1)
  if [ -n "$file" ]; then
    local lines
    lines=$(wc -l < "$file")
    if [ "$lines" -gt 10 ]; then
      pass "requirements_clear"
    else
      fail "requirements_clear"
    fi
  else
    fail "requirements_clear"
  fi
}

check_scope_defined() {
  local found
  # Search broadly — don't assume dev_notes/ or docs/ exist
  found=$(grep -ril "scope\|limitations\|out of scope\|non-goal\|milestone" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".prides" | head -5)
  if [ -n "$found" ]; then
    pass "scope_defined"
  else
    fail "scope_defined"
  fi
}

check_review_complete() {
  local found
  found=$(find . -maxdepth 3 \( -name "*review*" -o -name "*analysis*" -o -name "*architecture*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -5)
  if [ -n "$found" ]; then
    pass "review_complete"
  else
    fail "review_complete"
  fi
}

check_no_blockers() {
  local blockers
  blockers=$(grep -ril "blocked\|blocker\|BLOCKED" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v ".prides" | head -5)
  if [ -z "$blockers" ]; then
    pass "no_blockers"
  else
    fail "no_blockers"
  fi
}

check_architecture_approved() {
  local found
  found=$(find . -maxdepth 3 \( -name "ADR*" -o -name "ARCHITECTURE*" -o -name "design*" -o -name "DESIGN*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -5)
  if [ -n "$found" ]; then
    pass "architecture_approved"
  else
    fail "architecture_approved"
  fi
}

check_tests_pass() {
  if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    if npm test 2>&1 | tail -5 | grep -qi "pass\|success\|ok"; then
      pass "tests_pass"
    else
      fail "tests_pass"
    fi
  elif [ -f "go.mod" ]; then
    if go test ./... 2>&1 | tail -5 | grep -qi "ok\|pass"; then
      pass "tests_pass"
    else
      fail "tests_pass"
    fi
  elif [ -f "Cargo.toml" ]; then
    if cargo test 2>&1 | tail -5 | grep -qi "test result: ok"; then
      pass "tests_pass"
    else
      fail "tests_pass"
    fi
  elif [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
    if python3 -m pytest 2>&1 | tail -5 | grep -qi "passed"; then
      pass "tests_pass"
    else
      fail "tests_pass"
    fi
  else
    warn "tests_pass (no test framework detected)"
  fi
}

check_lint_clean() {
  if [ -f "package.json" ] && grep -q '"lint"' package.json 2>/dev/null; then
    if npm run lint 2>&1 | tail -5 | grep -qi "error"; then
      fail "lint_clean"
    else
      pass "lint_clean"
    fi
  elif [ -f "pyproject.toml" ] && grep -q "ruff\|flake8\|pylint" pyproject.toml 2>/dev/null; then
    if python3 -m ruff check . 2>&1 | tail -5 | grep -qi "error"; then
      fail "lint_clean"
    else
      pass "lint_clean"
    fi
  else
    warn "lint_clean (no linter detected)"
  fi
}

check_no_regressions() {
  local count
  count=$(grep -rn "HACK\|FIXME\|BROKEN\|TEMPORARY" --include="*.ts" --include="*.js" --include="*.py" --include="*.go" --include="*.rs" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
  count=$(echo "$count" | tr -d '[:space:]')
  [ -z "$count" ] && count=0
  if [ "$count" -lt 5 ]; then
    pass "no_regressions"
  else
    fail "no_regressions ($count markers found)"
  fi
}

check_no_vulns() {
  if [ -f "package-lock.json" ]; then
    local critical
    critical=$(npm audit --production 2>&1 | grep -c "critical\|high" || true)
    if [ "$critical" -eq 0 ]; then
      pass "no_vulns"
    else
      fail "no_vulns ($critical critical/high)"
    fi
  elif [ -f "Cargo.lock" ]; then
    if command -v cargo-audit &>/dev/null; then
      local vulns
      vulns=$(cargo audit 2>&1 | grep -c "warning\|error" || true)
      if [ "$vulns" -eq 0 ]; then
        pass "no_vulns"
      else
        fail "no_vulns ($vulns found)"
      fi
    else
      warn "no_vulns (cargo-audit not installed)"
    fi
  else
    warn "no_vulns (no lock file to audit)"
  fi
}

check_compliance_met() {
  local found
  found=$(find . -maxdepth 3 \( -name "LICENSE*" -o -name "COMPLIANCE*" -o -name "SECURITY*" \) -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -5)
  if [ -n "$found" ]; then
    pass "compliance_met"
  else
    fail "compliance_met"
  fi
}

# Run checks based on transition
echo "{"
echo "\"gate\": \"${FROM}→${TO}\","
echo "\"project\": \"$PROJECT_ROOT\","
echo "\"checks\": {"

case "${FROM}→${TO}" in
  "P→R")
    check_prd_exists; echo ","
    check_requirements_clear; echo ","
    check_scope_defined
    ;;
  "R→I")
    check_review_complete; echo ","
    check_no_blockers; echo ","
    check_architecture_approved
    ;;
  "I→D")
    check_tests_pass; echo ","
    check_lint_clean; echo ","
    check_no_regressions
    ;;
  "D→E")
    check_tests_pass; echo ","
    check_no_regressions
    ;;
  "E→S")
    check_no_regressions; echo ","
    check_compliance_met
    ;;
  "S→DONE")
    check_no_vulns; echo ","
    check_compliance_met
    ;;
  *)
    echo "  \"error\": \"Unknown transition: ${FROM}→${TO}\""
    ;;
esac

echo "},"
echo "\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
echo "}"

echo ""
echo "=== Gate check complete ==="
