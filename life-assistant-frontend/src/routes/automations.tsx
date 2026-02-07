import { createFileRoute } from '@tanstack/react-router';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PageContainer } from '../components/PageContainer';

export const Route = createFileRoute('/automations')({
  component: AutomationsPage,
});

interface AutomationCard {
  name: string;
  trigger: string;
  endpoint: string;
  services: string[];
  description: string;
}

const eventDriven: AutomationCard[] = [
  {
    name: 'Add Meal to Grocy on Task Creation',
    trigger: 'ClickUp webhook: taskCreated / taskUpdated',
    endpoint: 'POST /webhooks/clickup',
    services: ['ClickUp', 'Grocy'],
    description:
      'When a ClickUp task with a "Grocy ID" custom field is created or updated, the corresponding recipe is added to today\'s Grocy meal plan.',
  },
  {
    name: 'Consume Meal on Task Completion',
    trigger: 'ClickUp webhook: taskStatusUpdated (done/closed)',
    endpoint: 'POST /webhooks/clickup',
    services: ['ClickUp', 'Grocy'],
    description:
      'When a meal prep task is marked done in ClickUp, Grocy consumes the recipe ingredients from stock and marks the meal plan entry as eaten.',
  },
];

const mealPrep: AutomationCard[] = [
  {
    name: 'Create ClickUp Tasks for Meals',
    trigger: 'API call (add meal via frontend)',
    endpoint: 'POST /grocy/meal-plan',
    services: ['Grocy', 'ClickUp', 'Database'],
    description:
      'Creates a Grocy meal plan entry and optionally creates ClickUp tasks with section tags, "Time of Day" custom field, and defrost tasks if needed.',
  },
  {
    name: 'Delete Meal Tasks',
    trigger: 'API call (delete meal via frontend)',
    endpoint: 'DELETE /grocy/meal-plan/:id',
    services: ['Grocy', 'ClickUp', 'Database'],
    description:
      'Deletes a Grocy meal plan item and its associated ClickUp tasks. Completed tasks are skipped. Task mappings are cleaned up.',
  },
  {
    name: 'Update Section Tags',
    trigger: 'API call (move meal between sections)',
    endpoint: 'PATCH /grocy/meal-plan/:id',
    services: ['Grocy', 'ClickUp', 'Database'],
    description:
      'When a meal is moved between sections (e.g., lunch to dinner), updates the ClickUp task\'s tags and "Time of Day" custom field to match.',
  },
];

const onDemand: AutomationCard[] = [
  {
    name: 'Smart Shopping List Generation',
    trigger: 'API call (user clicks "Generate Shopping List")',
    endpoint: 'POST /grocy/shopping-list/generate',
    services: ['Grocy'],
    description:
      'Generates a shopping list from a week\'s meal plan. Recursively resolves recipe ingredients, handles homemade products and nested recipes, and deducts current stock.',
  },
  {
    name: 'Missing Products Restock',
    trigger: 'API call (user clicks "Restock Low Items")',
    endpoint: 'POST /grocy/shopping-list/add-missing-products',
    services: ['Grocy'],
    description:
      'Adds all products below their minimum stock level to the Grocy shopping list.',
  },
];

const serviceColors: Record<string, string> = {
  ClickUp:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Grocy:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Database:
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

function AutomationCardComponent({ automation }: { automation: AutomationCard }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {automation.name}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        {automation.description}
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0">
            Trigger
          </span>
          <span className="text-gray-700 dark:text-gray-300">
            {automation.trigger}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0">
            API
          </span>
          <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded">
            {automation.endpoint}
          </code>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0">
            Services
          </span>
          <div className="flex flex-wrap gap-1">
            {automation.services.map((service) => (
              <span
                key={service}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${serviceColors[service] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AutomationsPage() {
  const sections = [
    {
      title: 'Event-Driven',
      subtitle: 'Triggered automatically by ClickUp webhook events',
      items: eventDriven,
    },
    {
      title: 'Meal Prep Orchestration',
      subtitle: 'Keeps ClickUp tasks in sync when managing meals',
      items: mealPrep,
    },
    {
      title: 'On-Demand',
      subtitle: 'Triggered manually from the frontend',
      items: onDemand,
    },
  ];

  return (
    <ProtectedRoute>
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Automations
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            All automations connecting ClickUp, Grocy, and the Life Assistant API.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {section.subtitle}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.items.map((automation) => (
                  <AutomationCardComponent
                    key={automation.name}
                    automation={automation}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </ProtectedRoute>
  );
}
