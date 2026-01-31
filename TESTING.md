# Testing Strategy

**Last Updated**: January 2026

## Overview

This document outlines the testing strategy for Life Assistant, covering both the API (backend) and Frontend.

---

## API Testing (NestJS)

### Unit Tests

**Location**: `life-assistant-api/src/**/*.spec.ts`

**Stack**: Jest + NestJS Testing utilities

**Current Coverage** (70 tests):
- `date.utils.spec.ts` - Date formatting utilities (8 tests)
- `auth.service.spec.ts` - JWT authentication logic (10 tests)
- `webhooks.service.spec.ts` - Webhook handling and verification (19 tests)
- `sync.service.spec.ts` - Wrike ↔ ClickUp sync orchestration (11 tests)
- `clickup.service.spec.ts` - ClickUp API and stats methods (12 tests)
- `grocy.service.spec.ts` - Grocy API integration (4 tests)
- `database.service.spec.ts` - Database operations (5 tests)

**Run**: `npm test` (in life-assistant-api/)

### Integration Tests

**Location**: `life-assistant-api/test/*.e2e-spec.ts`

**Stack**: Jest + Supertest + PostgreSQL (test database)

**Current Coverage** (6 tests):
- `auth.e2e-spec.ts` - Auth endpoint integration tests
  - Login with valid/invalid credentials
  - `/auth/me` with valid/invalid/missing tokens

**Run locally**:
```bash
# Start test database
docker compose up -d

# Run tests
npm run test:e2e
```

**Run with act** (GitHub Actions locally):
```bash
act -j integration-tests -W .github/workflows/integration-tests-local.yml --container-architecture linux/amd64
```

### CI Workflows

All workflows trigger on PRs to `main` or `staging`:

1. **Lint** (`.github/workflows/lint.yml`) - ESLint for API and Frontend
2. **Build & Test** (`.github/workflows/build.yml`) - Build + unit tests
3. **Integration Tests** (`.github/workflows/integration-tests.yml`) - E2E tests with PostgreSQL

---

## Frontend Testing (React)

### Stack (To Be Implemented)

- **Unit/Component Tests**: Vitest + React Testing Library
- **API Mocking**: MSW (Mock Service Worker)
- **E2E Tests** (optional, future): Playwright

### Test File Structure

```
life-assistant-frontend/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts              # Test setup, MSW handlers
│   │   ├── contexts/
│   │   │   └── AuthProvider.test.tsx
│   │   ├── components/
│   │   │   └── ProtectedRoute.test.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.test.tsx
│   │   ├── lib/
│   │   │   ├── api.test.ts
│   │   │   └── date.utils.test.ts
│   │   └── routes/
│   │       ├── login.test.tsx
│   │       ├── index.test.tsx
│   │       ├── stats.test.tsx
│   │       └── meals.test.tsx
```

### Priority 1: Core Authentication

**AuthProvider** (`src/contexts/AuthProvider.tsx`)
- [ ] Token loaded from localStorage on mount
- [ ] `/auth/me` called to validate existing token
- [ ] Invalid token cleared, user redirected
- [ ] `login()` stores token and sets user state
- [ ] `logout()` clears token and user state

**useAuth hook** (`src/hooks/useAuth.ts`)
- [ ] Throws error when used outside AuthProvider
- [ ] Returns context values correctly

**ProtectedRoute** (`src/components/ProtectedRoute.tsx`)
- [ ] Shows loading state while `isLoading` is true
- [ ] Redirects to `/login` when unauthenticated
- [ ] Renders children when authenticated

**API Client interceptors** (`src/lib/api.ts`)
- [ ] Attaches Bearer token to requests
- [ ] 401 response clears token and redirects to `/login`

### Priority 2: Login Flow

**Login Route** (`src/routes/login.tsx`)
- [ ] Form submission calls API with credentials
- [ ] Error message displays on failed login
- [ ] Loading state disables submit button
- [ ] Successful login redirects to `/`
- [ ] Already-authenticated users redirected away

### Priority 3: Utility Functions

**Date Utils** (`src/lib/date.utils.ts`)
- [ ] `getTodayString()` returns YYYY-MM-DD in local time
- [ ] `formatDateString()` pads months/days correctly

### Priority 4: Data Display Routes

**Home Route** (`src/routes/index.tsx`)
- [ ] Fetches `/clickup/tasks/today` on mount
- [ ] Renders loading state
- [ ] Renders error state with message
- [ ] Displays all metrics (total, completed, remaining, overdue, completion rate)

**Stats Route** (`src/routes/stats.tsx`)
- [ ] Fetches `/clickup/tasks/stats/5` on mount
- [ ] Date labels format correctly (Today, Yesterday, weekday)
- [ ] Table renders historical data
- [ ] Handles empty/error states
- [ ] (Chart rendering covered by E2E, not unit tests)

**Meals Route** (`src/routes/meals.tsx`)
- [ ] Defaults to today's date
- [ ] Date picker changes API endpoint
- [ ] Meal cards render with recipe info
- [ ] Image URLs include auth token
- [ ] Handles missing meals gracefully

### Priority 5: Navigation

**Root Layout** (`src/routes/__root.tsx`)
- [ ] Nav links visible/hidden based on auth state
- [ ] Mobile menu toggle works
- [ ] Logout button clears auth
- [ ] Login page hides navbar

### What NOT to Unit Test

- Recharts rendering (use E2E or visual regression)
- Tailwind styling (use E2E or visual regression)
- TanStack Router internals

### Estimated Test Count

| Area | Tests | Status |
|------|-------|--------|
| AuthProvider | 6 | Planned |
| useAuth | 2 | Planned |
| ProtectedRoute | 3 | Planned |
| API interceptors | 4 | Planned |
| Login route | 5 | Planned |
| Date utils | 4 | Planned |
| Home route | 4 | Planned |
| Stats route | 4 | Planned |
| Meals route | 5 | Planned |
| Navigation | 4 | Planned |
| **Total** | **~41** | |

---

## E2E Testing (Future)

For critical user journeys that span multiple pages:

1. **Login Flow**: Visit site → redirect to login → enter credentials → redirect to home
2. **Protected Routes**: Verify unauthenticated access redirects
3. **Data Display**: Login → navigate to stats → verify chart renders
4. **Logout**: Click logout → verify redirect to login → verify protected routes inaccessible

**Recommended Stack**: Playwright

---

## Running Tests

### API
```bash
cd life-assistant-api

# Unit tests
npm test

# Unit tests with coverage
npm test -- --coverage

# Integration tests (requires running PostgreSQL)
npm run test:e2e

# Watch mode
npm test -- --watch
```

### Frontend (after implementation)
```bash
cd life-assistant-frontend

# Unit/component tests
npm test

# Watch mode
npm test -- --watch

# E2E tests (future)
npm run test:e2e
```

### CI
All tests run automatically on PRs to `main` or `staging` branches.
