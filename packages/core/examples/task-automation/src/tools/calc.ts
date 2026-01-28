import type { AgentPlugin, PluginContext } from '@ai-agent/core';

export const calcPlugin: AgentPlugin = {
  name: 'calculator',
  description: 'Mathematical calculation tools',

  async initialize(context: PluginContext) {
    context.logger?.info('Calculator plugin initialized');
  },

  tools: [
    {
      name: 'calculate',
      description: 'Perform mathematical calculations. Supports +, -, *, /, %, ** (power), sqrt, abs',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "10 ** 2")'
          }
        },
        required: ['expression']
      },
      execute: async (params: { expression: string }) => {
        try {
          // Safe evaluation using Function constructor with limited scope
          const safeEval = (expr: string): number => {
            // Replace common math functions
            const sanitized = expr
              .replace(/sqrt\(/g, 'Math.sqrt(')
              .replace(/abs\(/g, 'Math.abs(')
              .replace(/pow\(/g, 'Math.pow(')
              .replace(/\*\*/g, '**');

            // Only allow numbers, operators, and Math functions
            if (!/^[\d\s+\-*/.()%,]+$/.test(sanitized.replace(/Math\.(sqrt|abs|pow)/g, ''))) {
              throw new Error('Invalid expression: only numbers and basic operators allowed');
            }

            return Function(`"use strict"; return (${sanitized})`)();
          };

          const result = safeEval(params.expression);

          return {
            success: true,
            expression: params.expression,
            result
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Calculation error'
          };
        }
      }
    },

    {
      name: 'sum',
      description: 'Calculate the sum of multiple numbers',
      parameters: {
        type: 'object',
        properties: {
          numbers: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of numbers to sum'
          }
        },
        required: ['numbers']
      },
      execute: async (params: { numbers: number[] }) => {
        const sum = params.numbers.reduce((acc, n) => acc + n, 0);
        return {
          success: true,
          numbers: params.numbers,
          sum
        };
      }
    },

    {
      name: 'average',
      description: 'Calculate the average of multiple numbers',
      parameters: {
        type: 'object',
        properties: {
          numbers: {
            type: 'array',
            items: { type: 'number' },
            description: 'Array of numbers to average'
          }
        },
        required: ['numbers']
      },
      execute: async (params: { numbers: number[] }) => {
        if (params.numbers.length === 0) {
          return {
            success: false,
            error: 'Cannot calculate average of empty array'
          };
        }

        const sum = params.numbers.reduce((acc, n) => acc + n, 0);
        const average = sum / params.numbers.length;

        return {
          success: true,
          numbers: params.numbers,
          average,
          count: params.numbers.length
        };
      }
    }
  ],

  async cleanup() {
    // No cleanup needed
  }
};
