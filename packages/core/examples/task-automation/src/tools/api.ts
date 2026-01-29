import type { AgentPlugin, PluginContext } from '@agentic/core';

export const apiPlugin: AgentPlugin = {
  name: 'api_tools',
  description: 'Tools for making HTTP API requests',

  async initialize(context: PluginContext) {
    context.logger?.info('API tools plugin initialized');
  },

  tools: [
    {
      name: 'http_get',
      description: 'Make an HTTP GET request to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to fetch'
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers'
          }
        },
        required: ['url']
      },
      execute: async (params: { url: string; headers?: Record<string, string> }) => {
        try {
          const response = await fetch(params.url, {
            method: 'GET',
            headers: params.headers
          });

          const contentType = response.headers.get('content-type');
          let data: unknown;

          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          return {
            success: true,
            status: response.status,
            statusText: response.statusText,
            data
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Request failed'
          };
        }
      }
    },

    {
      name: 'http_post',
      description: 'Make an HTTP POST request to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to post to'
          },
          body: {
            type: 'object',
            description: 'Request body (will be JSON stringified)'
          },
          headers: {
            type: 'object',
            description: 'Optional HTTP headers'
          }
        },
        required: ['url', 'body']
      },
      execute: async (params: { 
        url: string; 
        body: Record<string, unknown>; 
        headers?: Record<string, string> 
      }) => {
        try {
          const response = await fetch(params.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...params.headers
            },
            body: JSON.stringify(params.body)
          });

          const contentType = response.headers.get('content-type');
          let data: unknown;

          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else {
            data = await response.text();
          }

          return {
            success: true,
            status: response.status,
            statusText: response.statusText,
            data
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Request failed'
          };
        }
      }
    },

    {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Optional timezone (e.g., "America/New_York")'
          }
        }
      },
      execute: async (params: { timezone?: string }) => {
        const now = new Date();
        
        return {
          success: true,
          timestamp: now.toISOString(),
          unix: Math.floor(now.getTime() / 1000),
          formatted: params.timezone 
            ? now.toLocaleString('en-US', { timeZone: params.timezone })
            : now.toLocaleString()
        };
      }
    }
  ],

  async cleanup() {
    // No cleanup needed
  }
};
