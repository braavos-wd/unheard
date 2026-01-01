# AURA & ECHO - UNIFIED PRODUCTION DOCKERFILE
# This configuration builds the frontend and runs the backend server
# which serves both the API and the static frontend assets.

# --- STAGE 1: Build Frontend ---
FROM node:20-slim AS build
WORKDIR /app

# Copy dependency manifests
COPY package.json ./
RUN npm install

# Copy source code
COPY . .

# Build the production assets into the /dist folder
RUN npm run build

# --- STAGE 2: Production Runtime ---
FROM node:20-slim
WORKDIR /app

# Install production-only backend dependencies
COPY package.json ./
RUN npm install --omit=dev && npm install tsx

# Copy the built frontend from the previous stage
COPY --from=build /app/dist ./dist

# Copy the server source and type definitions
COPY --from=build /app/server.ts ./
COPY --from=build /app/types.ts ./

# Environment configuration
# Sliplane and other providers will use this port
ENV PORT=4000
EXPOSE 4000

# START COMMAND:
# In production, we run ONLY the server.
# The server.ts is the unified entry point:
# 1. It starts the Express API and Socket.io engine.
# 2. It serves the static React files from the /dist folder.
# 'tsx' is used to run the TypeScript server file directly.
CMD ["npx", "tsx", "server.ts"]
