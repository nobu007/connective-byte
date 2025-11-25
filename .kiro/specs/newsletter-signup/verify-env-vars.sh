#!/bin/bash

# Newsletter Signup - Environment Variables Verification Script
# This script verifies that all required environment variables are properly configured

set -e

echo "================================================"
echo "Newsletter Signup - Environment Variables Check"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local var_value=$2
    local is_required=$3
    local description=$4

    TOTAL=$((TOTAL + 1))

    if [ -z "$var_value" ]; then
        if [ "$is_required" = "true" ]; then
            echo -e "${RED}✗${NC} $var_name - MISSING (Required)"
            echo "  Description: $description"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠${NC} $var_name - Not set (Optional)"
            echo "  Description: $description"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        # Mask sensitive values
        local masked_value="${var_value:0:10}..."
        echo -e "${GREEN}✓${NC} $var_name - Set"
        echo "  Value: $masked_value"
        echo "  Description: $description"
        PASSED=$((PASSED + 1))
    fi
    echo ""
}

echo "Checking Frontend Environment Variables (.env.local):"
echo "------------------------------------------------------"
echo ""

# Load frontend environment variables
if [ -f "apps/frontend/.env.local" ]; then
    source apps/frontend/.env.local 2>/dev/null || true
else
    echo -e "${RED}ERROR: apps/frontend/.env.local not found${NC}"
    echo ""
fi

# Required variables for newsletter functionality
check_env_var "RESEND_API_KEY" "$RESEND_API_KEY" "true" "Resend API key for sending emails and managing subscribers"
check_env_var "RESEND_AUDIENCE_ID" "$RESEND_AUDIENCE_ID" "true" "Resend audience ID for newsletter subscribers"

# Required variables for site configuration
check_env_var "NEXT_PUBLIC_SITE_URL" "$NEXT_PUBLIC_SITE_URL" "true" "Public URL of the website (used in emails and metadata)"
check_env_var "NEXT_PUBLIC_CONTACT_EMAIL" "$NEXT_PUBLIC_CONTACT_EMAIL" "true" "Contact email address (used as sender address)"

# Required variables for analytics
check_env_var "NEXT_PUBLIC_PLAUSIBLE_DOMAIN" "$NEXT_PUBLIC_PLAUSIBLE_DOMAIN" "true" "Plausible Analytics domain for tracking events"
check_env_var "NEXT_PUBLIC_PLAUSIBLE_API_HOST" "$NEXT_PUBLIC_PLAUSIBLE_API_HOST" "false" "Plausible Analytics API host (defaults to plausible.io)"
check_env_var "NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST" "$NEXT_PUBLIC_PLAUSIBLE_TRACK_LOCALHOST" "false" "Enable analytics tracking on localhost (for testing)"

echo "================================================"
echo "Summary"
echo "================================================"
echo ""
echo "Total variables checked: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Environment variables verification FAILED${NC}"
    echo ""
    echo "Action Required:"
    echo "1. Review the missing required variables above"
    echo "2. Add them to apps/frontend/.env.local for local development"
    echo "3. Add them to Netlify environment variables for production"
    echo ""
    echo "For production deployment:"
    echo "- See: .kiro/specs/newsletter-signup/NETLIFY_ENV_SETUP.md"
    echo "- See: .kiro/specs/newsletter-signup/deployment-verification.md"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ All required environment variables are configured${NC}"
    echo ""
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}Note: Some optional variables are not set${NC}"
        echo "This is OK for development, but review for production deployment"
        echo ""
    fi
    exit 0
fi
