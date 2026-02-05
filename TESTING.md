# Testing Strategy

**Last Updated**: February 2026

## Overview

This document outlines the testing strategy for Life Assistant, covering both the API (backend) and Frontend.

---

## API Testing (NestJS)

### Unit Tests

**Location**: `life-assistant-api/src/**/*.spec.ts`

**Stack**: Jest + NestJS Testing utilities

**Current Coverage** (143 tests):
- `app.controller.spec.ts` - App controller (1 test)
- `date.utils.spec.ts` - Date formatting utilities (8 tests)
- `auth.service.spec.ts` - JWT authentication logic (10 tests)
- `webhooks.service.spec.ts` - Webhook handling and verification (31 tests)
  - Wrike webhook handling (11 tests)
  - ClickUp webhook handling and auto-consume (13 tests)
  - Webhook status aggregation (4 tests)
  - Webhook deletion (3 tests)
- `sync.service.spec.ts` - Wrike ↔ ClickUp sync orchestration (11 tests)
- `clickup.service.spec.ts` - ClickUp API and stats methods (12 tests)
- `grocy.service.spec.ts` - Grocy API integration (47 tests)
  - Recipe picture handling (4 tests)
  - Meal plan date range fetching (1 test)
  - Recipe fulfillment and shopping list (8 tests)
  - Meal plan CRUD operations (7 tests)
  - Recipe consumption (2 tests)
  - Recipe selection filtering (4 tests)
  - Homemade product resolution (5 tests)
  - Recipe ingredient resolution (16 tests)
- `meal-prep.service.spec.ts` - Meal prep ClickUp integration (18 tests)
  - Prep config CRUD (5 tests)
  - Create meal with ClickUp tasks (6 tests)
  - Delete meal with ClickUp task cleanup (6 tests)
  - Graceful handling without ClickUp list ID (1 test)
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
2. **Build and Test** (`.github/workflows/build.yml`) - Build + unit tests
3. **Integration Tests** (`.github/workflows/integration-tests.yml`) - E2E tests with PostgreSQL

---

## Frontend Testing (React)

### Stack

- **Unit/Integration Tests**: Vitest + React Testing Library
- **API Mocking**: MSW (Mock Service Worker)
- **E2E Tests**: Playwright

### Test File Structure

```
life-assistant-frontend/
├── src/
│   ├── test/
│   │   └── setup.ts                    # Test setup with jest-dom
│   ├── lib/
│   │   └── date.utils.test.ts          # Date utility unit tests
│   ├── components/
│   │   ├── Accordion.test.tsx          # Accordion component tests
│   │   ├── PageContainer.test.tsx      # PageContainer component tests
│   │   ├── ProtectedRoute.test.tsx     # Protected route tests
│   │   └── TaskCard.test.tsx           # TaskCard component tests
│   └── contexts/
│       └── AuthProvider.test.tsx       # Auth context integration tests
├── e2e/
│   ├── auth.spec.ts                    # Authentication E2E tests
│   ├── home.spec.ts                    # Home page E2E tests
│   └── navigation.spec.ts              # Navigation E2E tests
└── playwright.config.ts                # Playwright configuration
```

### Unit Tests (65 tests)

**Date Utils** (`src/lib/date.utils.test.ts`) - 24 tests
- [x] `getTodayString()` returns YYYY-MM-DD in local time
- [x] `formatDateString()` pads months/days correctly
- [x] `getStartOfWeek()` returns Sunday for any day
- [x] `getWeekDates()` returns 7 consecutive dates
- [x] `formatWeekRange()` formats date ranges correctly
- [x] Edge cases: month/year boundaries, immutability

**Accordion** (`src/components/Accordion.test.tsx`) - 9 tests
- [x] Renders title and children
- [x] Toggles content visibility on click
- [x] Shows count in title when provided
- [x] Respects defaultExpanded prop
- [x] Applies custom titleClassName

**PageContainer** (`src/components/PageContainer.test.tsx`) - 3 tests
- [x] Renders children correctly
- [x] Applies max-width and centering classes

**TaskCard** (`src/components/TaskCard.test.tsx`) - 18 tests
- [x] Renders task name and status badge
- [x] Displays parent name when provided
- [x] Renders tags correctly
- [x] Shows time of day badge
- [x] Displays due time when hasDueTime is true
- [x] Applies completed styling (line-through) for done/closed tasks
- [x] Applies status color to background and border
- [x] Links to task URL with correct attributes

### Integration Tests

**AuthProvider** (`src/contexts/AuthProvider.test.tsx`) - 6 tests
- [x] Provides unauthenticated state when no token exists
- [x] Validates existing token on mount via `/auth/me`
- [x] Clears invalid token on mount
- [x] Handles successful login (stores token, sets user)
- [x] Handles logout (clears token and user)
- [x] Throws error when useAuth used outside provider

**ProtectedRoute** (`src/components/ProtectedRoute.test.tsx`) - 5 tests
- [x] Shows loading state while `isLoading` is true
- [x] Redirects to `/login` when unauthenticated
- [x] Renders children when authenticated
- [x] Renders multiple children correctly
- [x] Prioritizes loading state over auth check

### E2E Tests (31 tests)

**Authentication** (`e2e/auth.spec.ts`) - 7 tests
- [x] Redirects to login when not authenticated
- [x] Displays login form correctly
- [x] Shows error message with invalid credentials
- [x] Disables submit button while signing in
- [x] Logs in successfully with valid credentials
- [x] Logs out successfully
- [x] Persists auth state across page refresh

**Home Page** (`e2e/home.spec.ts`) - 12 tests
- [x] Displays task statistics (completion rate, counts)
- [x] Displays tasks in accordions (overdue, today)
- [x] Displays task details (parent, status, tags, time of day)
- [x] Tasks are clickable links
- [x] Filters tasks by All/Work/Personal
- [x] Filter buttons show active state
- [x] Shows empty state when no tasks match filter
- [x] Shows loading state
- [x] Shows error state on API failure
- [x] Accordions can be collapsed and expanded

**Navigation** (`e2e/navigation.spec.ts`) - 12 tests
- [x] Shows navigation bar when authenticated
- [x] Hides navigation bar on login page
- [x] Shows user email in navigation
- [x] Navigates to all pages (Home, Stats, Meals, Shopping, Webhooks)
- [x] Redirects to login when accessing protected routes unauthenticated
- [x] Mobile navigation menu toggles
- [x] Mobile menu closes when navigating
- [x] Logout button is visible and functional

### What NOT to Unit Test

- Recharts rendering (covered by E2E visual verification)
- Tailwind CSS styling (implementation detail)
- TanStack Router internals
- API response shapes (backend's responsibility)

### Test Count Summary

| Area | Tests | Status |
|------|-------|--------|
| Date utils | 24 | Done |
| Accordion | 9 | Done |
| PageContainer | 3 | Done |
| TaskCard | 18 | Done |
| AuthProvider | 6 | Done |
| ProtectedRoute | 5 | Done |
| **Unit/Integration Total** | **65** | |
| Auth E2E | 7 | Done |
| Home E2E | 12 | Done |
| Navigation E2E | 12 | Done |
| **E2E Total** | **31** | |
| **Grand Total** | **96** | |

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

### Frontend
```bash
cd life-assistant-frontend

# Unit/integration tests (watch mode)
npm test

# Unit/integration tests (single run)
npm test -- --run

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

### CI
All tests run automatically on PRs to `main` or `staging` branches.
