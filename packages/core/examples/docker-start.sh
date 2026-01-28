#!/bin/bash
# Quick start script for Docker deployment on Linux/Mac

echo "========================================"
echo "AI Agent Examples - Docker Quick Start"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.docker.example .env
    echo ""
    echo "IMPORTANT: Please edit .env and add your API keys!"
    echo "Opening .env in default editor..."
    ${EDITOR:-nano} .env
    echo ""
fi

echo "Starting Docker services..."
docker-compose up -d

echo ""
echo "========================================"
echo "Services started successfully!"
echo "========================================"
echo ""
echo "Available services:"
echo "  - PostgreSQL database (port 5432)"
echo "  - chatbot-prisma"
echo "  - qa-bot"
echo "  - task-automation"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To attach to a service:"
echo "  docker attach agent-chatbot-prisma"
echo "  docker attach agent-qa-bot"
echo "  docker attach agent-task-automation"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "See DOCKER_DEPLOYMENT.md for more details."
echo "========================================"
