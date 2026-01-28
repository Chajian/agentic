# Docker Deployment Guide

This guide explains how to deploy the @ai-agent/core example projects using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later
- API keys for LLM providers (OpenAI, Anthropic, etc.)

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and add your API keys:

```bash
cd examples
cp .env.docker.example .env
```

Edit `.env` and add your API keys:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start All Services

To start all example projects with their dependencies:

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL database for the chatbot-prisma example
- Build and start all three example applications
- Create a shared network for inter-service communication

### 3. View Logs

To view logs from all services:

```bash
docker-compose logs -f
```

To view logs from a specific service:

```bash
docker-compose logs -f chatbot-prisma
docker-compose logs -f qa-bot
docker-compose logs -f task-automation
```

### 4. Interact with Examples

Each example runs in interactive mode. To attach to a running container:

```bash
# Chatbot with Prisma storage
docker attach agent-chatbot-prisma

# Q&A bot with RAG
docker attach agent-qa-bot

# Task automation
docker attach agent-task-automation
```

Press `Ctrl+P` then `Ctrl+Q` to detach without stopping the container.

### 5. Stop Services

To stop all services:

```bash
docker-compose down
```

To stop and remove all data (including database):

```bash
docker-compose down -v
```

## Individual Service Deployment

### Chatbot with Prisma Storage

This example requires a PostgreSQL database.

#### Start Database Only

```bash
docker-compose up -d postgres
```

#### Build and Run Chatbot

```bash
docker-compose up -d chatbot-prisma
```

#### Access the Container

```bash
docker exec -it agent-chatbot-prisma sh
```

#### Database Management

View database with Prisma Studio (requires local installation):

```bash
# From the chatbot-prisma directory
npm run db:studio
```

Or connect directly to PostgreSQL:

```bash
docker exec -it agent-postgres psql -U agent -d agent_db
```

### Q&A Bot with RAG

This example doesn't require a database and uses in-memory storage.

#### Build and Run

```bash
docker-compose up -d qa-bot
```

#### Add Custom Knowledge

Mount your own knowledge directory:

```bash
docker run -it --rm \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -v $(pwd)/my-knowledge:/app/knowledge \
  agent-qa-bot
```

### Task Automation

This example demonstrates custom tools without requiring a database.

#### Build and Run

```bash
docker-compose up -d task-automation
```

## Building Individual Images

### Build Chatbot Image

```bash
cd chatbot-prisma
docker build -t agent-chatbot-prisma .
```

### Build Q&A Bot Image

```bash
cd qa-bot
docker build -t agent-qa-bot .
```

### Build Task Automation Image

```bash
cd task-automation
docker build -t agent-task-automation .
```

## Production Deployment

### Environment Configuration

For production, create separate environment files:

```bash
# Production environment
cp .env.docker.example .env.production
```

Update with production values:

```env
OPENAI_API_KEY=sk-prod-...
DATABASE_URL=postgresql://user:pass@prod-db:5432/agent_db
NODE_ENV=production
```

### Use Production Compose File

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  chatbot-prisma:
    build:
      context: ./chatbot-prisma
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: ${DATABASE_URL}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
```

Deploy with:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks

The PostgreSQL service includes health checks. Monitor service health:

```bash
docker-compose ps
```

### Backup Database

Backup PostgreSQL data:

```bash
docker exec agent-postgres pg_dump -U agent agent_db > backup.sql
```

Restore from backup:

```bash
cat backup.sql | docker exec -i agent-postgres psql -U agent -d agent_db
```

## Troubleshooting

### Database Connection Issues

If the chatbot can't connect to the database:

1. Check if PostgreSQL is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Verify connection string:
   ```bash
   docker-compose exec chatbot-prisma env | grep DATABASE_URL
   ```

3. Test database connection:
   ```bash
   docker-compose exec postgres psql -U agent -d agent_db -c "SELECT 1"
   ```

### Container Won't Start

Check logs for errors:

```bash
docker-compose logs chatbot-prisma
```

Common issues:
- Missing API keys in `.env` file
- Database not ready (wait for health check)
- Port conflicts (change ports in docker-compose.yml)

### Permission Issues

If you encounter permission errors:

```bash
# Fix ownership of mounted volumes
sudo chown -R $(id -u):$(id -g) ./chatbot-prisma
```

### Rebuild After Code Changes

Force rebuild of images:

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Advanced Configuration

### Custom Network

Create a custom network for better isolation:

```bash
docker network create agent-network
```

Update docker-compose.yml:

```yaml
networks:
  default:
    external: true
    name: agent-network
```

### Resource Limits

Add resource constraints:

```yaml
services:
  chatbot-prisma:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Logging Configuration

Configure logging driver:

```yaml
services:
  chatbot-prisma:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` templates
2. **Use secrets management** - Consider Docker secrets or external vaults
3. **Run as non-root user** - Add `USER node` to Dockerfiles
4. **Scan images** - Use `docker scan` to check for vulnerabilities
5. **Update base images** - Regularly update Node.js and Alpine versions
6. **Limit network exposure** - Only expose necessary ports
7. **Use read-only filesystems** - Add `read_only: true` where possible

## Monitoring

### Container Stats

Monitor resource usage:

```bash
docker stats
```

### Health Checks

Add health checks to application services:

```yaml
services:
  chatbot-prisma:
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build chatbot image
        run: |
          cd examples/chatbot-prisma
          docker build -t myregistry/agent-chatbot:latest .
      
      - name: Push to registry
        run: docker push myregistry/agent-chatbot:latest
```

## Support

For issues or questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Discord: [discord-invite]
