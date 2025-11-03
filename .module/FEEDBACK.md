# FEEDBACK.md

## Project: ConnectiveByte
## Version: 1.0.0
## Last Updated: 2025-11-03

---

## Purpose

This document provides feedback mechanisms and guidelines for AI coding assistants to continuously improve their work quality within the ConnectiveByte repository. It establishes patterns for learning from outcomes, adapting to project-specific needs, and maintaining high standards of code quality.

---

## Feedback Loop Principles

### 1. Self-Assessment After Actions
After completing any task, AI agents should:
- ✅ Verify files were actually saved (check tool execution results)
- ✅ Confirm changes align with project patterns (TypeScript, style guide)
- ✅ Validate no existing functionality was broken
- ✅ Check test results if applicable
- ✅ Review against the module's architectural principles

### 2. Learning from Command Outputs
- **Build failures**: Analyze error messages and adjust approach
- **Test failures**: Identify root cause before attempting fixes
- **Linting errors**: Learn the specific ESLint/TypeScript rules in use
- **Type errors**: Understand the project's type system patterns

### 3. Context Accumulation
- Remember successful patterns used in this repository
- Note project-specific conventions (2-space indent, single quotes, etc.)
- Track which libraries and frameworks are in use
- Understand the monorepo workspace structure

---

## Quality Checkpoints

