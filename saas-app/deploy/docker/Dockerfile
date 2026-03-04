# Multi-arch build: works on Raspberry Pi (ARM64) and x86_64
FROM node:20-slim

WORKDIR /app

# Install build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy app
COPY config/ ./config/
COPY src/ ./src/

# Create data directory
RUN mkdir -p /app/data

# Non-root user
RUN adduser --disabled-password --no-create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "src/server.js"]
