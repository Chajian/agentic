# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of @ai-agent/core seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- **Do not** open a public GitHub issue for security vulnerabilities
- **Do not** disclose the vulnerability publicly until we've had a chance to address it

### Please Do

1. **Email us** at security@your-org.com with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)

2. **Provide details** such as:
   - Affected versions
   - Configuration details
   - Proof of concept code (if applicable)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Updates**: Every 5 business days
- **Resolution Timeline**: Depends on severity
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 90 days

### Disclosure Policy

- We will acknowledge receipt of your vulnerability report
- We will confirm the vulnerability and determine its impact
- We will release a fix as soon as possible
- We will publicly disclose the vulnerability after a fix is available

### Security Best Practices

When using @ai-agent/core, follow these security best practices:

#### API Key Management

```typescript
// ❌ Bad - Hardcoded API keys
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: 'sk-...'
  }
});

// ✅ Good - Use environment variables
const agent = new Agent({
  llm: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  }
});
```

#### Input Validation

```typescript
// ✅ Always validate user input
function sanitizeInput(input: string): string {
  // Remove potentially harmful content
  return input.trim().slice(0, 1000);
}

const response = await agent.chat(sanitizeInput(userInput));
```

#### Tool Execution

```typescript
// ✅ Validate tool parameters
const tool = {
  name: 'execute_command',
  handler: async (params: { command: string }) => {
    // Whitelist allowed commands
    const allowedCommands = ['ls', 'pwd', 'date'];
    if (!allowedCommands.includes(params.command)) {
      throw new Error('Command not allowed');
    }
    // Execute safely
  }
};
```

#### Rate Limiting

```typescript
// ✅ Implement rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/agent', limiter);
```

#### Audit Logging

```typescript
// ✅ Enable audit logging for security events
const agent = new Agent({
  logging: {
    level: 'info',
    logger: securityLogger
  }
});
```

### Known Security Considerations

#### LLM Prompt Injection

Be aware that LLMs can be susceptible to prompt injection attacks. Always:
- Validate and sanitize user input
- Use system prompts to set boundaries
- Implement content filtering
- Monitor for suspicious patterns

#### Tool Execution Risks

Tools that execute code or system commands pose security risks:
- Whitelist allowed operations
- Validate all parameters
- Run in sandboxed environments
- Implement proper error handling

#### Data Privacy

When handling sensitive data:
- Don't log sensitive information
- Use encryption for data at rest
- Implement proper access controls
- Follow data retention policies

### Security Updates

Subscribe to security updates:
- Watch the repository for security advisories
- Enable GitHub security alerts
- Follow our security mailing list: security-announce@your-org.com

### Bug Bounty Program

We currently do not have a bug bounty program, but we greatly appreciate security researchers who responsibly disclose vulnerabilities.

### Recognition

We maintain a security hall of fame for researchers who have helped improve our security:

- [Your Name] - [Vulnerability Description] - [Date]

### Contact

For security concerns, contact:
- Email: security@your-org.com
- PGP Key: [Link to PGP key]

For general questions:
- GitHub Discussions: https://github.com/your-org/ai-agent-core/discussions
- Email: support@your-org.com

Thank you for helping keep @ai-agent/core and our users safe!
