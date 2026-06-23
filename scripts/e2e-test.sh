#!/bin/bash
# End-to-End Testing Script for Learning Tree Connect (Naashah)
# Tests all roles and major flows

BASE_URL="http://localhost:3000"
COOKIES="/tmp/e2e-cookies.txt"
RESULTS="/tmp/e2e-results.txt"
PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get CSRF token
get_csrf() {
  CSRF=$(curl -s -c $COOKIES -b $COOKIES "$BASE_URL/api/csrf-token" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
  echo "$CSRF"
}

# Test helper
test_endpoint() {
  local METHOD=$1
  local ENDPOINT=$2
  local EXPECTED_STATUS=$3
  local DESCRIPTION=$4
  local DATA=$5
  
  TOTAL=$((TOTAL + 1))
  
  if [ "$METHOD" = "GET" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIES "$BASE_URL$ENDPOINT")
  else
    CSRF=$(get_csrf)
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b $COOKIES -X POST \
      -H "Content-Type: application/json" \
      -H "X-CSRF-Token: $CSRF" \
      -d "$DATA" "$BASE_URL$ENDPOINT")
  fi
  
  if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC} [$STATUS] $DESCRIPTION"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}✗ FAIL${NC} [$STATUS expected $EXPECTED_STATUS] $DESCRIPTION"
  fi
}

# Test tRPC query
test_trpc_query() {
  local PROC=$1
  local INPUT=$2
  local EXPECTED_STATUS=$3
  local DESCRIPTION=$4
  
  TOTAL=$((TOTAL + 1))
  
  if [ -z "$INPUT" ] || [ "$INPUT" = "{}" ]; then
    ENCODED_INPUT=$(python3 -c "import urllib.parse, json; print(urllib.parse.quote(json.dumps({'json': None})))")
  else
    ENCODED_INPUT=$(python3 -c "import urllib.parse, json; print(urllib.parse.quote(json.dumps({'json': $INPUT})))")
  fi
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -b $COOKIES "$BASE_URL/api/trpc/$PROC?input=$ENCODED_INPUT")
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC} [$STATUS] $DESCRIPTION"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}✗ FAIL${NC} [$STATUS expected $EXPECTED_STATUS] $DESCRIPTION"
    echo "  Response: $(echo $BODY | head -c 200)"
  fi
}