### Before Writing Code
- [ ] Have I analyzed the existing code structure?
- [ ] Do I understand the TypeScript patterns used here?
- [ ] Am I using the correct libraries (Next.js 15, React 19, Express)?
- [ ] Will my changes fit the monorepo structure (apps/*, libs/*)?

### During Code Changes
- [ ] Am I making minimal, surgical changes?
- [ ] Are my types explicit and correct?
- [ ] Does the code follow the 2-space, single-quote convention?
- [ ] Am I avoiding modifications to working code?
- [ ] Am I leveraging shared libraries instead of duplicating code?

### After Writing Code
- [ ] Did the file actually get saved? (Check tool output)
- [ ] Does the code compile without TypeScript errors?
- [ ] Does it pass linting (ESLint)?
- [ ] Are there any test failures related to my changes?
- [ ] Did I update relevant documentation if needed?

---

## Common Pitfall Prevention

### ❌ Don't: Ask for Confirmation
**Problem**: Wastes API calls and user time
**Solution**: Execute immediately when instructions are clear

### ❌ Don't: Show Output Without Saving
**Problem**: File not actually created/updated
**Solution**: Always use `create` or `edit` tool and verify success

### ❌ Don't: Modify Working Test Files
**Problem**: Breaking existing tests unnecessarily
**Solution**: Only touch tests directly related to your changes

### ❌ Don't: Assume Project Structure
**Problem**: Wrong paths, missing dependencies
**Solution**: Use `view` tool to verify structure first

### ❌ Don't: Use Implicit Types
**Problem**: Violates project's TypeScript standards
**Solution**: Always use explicit type annotations

### ✅ Do: Verify Tool Execution
**Pattern**: Check tool response confirms file was written
```
<result>
  <name>create</name>
  <output>File created successfully</output>
</result>
```

### ✅ Do: Chain Related Commands
**Pattern**: Use `&&` to run dependent commands together
```bash
npm run build && npm run test
```

### ✅ Do: Use Parallel Tool Calls
**Pattern**: Read multiple files simultaneously
```typescript
// Call view for multiple files in one response
view: apps/frontend/package.json
view: apps/backend/package.json
view: package.json
```

### ✅ Do: Follow TypeScript Standards
**Pattern**: Explicit types, interfaces, proper exports
```typescript
interface HealthCheckResponse {
  status: string;
  timestamp: string;
}

export async function checkHealth(): Promise<HealthCheckResponse> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  };
}
```

---

## Feedback from Build/Test Results

### TypeScript Compilation Errors
**Symptom**: `tsc` fails with type errors
**Analysis Pattern**:
1. Identify the specific type mismatch
2. Check if shared types exist in libs/
3. Verify imported type definitions
4. Ensure proper interface usage

**Learning**: Next time, check type definitions before writing code

### ESLint Violations
**Symptom**: Linting fails with rule violations
**Analysis Pattern**:
1. Read the specific rule being violated
2. Check `eslint.config.js` for project rules
3. Apply consistent fixes across all files
4. Remember the pattern for future changes

**Learning**: Internalize project's ESLint configuration

### Jest Test Failures
**Symptom**: Tests fail after code changes
**Analysis Pattern**:
1. Determine if failure is related to your changes
2. Read the test expectation vs. actual output
3. Fix the code, not the test (unless test is incorrect)
4. Run tests again to verify

**Learning**: Understand test patterns (Jest, React Testing Library, MSW)

### Playwright E2E Failures
**Symptom**: E2E tests fail or timeout
**Analysis Pattern**:
1. Check if both servers (3000, 3001) are running
2. Verify API endpoints are responding
3. Review test selectors and expectations
4. Check for race conditions

**Learning**: E2E tests require both frontend and backend

---

## Repository-Specific Patterns

### Monorepo Workspace Commands
```bash
# Run command in specific workspace
npm run dev -w apps/frontend
npm test -w apps/backend

# Run across all workspaces
npm run build  # Runs build:frontend and build:backend
npm run test   # Runs test:frontend and test:backend
```

### TypeScript Across Workspaces
- Shared types should go in `libs/logic/` or `libs/components/`
- Each workspace has its own `tsconfig.json`
- Root `tsconfig.json` provides base configuration
- Use workspace references for type sharing

### Testing Patterns
- **Unit tests**: `__tests__/` directories, Jest + RTL
- **E2E tests**: `e2e/` directory, Playwright
- **Mocks**: MSW for API mocking in `mocks/` directory
- **Coverage**: Backend generates coverage reports in `coverage/`

### Port Assignments
- **Frontend**: 3000 (Next.js development server)
- **Backend**: 3001 (Express.js API server)
- **Playwright**: Automatically starts both servers

---

## Continuous Improvement Protocol

### After Each Task
1. **Verify Success**: Did all tool calls succeed?
2. **Check Quality**: Does the code meet project standards?
3. **Test Validation**: Do tests pass (if applicable)?
4. **Documentation**: Is documentation updated (if needed)?

### Pattern Recognition
- **Successful approaches**: Remember what worked well
- **Failed attempts**: Understand why and avoid repeating
- **Efficiency gains**: Note faster/better ways to accomplish tasks

### Adaptation
- **New libraries**: When added, understand their purpose
- **Changed structure**: Adapt to repository evolution
- **Updated conventions**: Follow new patterns introduced

---

## Success Indicators

### Immediate Success
- ✅ Files saved without errors
- ✅ TypeScript compiles cleanly
- ✅ ESLint passes
- ✅ No breaking changes to existing code

### Verified Success
- ✅ Tests pass (unit and E2E)
- ✅ Build completes successfully
- ✅ Application runs in development mode
- ✅ Changes align with architectural principles

### Long-Term Success
- ✅ Code is maintainable by humans
- ✅ Patterns are consistent across the codebase
- ✅ Documentation reflects reality
- ✅ No technical debt introduced

---

## Metrics to Track

### Efficiency Metrics
- **Tool calls per task**: Minimize by using parallel calls
- **Iterations to success**: Reduce by better initial analysis
- **Build/test time**: Keep low by making minimal changes

### Quality Metrics
- **TypeScript errors**: Zero tolerance
- **ESLint violations**: Zero tolerance
- **Test coverage**: Maintain or increase (target > 80%)
- **Code duplication**: Minimize by using libs/

### Reliability Metrics
- **File save success rate**: Should be 100%
- **Build success rate**: High after changes
- **Test pass rate**: Maintain existing passing tests

---

## Error Recovery Patterns

### File Not Found
**Recovery**: Use `view` to understand actual structure, adjust paths

### Type Errors After Changes
**Recovery**: Review type definitions, add missing imports, fix interfaces

### Test Failures
**Recovery**: Analyze test expectations, verify behavior matches, fix code or tests as appropriate

### Build Failures
**Recovery**: Read error messages carefully, fix root cause, rerun build

### Deployment Failures
**Recovery**: Check Netlify configuration, verify build output, test locally first

---

## Feedback to Repository Maintainers

When AI agents discover issues or improvements:

### Documentation Gaps
- Identify missing or outdated documentation
- Note where clarification would help

### Inconsistent Patterns
- Point out conflicting conventions
- Suggest standardization opportunities

### Testing Gaps
- Identify untested code paths
- Note missing test coverage

### Architectural Concerns
- Flag potential scalability issues
- Suggest architectural improvements

**Note**: While identifying these issues, always complete the assigned task first, then optionally note observations.

---

## Learning Resources

### Project Documentation
- `CLAUDE.md` - Overview and development commands
- `MODULE_GOALS.md` - Module objectives and standards
- `ARCHITECTURE.md` - System architecture and structure
- `BEHAVIOR.md` - AI agent behavioral guidelines
- `IMPLEMENTATION.md` - Implementation details
- `TEST.md` - Testing strategies and patterns

### External Resources
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)

---

## Conclusion

Effective feedback loops enable AI agents to:
- Learn from each interaction
- Adapt to project-specific patterns
- Improve code quality over time
- Reduce errors and iterations
- Maintain consistency with human developers

**Remember**: The goal is not just to complete tasks, but to do so in a way that maintains and improves the overall quality of the ConnectiveByte codebase.
