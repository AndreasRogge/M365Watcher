# Stage 1: Build the React frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:22-alpine AS production
WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# Copy server source
COPY server/ ./

# Copy built frontend into server's public directory
COPY --from=frontend-build /app/client/dist ./public

# The server will serve the static frontend files in production
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