# Test tRPC mutation
test_trpc_mutation() {
  local PROC=$1
  local INPUT=$2
  local EXPECTED_STATUS=$3
  local DESCRIPTION=$4
  
  TOTAL=$((TOTAL + 1))
  CSRF=$(get_csrf)
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -b $COOKIES -X POST \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF" \
    -d "{\"json\": $INPUT}" "$BASE_URL/api/trpc/$PROC")
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$STATUS" = "$EXPECTED_STATUS" ]; then
    PASSED=$((PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC} [$STATUS] $DESCRIPTION"
  else
    FAILED=$((FAILED + 1))
    echo -e "${RED}✗ FAIL${NC} [$STATUS expected $EXPECTED_STATUS] $DESCRIPTION"
    echo "  Response: $(echo $BODY | head -c 200)"
  fi
}

echo "=============================================="
echo "  E2E Testing - Learning Tree Connect (نشأة)"
echo "  $(date)"
echo "=============================================="
echo ""

# ============ PUBLIC ROUTES ============
echo -e "${YELLOW}=== Public Routes ===${NC}"
test_endpoint "GET" "/" "200" "Homepage"
test_endpoint "GET" "/login" "200" "Login page"
test_endpoint "GET" "/register" "200" "Register page"
test_endpoint "GET" "/forgot-password" "200" "Forgot password page"
test_endpoint "GET" "/reset-password" "200" "Reset password page"
test_endpoint "GET" "/verify-otp" "200" "Verify OTP page"

echo ""
echo -e "${YELLOW}=== Auth API Endpoints ===${NC}"
test_trpc_query "auth.me" "{}" "200" "Auth me (unauthenticated)"
test_trpc_query "auth.getAuthConfig" "{}" "200" "Get auth config"

# Test registration flow
echo ""
echo -e "${YELLOW}=== Registration Flow ===${NC}"
test_trpc_mutation "auth.register" '{"name":"تجربة","phone":"0500000001","email":"test-e2e@naashah.com","password":"Test123456"}' "200" "Register new user (or conflict if exists)"

# Test forgot password flow
echo ""
echo -e "${YELLOW}=== Password Reset Flow ===${NC}"
test_trpc_mutation "auth.forgotPassword" '{"identifier":"test-e2e@naashah.com","method":"email"}' "200" "Forgot password (email)"

# Test login flow
echo ""
echo -e "${YELLOW}=== Login Flow ===${NC}"
test_trpc_mutation "auth.login" '{"identifier":"test-e2e@naashah.com","password":"Test123456"}' "200" "Login with email/password"

echo ""
echo -e "${YELLOW}=== Parent Portal Routes ===${NC}"
test_endpoint "GET" "/parent/dashboard" "200" "Parent Dashboard"
test_endpoint "GET" "/parent/children" "200" "Parent Children"
test_endpoint "GET" "/parent/daily-report" "200" "Parent Daily Report"
test_endpoint "GET" "/parent/timeline" "200" "Parent Timeline"
test_endpoint "GET" "/parent/attendance" "200" "Parent Attendance"
test_endpoint "GET" "/parent/photos" "200" "Parent Photos"
test_endpoint "GET" "/parent/messages" "200" "Parent Messages"
test_endpoint "GET" "/parent/notifications" "200" "Parent Notifications"
test_endpoint "GET" "/parent/finance" "200" "Parent Finance"
test_endpoint "GET" "/parent/documents" "200" "Parent Documents"
test_endpoint "GET" "/parent/pickup" "200" "Parent Pickup"
test_endpoint "GET" "/parent/calendar" "200" "Parent Calendar"
test_endpoint "GET" "/parent/announcements" "200" "Parent Announcements"
test_endpoint "GET" "/parent/observations" "200" "Parent Observations"
test_endpoint "GET" "/parent/development" "200" "Parent Development"
test_endpoint "GET" "/parent/reports" "200" "Parent Reports"
test_endpoint "GET" "/parent/weekly-plan" "200" "Parent Weekly Plan"
test_endpoint "GET" "/parent/engagement/overview" "200" "Parent Engagement Overview"
test_endpoint "GET" "/parent/engagement/rewards" "200" "Parent Engagement Rewards"
test_endpoint "GET" "/parent/engagement/challenges" "200" "Parent Engagement Challenges"

echo ""
echo -e "${YELLOW}=== Staff Portal Routes ===${NC}"
test_endpoint "GET" "/staff/dashboard" "200" "Staff Dashboard"
test_endpoint "GET" "/staff/children" "200" "Staff Children"
test_endpoint "GET" "/staff/attendance" "200" "Staff Attendance"
test_endpoint "GET" "/staff/daily-reports" "200" "Staff Daily Reports"
test_endpoint "GET" "/staff/daily-care" "200" "Staff Daily Care"
test_endpoint "GET" "/staff/messages" "200" "Staff Messages"
test_endpoint "GET" "/staff/finance" "200" "Staff Finance"
test_endpoint "GET" "/staff/settings" "200" "Staff Settings"
test_endpoint "GET" "/staff/notification-settings" "200" "Staff Notification Settings"
test_endpoint "GET" "/staff/classes" "200" "Staff Classes"
test_endpoint "GET" "/staff/enrollment" "200" "Staff Enrollment"
test_endpoint "GET" "/staff/calendar" "200" "Staff Calendar"
test_endpoint "GET" "/staff/announcements" "200" "Staff Announcements"
test_endpoint "GET" "/staff/observations" "200" "Staff Observations"
test_endpoint "GET" "/staff/analytics" "200" "Staff Analytics"
test_endpoint "GET" "/staff/users" "200" "Staff Users"
test_endpoint "GET" "/staff/staff-directory" "200" "Staff Directory"
test_endpoint "GET" "/staff/import-staff" "200" "Staff Import"
test_endpoint "GET" "/staff/import-children" "200" "Children Import"

echo ""
echo -e "${YELLOW}=== Super Admin Routes ===${NC}"
test_endpoint "GET" "/super-admin/organizations" "200" "Super Admin Organizations"
test_endpoint "GET" "/super-admin/notification-settings" "200" "Super Admin Notification Settings"

echo ""
echo -e "${YELLOW}=== API Health Checks ===${NC}"
test_endpoint "GET" "/api/csrf-token" "200" "CSRF Token endpoint"

# ============ tRPC Queries (Protected - expect 401 without session) ============
echo ""
echo -e "${YELLOW}=== Protected API Endpoints (expect 401 without auth) ===${NC}"
test_trpc_query "children.list" '{"organizationId":1}' "401" "Children list (protected)"
test_trpc_query "attendance.getToday" '{"organizationId":1}' "401" "Attendance today (protected)"
test_trpc_query "notifications.list" '{}' "401" "Notifications list (protected)"

echo ""
echo "=============================================="
echo -e "  Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, $TOTAL total"
echo "=============================================="

# Save results
echo "E2E Test Results - $(date)" > $RESULTS
echo "Passed: $PASSED" >> $RESULTS
echo "Failed: $FAILED" >> $RESULTS
echo "Total: $TOTAL" >> $RESULTS
echo "Pass Rate: $(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)%" >> $RESULTS
