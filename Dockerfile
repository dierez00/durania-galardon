# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better cache)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN npm install --omit=dev && npm install --save-dev typescript @types/node || true

# Copy source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npx tsc

# Runtime stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy only necessary files
COPY package.json ./
COPY --from=builder /app/dist ./dist

# Install only production deps
RUN npm install --omit=dev

# Railway sets PORT env var
ENV PORT=${PORT}

EXPOSE 3000

CMD ["node", "dist/index.js"]
