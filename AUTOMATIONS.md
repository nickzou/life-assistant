# Life Assistant Automations

Quick reference for all automations in the Life Assistant platform.

## Event-Driven (Webhook)

### 1. Add Meal to Grocy on Task Creation

| | |
|---|---|
| **Trigger** | ClickUp webhook: `taskCreated` or `taskUpdated` (when "Grocy ID" custom field is set) |
| **Endpoint** | `POST /webhooks/clickup` |
| **Services** | ClickUp → Grocy |

When a ClickUp task is created (or updated) with a "Grocy ID" custom field, the corresponding Grocy recipe is added to today's meal plan automatically.

**Flow**: ClickUp webhook fires → API fetches task details → extracts Grocy recipe ID from custom field → creates Grocy meal plan entry for today.

### 2. Consume Meal on Task Completion

| | |
|---|---|
| **Trigger** | ClickUp webhook: `taskStatusUpdated` (status changes to done/closed) |
| **Endpoint** | `POST /webhooks/clickup` |
| **Services** | ClickUp → Grocy |

When a meal prep ClickUp task is marked as done, Grocy consumes the recipe ingredients from stock and marks the meal plan entry as eaten.

**Flow**: ClickUp webhook fires → API checks if status is "done"/"closed" → fetches Grocy ID from task → calls Grocy consume endpoint to deduct ingredients → marks meal plan item as done.

---

## Meal Prep Orchestration

### 3. Create ClickUp Tasks for Meals

| | |
|---|---|
| **Trigger** | API call (user adds a meal via frontend) |
| **Endpoint** | `POST /grocy/meal-plan` |
| **Services** | Grocy, ClickUp, Database |

Creates a Grocy meal plan entry and optionally creates corresponding ClickUp tasks. The main task gets tagged with `meal prep`, `meal`, and the section name (e.g., `dinner`). A "Time of Day" custom field is set based on the section. If the recipe has a defrost requirement, a separate defrost task is also created.

**Request body** (key fields):
```json
{
  "day": "2025-02-07",
  "recipe_id": 123,
  "sectionName": "dinner",
  "createClickUpTasks": true,
  "recipeName": "Spaghetti Carbonara"
}
```

### 4. Delete Meal Tasks

| | |
|---|---|
| **Trigger** | API call (user deletes a meal via frontend) |
| **Endpoint** | `DELETE /grocy/meal-plan/:id` |
| **Services** | Grocy, ClickUp, Database |

Deletes a Grocy meal plan item and its associated ClickUp tasks. Completed tasks are skipped (not deleted). Task mappings are cleaned up from the database.

### 5. Update Section Tags

| | |
|---|---|
| **Trigger** | API call (user moves a meal to a different section) |
| **Endpoint** | `PATCH /grocy/meal-plan/:id` |
| **Services** | Grocy, ClickUp, Database |

When a meal is moved between sections (e.g., lunch → dinner), the ClickUp task's tags and "Time of Day" custom field are updated to match the new section.

**Tag mapping**: Removes old section tag, adds new one (e.g., `lunch` → `dinner`).
**Time of Day mapping**: breakfast → morning, lunch → mid day, dinner → evening.

---

## On-Demand

### 6. Smart Shopping List Generation

| | |
|---|---|
| **Trigger** | API call (user clicks "Generate Shopping List") |
| **Endpoint** | `POST /grocy/shopping-list/generate` |
| **Services** | Grocy (recipes, ingredients, stock) |

Generates a shopping list from a week's meal plan. Resolves all recipe ingredients recursively, including nested recipes and homemade products. Deducts current stock to calculate what actually needs to be purchased.

**Key features**:
- Recursive ingredient resolution (handles recipes within recipes)
- Homemade product detection: if a homemade product is in stock, uses it as-is; if not, resolves to base ingredients
- Serving multiplier calculation based on meal servings
- Stock deduction to avoid buying what you already have

**Request body**:
```json
{
  "startDate": "2025-02-07",
  "endDate": "2025-02-13"
}
```

### 7. Missing Products Restock

| | |
|---|---|
| **Trigger** | API call (user clicks "Restock Low Items") |
| **Endpoint** | `POST /grocy/shopping-list/add-missing-products` |
| **Services** | Grocy |

Adds all products below their minimum stock level to the Grocy shopping list. Wraps Grocy's built-in low-stock detection via the API.

---

## Architecture Reference

| Module | Files | Automations |
|---|---|---|
| Webhooks | `src/webhooks/clickup-webhook-handler.service.ts` | #1, #2 |
| Meal Prep | `src/meal-prep/meal-prep.service.ts` | #3, #4, #5 |
| Grocy Shopping | `src/grocy/grocy-shopping.service.ts` | #6, #7 |
| Grocy Controller | `src/grocy/grocy.controller.ts` | HTTP endpoints for #3–#7 |
| Webhooks Controller | `src/webhooks/webhooks.controller.ts` | HTTP endpoints for #1–#2 |
