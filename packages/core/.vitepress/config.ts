import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@ai-agent/core',
  description: 'AI Agent Framework - LLM-powered intelligent assistant with RAG and tool calling',
  base: '/core/',
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      { text: 'Plugins', link: '/plugins/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
            { text: 'Stateless Architecture', link: '/guide/stateless-architecture' },
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Agent Core', link: '/guide/agent-core' },
            { text: 'Storage Management', link: '/guide/storage' },
            { text: 'LLM Providers', link: '/guide/llm-providers' },
            { text: 'Tool System', link: '/guide/tools' },
            { text: 'Knowledge & RAG', link: '/guide/knowledge' },
            { text: 'Streaming Events', link: '/guide/streaming' },
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Plugin Development', link: '/guide/plugin-development' },
            { text: 'Custom LLM Adapters', link: '/guide/custom-llm' },
            { text: 'Logging & Monitoring', link: '/guide/logging' },
            { text: 'Error Handling', link: '/guide/error-handling' },
            { text: 'Performance Optimization', link: '/guide/performance' },
          ]
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Docker Deployment', link: '/guide/docker' },
            { text: 'Production Best Practices', link: '/guide/production' },
            { text: 'Scaling', link: '/guide/scaling' },
          ]
        },
        {
          text: 'Migration',
          items: [
            { text: 'Migration Guide', link: '/guide/migration' },
            { text: 'Breaking Changes', link: '/guide/breaking-changes' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Agent', link: '/api/agent' },
            { text: 'Configuration', link: '/api/configuration' },
            { text: 'Types', link: '/api/types' },
            { text: 'Plugins', link: '/api/plugins' },
            { text: 'LLM Adapters', link: '/api/llm-adapters' },
            { text: 'Knowledge Store', link: '/api/knowledge-store' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Chatbot with Prisma', link: '/examples/chatbot-prisma' },
            { text: 'Q&A Bot', link: '/examples/qa-bot' },
            { text: 'Task Automation', link: '/examples/task-automation' },
            { text: 'Custom Storage', link: '/examples/custom-storage' },
            { text: 'Custom Tools', link: '/examples/custom-tools' },
          ]
        }
      ],
      '/plugins/': [
        {
          text: 'Plugin Directory',
          items: [
            { text: 'Overview', link: '/plugins/' },
            { text: 'Official Plugins', link: '/plugins/official' },
            { text: 'Community Plugins', link: '/plugins/community' },
            { text: 'Creating Plugins', link: '/plugins/creating' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ai-agent-framework/core' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@ai-agent/core' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present AI Agent Team'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/ai-agent-framework/core/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  }
})
