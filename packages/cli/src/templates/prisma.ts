import type { ProjectConfig } from '../types.js';

export function generatePrismaSchema(config: ProjectConfig): string {
  return `// This is your Prisma schema file
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // Change to "postgresql" or "mysql" for production
  url      = env("DATABASE_URL")
}

model Session {
  id        String   @id @default(uuid())
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  active    Boolean  @default(true)
  metadata  Json?
}

model Message {
  id        String   @id @default(uuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String   // 'user' | 'assistant' | 'system'
  content   String
  timestamp DateTime @default(now())
  toolCalls Json?
  metadata  Json?

  @@index([sessionId])
  @@index([timestamp])
}
`;
}
