# Support

Thank you for using @ai-agent/core! This document provides information on how to get help and support.

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

- **[GitHub Discussions](https://github.com/your-org/ai-agent-core/discussions)** - Ask questions, share ideas
  - 💡 Q&A - Get answers to your questions
  - 💭 Ideas - Discuss feature requests
  - 🎉 Show and Tell - Share your projects
  - 📢 Announcements - Stay updated

- **[Discord Community](https://discord.gg/your-invite)** - Real-time chat
  - #general - General discussion
  - #help - Get help from community
  - #showcase - Share your projects
  - #development - Contribute to the project

### 🐛 Bug Reports

Found a bug? Please report it:

1. **Search existing issues** to avoid duplicates
2. **Create a new issue** using our [bug report template](https://github.com/your-org/ai-agent-core/issues/new?template=bug_report.yml)
3. **Provide details**:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Code samples
   - Environment details

### 💡 Feature Requests

Have an idea for a new feature?

1. **Check existing requests** in [discussions](https://github.com/your-org/ai-agent-core/discussions/categories/ideas)
2. **Create a feature request** using our [template](https://github.com/your-org/ai-agent-core/issues/new?template=feature_request.yml)
3. **Describe your use case** and how the feature would help

## Common Issues

### Installation Problems

**Issue**: Package installation fails

```bash
npm ERR! code ERESOLVE
```

**Solution**: Try using legacy peer deps:
```bash
npm install @ai-agent/core --legacy-peer-deps
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

For businesses requiring:
- Priority support
- SLA guarantees
- Custom development
- Training and consulting
- Private support channels

Contact us at: **support@your-org.com**

### Commercial Support Plans

#### Starter
- Email support
- 2 business day response time
- Community Slack access
- $500/month

#### Professional
- Priority email support
- 1 business day response time
- Private Slack channel
- Monthly check-in calls
- $2,000/month

#### Enterprise
- 24/7 support
- 4-hour response time for critical issues
- Dedicated support engineer
- Custom SLA
- On-site training available
- Contact for pricing

## Contributing

Want to contribute? We'd love your help!

- Read our [Contributing Guide](CONTRIBUTING.md)
- Check out [good first issues](https://github.com/your-org/ai-agent-core/labels/good%20first%20issue)
- Join our [Discord](https://discord.gg/your-invite) #development channel

## Security Issues

For security vulnerabilities, please see our [Security Policy](SECURITY.md).

**Do not** report security issues publicly. Email: security@your-org.com

## Resources

### Learning Resources

- **[Blog](https://blog.your-org.com)** - Tutorials and best practices
- **[YouTube Channel](https://youtube.com/@your-org)** - Video tutorials
- **[Newsletter](https://newsletter.your-org.com)** - Monthly updates

### Related Projects

- [@ai-agent/storage-prisma](https://github.com/your-org/storage-prisma) - Prisma storage adapter
- [@ai-agent/storage-mongodb](https://github.com/your-org/storage-mongodb) - MongoDB storage adapter
- [@ai-agent/cli](https://github.com/your-org/cli) - CLI scaffolding tool

### Community Projects

- [Awesome AI Agent](https://github.com/your-org/awesome-ai-agent) - Curated list of resources
- [Plugin Directory](https://plugins.your-org.com) - Community plugins

## Contact

- **General inquiries**: hello@your-org.com
- **Support**: support@your-org.com
- **Security**: security@your-org.com
- **Business**: business@your-org.com

## Social Media

- **Twitter**: [@your_org](https://twitter.com/your_org)
- **LinkedIn**: [Your Org](https://linkedin.com/company/your-org)
- **GitHub**: [@your-org](https://github.com/your-org)

## Office Hours

Join our weekly office hours:
- **When**: Every Friday, 2-3 PM UTC
- **Where**: [Discord](https://discord.gg/your-invite) voice channel
- **What**: Ask questions, get help, discuss the project

## Acknowledgments

Thank you to all our contributors and community members who help make @ai-agent/core better!

---

**Last Updated**: January 2025

For the most up-to-date information, visit our [documentation site](https://docs.your-org.com).
