# @ai-agent/core Documentation

This directory contains the documentation site for **@ai-agent/core**, built with [VitePress](https://vitepress.dev/).

## Structure

```
docs-site/
├── .vitepress/
│   └── config.ts          # VitePress configuration
├── guide/                 # User guides and tutorials
│   ├── getting-started.md
│   ├── installation.md
│   ├── quick-start.md
│   ├── stateless-architecture.md
│   └── ...
├── api/                   # API reference
│   ├── index.md
│   ├── agent.md
│   ├── configuration.md
│   └── generated/         # Auto-generated from TypeDoc
├── examples/              # Example projects
│   ├── index.md
│   ├── chatbot-prisma.md
│   └── ...
├── plugins/               # Plugin directory
│   ├── index.md
│   ├── official.md
│   └── community.md
└── index.md               # Homepage
```

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run docs:dev
```

Visit http://localhost:5173

### Generate API Documentation

Generate API reference from TypeScript source:

```bash
npm run docs:api
```

This uses TypeDoc to generate markdown files in `docs-site/api/generated/`.

### Build for Production

```bash
npm run docs:build
```

Output is in `docs-site/.vitepress/dist/`.

### Preview Production Build

```bash
npm run docs:preview
```

## Deployment

### GitHub Pages

The documentation is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

See `.github/workflows/docs.yml` for the deployment workflow.

### Manual Deployment

1. Build the documentation:
   ```bash
   npm run docs:build
   ```

2. Deploy the `docs-site/.vitepress/dist/` directory to your hosting provider.

### Vercel

1. Import the repository in Vercel
2. Set build command: `npm run docs:build`
3. Set output directory: `docs-site/.vitepress/dist`
4. Deploy

### Netlify

1. Import the repository in Netlify
2. Set build command: `npm run docs:build`
3. Set publish directory: `docs-site/.vitepress/dist`
4. Deploy

## Writing Documentation

### Adding a New Guide

1. Create a new markdown file in `docs-site/guide/`
2. Add frontmatter if needed:
   ```markdown
   ---
   title: My Guide
   description: Guide description
   ---
   ```
3. Add to sidebar in `.vitepress/config.ts`

### Adding a New API Page

1. Create a new markdown file in `docs-site/api/`
2. Document the API with code examples
3. Add to sidebar in `.vitepress/config.ts`

### Adding an Example

1. Create a new markdown file in `docs-site/examples/`
2. Include complete code examples
3. Link to the actual example in the repository
4. Add to sidebar in `.vitepress/config.ts`

### Code Blocks

Use syntax highlighting:

````markdown
```typescript
import { Agent } from '@ai-agent/core';

const agent = new Agent(config);
```
````

### Callouts

Use VitePress callouts:

```markdown
::: tip
This is a tip
:::

::: warning
This is a warning
:::

::: danger
This is a danger message
:::

::: info
This is an info message
:::
```

### Code Groups

Show multiple options:

````markdown
::: code-group

```bash [npm]
npm install @ai-agent/core
```

```bash [pnpm]
pnpm add @ai-agent/core
```

```bash [yarn]
yarn add @ai-agent/core
```

:::
````

## Updating API Reference

The API reference is partially auto-generated from TypeScript source using TypeDoc.

To update:

1. Update JSDoc comments in source code
2. Run `npm run docs:api`
3. Review generated files in `docs-site/api/generated/`
4. Manually edit API pages in `docs-site/api/` as needed

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the documentation.

### Documentation Standards

- Use clear, concise language
- Include code examples for all features
- Test all code examples
- Link to related pages
- Use proper markdown formatting
- Add images/diagrams where helpful

### Style Guide

- Use **bold** for emphasis
- Use `code` for inline code
- Use proper heading hierarchy (h1 → h2 → h3)
- Use lists for multiple items
- Use tables for comparisons
- Use callouts for important notes

## License

MIT License - see [LICENSE](../LICENSE) for details.
