import * as fs from 'fs/promises';
import * as path from 'path';
import type { AgentPlugin, PluginContext } from '@agentic/core';

export const filePlugin: AgentPlugin = {
  name: 'file_operations',
  description: 'Tools for reading, writing, and managing files',

  async initialize(context: PluginContext) {
    // Ensure workspace directory exists
    const workspaceDir = process.env.WORKSPACE_DIR || './workspace';
    await fs.mkdir(workspaceDir, { recursive: true });
    context.logger?.info(`File plugin initialized with workspace: ${workspaceDir}`);
  },

  tools: [
    {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read (relative to workspace)'
          }
        },
        required: ['path']
      },
      execute: async (params: { path: string }) => {
        const workspaceDir = process.env.WORKSPACE_DIR || './workspace';
        const fullPath = path.join(workspaceDir, params.path);
        
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          return {
            success: true,
            content,
            path: params.path
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },

    {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write (relative to workspace)'
          },
          content: {
            type: 'string',
            description: 'Content to write to the file'
          }
        },
        required: ['path', 'content']
      },
      execute: async (params: { path: string; content: string }) => {
        const workspaceDir = process.env.WORKSPACE_DIR || './workspace';
        const fullPath = path.join(workspaceDir, params.path);
        
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, params.content, 'utf-8');
          
          return {
            success: true,
            message: `File written successfully to ${params.path}`,
            path: params.path
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },

    {
      name: 'list_files',
      description: 'List all files in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path (relative to workspace, defaults to root)'
          }
        }
      },
      execute: async (params: { path?: string }) => {
        const workspaceDir = process.env.WORKSPACE_DIR || './workspace';
        const dirPath = params.path 
          ? path.join(workspaceDir, params.path)
          : workspaceDir;
        
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          const files = entries.map(entry => ({
            name: entry.name,
            type: entry.isDirectory() ? 'directory' : 'file'
          }));
          
          return {
            success: true,
            files,
            path: params.path || '.'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    },

    {
      name: 'delete_file',
      description: 'Delete a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to delete (relative to workspace)'
          }
        },
        required: ['path']
      },
      execute: async (params: { path: string }) => {
        const workspaceDir = process.env.WORKSPACE_DIR || './workspace';
        const fullPath = path.join(workspaceDir, params.path);
        
        try {
          await fs.unlink(fullPath);
          return {
            success: true,
            message: `File deleted: ${params.path}`
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }
  ],

  async cleanup() {
    // No cleanup needed
  }
};
