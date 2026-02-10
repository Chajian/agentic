# Support

Thank you for using Agentic! This document provides information on how to get help and support.

## Getting Help

### 📖 Documentation

Start with our comprehensive documentation:

- **[README](README.md)** - Quick start and overview
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Usage Guide](docs/USAGE_GUIDE.md)** - Detailed usage examples
- **[Migration Guide](docs/MIGRATION.md)** - Upgrading between versions
- **[Examples](examples/)** - Working example projects

### 💬 Community Support

Get help from the community:

- **[GitHub Discussions](https://github.com/Chajian/agentic/discussions)** - Ask questions, share ideas
  - 💡 Q&A - Get answers to your questions
  - 💭 Ideas - Discuss feature requests
  - 🎉 Show and Tell - Share your projects
  - 📢 Announcements - Stay updated


### 🐛 Bug Reports

Found a bug? Please report it:

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** using our [bug report template](https://github.com/Chajian/agentic/issues/new?template=bug_report.yml)
3. **Provide details**:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Code samples
   - Environment details

### 💡 Feature Requests

Have an idea for a new feature?

1. **Check existing requests** in [discussions](https://github.com/Chajian/agentic/discussions/categories/ideas)
2. **Create a feature request** using our [template](https://github.com/Chajian/agentic/issues/new?template=feature_request.yml)
3. **Describe your use case** and how the feature would help

## Common Issues

### Installation Problems

**Issue**: Package installation fails

```bash
npm ERR! code ERESOLVE
```

**Solution**: Try using legacy peer deps:
```bash
npm install @agenticc/core --legacy-peer-deps
```

### TypeScript Errors

**Issue**: Type errors when using the package

**Solution**: Ensure you're using TypeScript 4.5 or higher:
```bash
npm install -D typescript@latest
```

### LLM Connection Issues

**Issue**: Cannot connect to LLM provider

**Solution**: 
1. Verify API key is set correctly
2. Check network connectivity
3. Verify provider endpoint is accessible
4. Check rate limits

```typescript
// Enable debug logging
const agent = new Agent({
  logging: {
    level: 'debug'
  }
});
```

### Memory Issues

**Issue**: High memory usage with large conversations

**Solution**: Implement conversation history truncation:

```typescript
const MAX_HISTORY = 20;

const history = await storage.getHistory(sessionId);
const truncatedHistory = history.slice(-MAX_HISTORY);

const response = await agent.chat(message, {
  history: truncatedHistory
});
```

## Response Times

We aim to respond to:

- **Critical bugs**: Within 24 hours
- **Bug reports**: Within 3 business days
- **Feature requests**: Within 1 week
- **Questions**: Within 2 business days

Note: These are community support response times. For faster support, consider commercial support options.

## Commercial Support

For businesses requiring priority support, custom development, training and consulting, contact us at: **936796603@qq.com**

## Contributing

Want to contribute? We'd love your help!

- Read our [Contributing Guide](CONTRIBUTING.md)
- Check out [good first issues](https://github.com/Chajian/agentic/labels/good%20first%20issue)

## Security Issues

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

**Do not** report security issues publicly. Email: xylyjy@gmail.com

## Resources

### Related Projects

- [@agenticc/storage-prisma](https://github.com/Chajian/agentic/tree/main/packages/storage-prisma) - Prisma storage adapter
- [@agenticc/storage-memory](https://github.com/Chajian/agentic/tree/main/packages/storage-memory) - In-memory storage adapter
- [@agenticc/cli](https://github.com/Chajian/agentic/tree/main/packages/cli) - CLI scaffolding tool

## Contact

- **Email**: xylyjy@gmail.com
- **GitHub**: [Chajian](https://github.com/Chajian)

## Acknowledgments

Thank you to all our contributors and community members who help make Agentic better!

---

**Last Updated**: January 2025

For the most up-to-date information, visit our [documentation site](https://chajian.github.io/agentic/).
