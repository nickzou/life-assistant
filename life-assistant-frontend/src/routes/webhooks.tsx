import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { api } from '../lib/api';

interface WebhookStatusItem {
  id: string;
  source: 'wrike' | 'clickup';
  url: string;
  status: 'active' | 'suspended' | 'unknown';
  events?: string[];
}

interface WebhookStatusResponse {
  webhooks: WebhookStatusItem[];
  summary: {
    total: number;
    active: number;
    suspended: number;
  };
}

interface SetupWebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
  hookUrl?: string;
}

export const Route = createFileRoute('/webhooks')({
  component: WebhooksPage,
});

type WebhookPlatform = 'clickup' | 'wrike';

function WebhooksPage() {
  const [data, setData] = useState<WebhookStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [platform, setPlatform] = useState<WebhookPlatform>('clickup');

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<WebhookStatusResponse>('/webhooks/status');
      setData(response.data);
    } catch {
      setError('Failed to fetch webhook status');
    } finally {
      setLoading(false);
    }
  };

  const deleteWebhook = async (source: string, id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    setDeleting(id);
    setError(null);
    setSuccessMessage(null);
    try {
      await api.delete(`/webhooks/${source}/${id}`);
      await fetchStatus();
    } catch {
      setError('Failed to delete webhook');
    } finally {
      setDeleting(null);
    }
  };

  const registerWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) {
      setError('Please enter a base URL');
      return;
    }

    setRegistering(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const endpoint = platform === 'clickup'
        ? '/clickup/webhooks/setup'
        : '/wrike/webhooks/setup';

      const response = await api.post<SetupWebhookResponse>(
        endpoint,
        { baseUrl: baseUrl.trim() }
      );
      if (response.data.success) {
        setSuccessMessage(`${platform.charAt(0).toUpperCase() + platform.slice(1)} webhook registered: ${response.data.hookUrl}`);
        setBaseUrl('');
        await fetchStatus();
      } else {
        setError(response.data.error || 'Failed to register webhook');
      }
    } catch {
      setError('Failed to register webhook');
    } finally {
      setRegistering(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhook Status
          </h1>
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Register Webhook Form */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Register Webhook
          </h2>
          <form onSubmit={registerWebhook} className="flex gap-3">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as WebhookPlatform)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="clickup">ClickUp</option>
              <option value="wrike">Wrike</option>
            </select>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://your-ngrok-url.ngrok.app"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={registering}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {registering ? 'Registering...' : 'Register'}
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Enter your base URL (e.g., ngrok URL for local testing). The webhook endpoint /webhooks/{platform} will be appended automatically.
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/50 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/50 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.summary.total}
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data.summary.active}
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                <p className="text-sm text-gray-500 dark:text-gray-400">Suspended</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {data.summary.suspended}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.webhooks.map((webhook) => (
                    <tr key={webhook.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            webhook.source === 'wrike'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}
                        >
                          {webhook.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-md">
                          {webhook.url}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            webhook.status === 'active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {webhook.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => deleteWebhook(webhook.source, webhook.id)}
                          disabled={deleting === webhook.id}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          {deleting === webhook.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.webhooks.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No webhooks registered
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
