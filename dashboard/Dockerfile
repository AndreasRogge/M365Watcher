# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY dashboard/client/package.json dashboard/client/package-lock.json* ./
RUN npm install
COPY dashboard/client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:22-alpine AS production
WORKDIR /app

# Install server dependencies
COPY dashboard/server/package.json dashboard/server/package-lock.json* ./
RUN npm install --omit=dev

# Copy server source
COPY dashboard/server/ ./

# Copy shared data catalog (single source of truth at repo root)
COPY data/ ./data/

# Copy built frontend into server's public directory
COPY --from=frontend-build /app/client/dist ./public

# The server will serve the static frontend files in production
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
