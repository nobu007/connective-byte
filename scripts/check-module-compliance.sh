#!/bin/bash

# Module Compliance Checker for ConnectiveByte
# Validates that a module follows all architectural standards
# Usage: ./scripts/check-module-compliance.sh <module-name>

set -e

MODULE_NAME="$1"

if [ -z "$MODULE_NAME" ]; then
    echo "Usage: $0 <module-name>"
    echo "Example: $0 health"
    exit 1
fi

MODULE_PATH="apps/backend/src/modules/$MODULE_NAME"

if [ ! -d "$MODULE_PATH" ]; then
    echo "❌ Error: Module $MODULE_NAME not found at $MODULE_PATH"
    exit 1
fi

echo "🔍 Checking compliance for module: $MODULE_NAME"
echo "📁 Location: $MODULE_PATH"
echo ""

SCORE=0
TOTAL=0
ERRORS=()
WARNINGS=()

# Function to check file existence
check_file() {
    local file="$1"
    local description="$2"
    ((TOTAL++))

    if [ -f "$file" ]; then
        ((SCORE++))
        echo "  ✅ $description"
        return 0
    else
        echo "  ❌ $description"
        ERRORS+=("Missing: $description")
        return 1
    fi
}

# Function to check pattern in files
check_pattern() {
    local pattern="$1"
    local file="$2"
    local description="$3"
    ((TOTAL++))

    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        ((SCORE++))
        echo "  ✅ $description"
        return 0
    else
        echo "  ❌ $description"
        ERRORS+=("Pattern not found: $description in $file")
        return 1
    fi
}

# Function to add warning
check_warning() {
    local condition="$1"
    local message="$2"

    if ! $condition; then
        echo "  ⚠️  $message"
        WARNINGS+=("$message")
    fi
}

echo "📚 Category 1: .module Documentation (8 files)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "$MODULE_PATH/.module/MODULE_GOALS.md" "MODULE_GOALS.md"
check_file "$MODULE_PATH/.module/ARCHITECTURE.md" "ARCHITECTURE.md"
check_file "$MODULE_PATH/.module/MODULE_STRUCTURE.md" "MODULE_STRUCTURE.md"
check_file "$MODULE_PATH/.module/BEHAVIOR.md" "BEHAVIOR.md"
check_file "$MODULE_PATH/.module/IMPLEMENTATION.md" "IMPLEMENTATION.md"
check_file "$MODULE_PATH/.module/TEST.md" "TEST.md"
check_file "$MODULE_PATH/.module/TASKS.md" "TASKS.md"
check_file "$MODULE_PATH/.module/FEEDBACK.md" "FEEDBACK.md"
echo ""

