# Documentation Site

This document describes the documentation site setup for **@ai-agent/core**.

## Overview

The documentation site is built with **VitePress** and includes:

- ✅ **User Guides** - Getting started, tutorials, and concepts
- ✅ **API Reference** - Complete API documentation (auto-generated from TypeScript)
- ✅ **Examples** - Working code examples and use cases
- ✅ **Plugin Directory** - Official and community plugins
- ✅ **Stateless Architecture Guide** - Detailed explanation of the design philosophy

## Technology Stack

- **VitePress** - Modern static site generator
- **TypeDoc** - API documentation generator from TypeScript
- **GitHub Pages** - Hosting (automatic deployment)

## Structure

```
docs-site/
├── .vitepress/config.ts   # Site configuration
├── index.md               # Homepage
├── guide/                 # User guides
├── api/                   # API reference
├── examples/              # Examples
└── plugins/               # Plugin directory
```

## Development

### Local Development

```bash
npm run docs:dev
```

Visit http://localhost:5173

### Build

```bash
npm run docs:build
```

### Generate API Docs

```bash
npm run docs:api
```

## Deployment

### Automatic (GitHub Pages)

Documentation is automatically deployed when changes are pushed to `main` branch.

Workflow: `.github/workflows/docs.yml`

### Manual Deployment

Deploy to any static hosting:

1. Build: `npm run docs:build`
2. Deploy `docs-site/.vitepress/dist/`

## Content

### Guides Created

1. **Getting Started** - Introduction and philosophy
2. **Installation** - Setup instructions
3. **Quick Start** - 5-minute tutorial
4. **Stateless Architecture** - Design philosophy explained

### API Reference

- Auto-generated from TypeScript source
- Manual pages for key concepts
- Code examples throughout

### Examples

- Chatbot with Prisma
- Q&A Bot with RAG
- Task Automation
- Custom Storage
- Custom Tools

### Plugin Directory

- Official plugins
- Community plugins
- Plugin development guide

## Next Steps

To complete the documentation:

1. Add remaining guide pages (storage, tools, LLM providers, etc.)
2. Create detailed API pages for each class
3. Add more examples
4. Create diagrams and visuals
5. Set up search functionality (included in VitePress)

## URLs

- **Development**: http://localhost:5173
- **Production**: https://ai-agent-framework.github.io/core/

## Maintenance

- Update guides when features change
- Regenerate API docs after TypeScript changes
- Keep examples up to date
- Review and merge community plugin submissions