echo "🏗️  Category 2: Base Class Usage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Check for BaseService usage
if ls "$MODULE_PATH"/*Service.ts 2>/dev/null | head -1 | xargs grep -l "extends BaseService" > /dev/null 2>&1; then
    ((SCORE++))
    echo "  ✅ Service extends BaseService"
else
    echo "  ❌ Service does not extend BaseService"
    ERRORS+=("Service must extend BaseService")
fi
((TOTAL++))

# Check for BaseController usage (if controller exists)
if ls "$MODULE_PATH"/*Controller.ts 2>/dev/null; then
    if ls "$MODULE_PATH"/*Controller.ts 2>/dev/null | head -1 | xargs grep -l "extends BaseController" > /dev/null 2>&1; then
        ((SCORE++))
        echo "  ✅ Controller extends BaseController"
    else
        echo "  ❌ Controller does not extend BaseController"
        ERRORS+=("Controller must extend BaseController")
    fi
    ((TOTAL++))
else
    echo "  ℹ️  No controller found (optional)"
fi

# Check for loggingService usage
if grep -r "loggingService" "$MODULE_PATH" --include="*.ts" --exclude-dir=__tests__ > /dev/null 2>&1; then
    ((SCORE++))
    echo "  ✅ Uses loggingService"
else
    echo "  ⚠️  Not using loggingService (recommended)"
    WARNINGS+=("Consider using loggingService for structured logging")
fi
((TOTAL++))
echo ""

echo "🚫 Category 3: Anti-pattern Detection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ANTIPATTERNS=0

# Check for manual logger creation
if grep -r "console\\.log\\|console\\.error\\|console\\.warn" "$MODULE_PATH" --include="*.ts" --exclude-dir=__tests__ > /dev/null 2>&1; then
    echo "  ⚠️  Direct console.log usage detected"
    WARNINGS+=("Use loggingService instead of direct console.log")
    ((ANTIPATTERNS++))
fi

# Check for manual error handling without base class
if grep -r "try.*catch" "$MODULE_PATH" --include="*.ts" --exclude-dir=__tests__ | grep -v "executeOperation\|executeAction" > /dev/null 2>&1; then
    echo "  ⚠️  Manual try-catch detected (consider using executeOperation/executeAction)"
    WARNINGS+=("Consider using BaseService.executeOperation() or BaseController.executeAction()")
    ((ANTIPATTERNS++))
fi

# Check for manual response formatting
if grep -r "res\\.json\\|res\\.send" "$MODULE_PATH" --include="*.ts" --exclude-dir=__tests__ | grep -v "sendSuccess\|sendError" > /dev/null 2>&1; then
    echo "  ⚠️  Manual response formatting detected"
    WARNINGS+=("Use BaseController.sendSuccess() or sendError() for consistent responses")
    ((ANTIPATTERNS++))
fi

if [ $ANTIPATTERNS -eq 0 ]; then
    ((SCORE++))
    echo "  ✅ No anti-patterns detected"
else
    echo "  ⚠️  $ANTIPATTERNS potential anti-patterns found"
fi
((TOTAL++))
echo ""

echo "📁 Category 4: File Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "$MODULE_PATH/README.md" "README.md exists"

# Check for test directory
if [ -d "$MODULE_PATH/__tests__" ]; then
    ((SCORE++))
    echo "  ✅ __tests__ directory exists"

    # Count test files
    TEST_COUNT=$(find "$MODULE_PATH/__tests__" -name "*.test.ts" 2>/dev/null | wc -l)
    if [ $TEST_COUNT -gt 0 ]; then
        echo "  ✅ $TEST_COUNT test file(s) found"
    else
        echo "  ⚠️  No test files found in __tests__"
        WARNINGS+=("Add test files to __tests__ directory")
    fi
else
    echo "  ❌ __tests__ directory missing"
    ERRORS+=("Create __tests__ directory for unit tests")
fi
((TOTAL++))
echo ""

echo "🧪 Category 5: Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run tests if they exist
if [ -d "$MODULE_PATH/__tests__" ] && [ "$(find "$MODULE_PATH/__tests__" -name "*.test.ts" 2>/dev/null | wc -l)" -gt 0 ]; then
    echo "  ℹ️  Running tests..."

    # Run tests and capture output
    if cd apps/backend && npm test -- "$MODULE_PATH" --passWithNoTests 2>&1 | grep -q "PASS\|FAIL"; then
        if cd ../.. && cd apps/backend && npm test -- "$MODULE_PATH" --passWithNoTests 2>&1 | grep -q "PASS"; then
            ((SCORE++))
            echo "  ✅ Tests passing"
        else
            echo "  ❌ Tests failing"
            ERRORS+=("Fix failing tests")
        fi
        cd ../..
    else
        echo "  ⚠️  Could not run tests"
        WARNINGS+=("Ensure tests can be run with npm test")
    fi
    ((TOTAL++))

    # Check for coverage
    echo "  ℹ️  Checking test coverage..."
    if cd apps/backend && npm test -- "$MODULE_PATH" --coverage --passWithNoTests 2>&1 | grep -E "All files.*[0-9]+\.[0-9]+" > /dev/null; then
        COVERAGE=$(cd ../.. && cd apps/backend && npm test -- "$MODULE_PATH" --coverage --passWithNoTests 2>&1 | grep -E "All files" | awk '{print $10}' | sed 's/%//' | head -1)
        cd ../..

        if [ ! -z "$COVERAGE" ]; then
            if (( $(echo "$COVERAGE >= 95" | bc -l) )); then
                ((SCORE++))
                echo "  ✅ Coverage: ${COVERAGE}% (>= 95%)"
            else
                echo "  ⚠️  Coverage: ${COVERAGE}% (< 95%)"
                WARNINGS+=("Increase test coverage to >= 95% (currently ${COVERAGE}%)")
            fi
        else
            echo "  ⚠️  Could not determine coverage"
        fi
    else
        echo "  ⚠️  Coverage check skipped"
    fi
    ((TOTAL++))
else
    echo "  ℹ️  No tests to run"
    ((TOTAL+=2))
fi
echo ""

echo "📊 Category 6: Documentation Quality"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check MODULE_GOALS.md content
if [ -f "$MODULE_PATH/.module/MODULE_GOALS.md" ]; then
    if grep -q "Primary Objectives\|KPI\|Success Criteria" "$MODULE_PATH/.module/MODULE_GOALS.md"; then
        ((SCORE++))
        echo "  ✅ MODULE_GOALS.md has required sections"
    else
        echo "  ⚠️  MODULE_GOALS.md missing key sections"
        WARNINGS+=("Add Primary Objectives, KPIs, and Success Criteria to MODULE_GOALS.md")
    fi
else
    echo "  ❌ MODULE_GOALS.md missing"
fi
((TOTAL++))

# Check ARCHITECTURE.md content
if [ -f "$MODULE_PATH/.module/ARCHITECTURE.md" ]; then
    if grep -q "Layer\|Component\|Dependencies" "$MODULE_PATH/.module/ARCHITECTURE.md"; then
        ((SCORE++))
        echo "  ✅ ARCHITECTURE.md describes layers and components"
    else
        echo "  ⚠️  ARCHITECTURE.md missing architecture details"
        WARNINGS+=("Add layer structure and component descriptions to ARCHITECTURE.md")
    fi
else
    echo "  ❌ ARCHITECTURE.md missing"
fi
((TOTAL++))
echo ""

# Calculate percentage
PERCENTAGE=$(awk "BEGIN {printf \"%.1f\", ($SCORE/$TOTAL)*100}")

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    COMPLIANCE REPORT                      "
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📈 Overall Score: $SCORE/$TOTAL ($PERCENTAGE%)"
echo ""

# Determine grade
if (( $(echo "$PERCENTAGE >= 95" | bc -l) )); then
    GRADE="🎉 EXCELLENT - Production Ready"
    COLOR="\033[0;32m"  # Green
elif (( $(echo "$PERCENTAGE >= 85" | bc -l) )); then
    GRADE="✅ GOOD - Minor improvements needed"
    COLOR="\033[0;33m"  # Yellow
elif (( $(echo "$PERCENTAGE >= 70" | bc -l) )); then
    GRADE="⚠️  FAIR - Significant improvements needed"
    COLOR="\033[0;33m"  # Yellow
else
    GRADE="❌ NEEDS WORK - Major improvements required"
    COLOR="\033[0;31m"  # Red
fi

echo -e "${COLOR}${GRADE}\033[0m"
echo ""

# Print errors
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo "❌ Critical Issues (${#ERRORS[@]}):"
    for error in "${ERRORS[@]}"; do
        echo "   - $error"
    done
    echo ""
fi

# Print warnings
if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "⚠️  Warnings (${#WARNINGS[@]}):"
    for warning in "${WARNINGS[@]}"; do
        echo "   - $warning"
    done
    echo ""
fi

# Recommendations
echo "📋 Recommendations:"
if (( $(echo "$PERCENTAGE >= 95" | bc -l) )); then
    echo "   ✅ Module meets all quality standards!"
    echo "   - Continue maintaining high standards"
    echo "   - Monitor test coverage"
    echo "   - Keep documentation up to date"
else
    echo "   - Address critical issues first (marked with ❌)"
    echo "   - Review warnings (marked with ⚠️)"
    echo "   - Refer to health/logging modules for reference"
    echo "   - Target: 95%+ compliance score"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

# Exit code based on percentage
if (( $(echo "$PERCENTAGE >= 85" | bc -l) )); then
    exit 0
else
    exit 1
fi
