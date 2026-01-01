
# AURA & ECHO - SLIPLANE DEPLOYMENT CONFIG
# ----------------------------------------
# 1. Build Stage
FROM node:20-slim AS build
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts index.html ./
RUN npm install
COPY . .
RUN npm run build

# 2. Production Stage
FROM node:20-slim
WORKDIR /app

# Install production server dependencies
COPY package.json ./
RUN npm install --omit=dev && npm install tsx

# Copy built frontend assets and server logic
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./
COPY --from=build /app/types.ts ./

# Sliplane Environment Requirements
ENV PORT=4000
EXPOSE 4000

# Start the Sanctuary engine
# Note: Using tsx to run the server.ts directly in production for simplicity
CMD ["npx", "tsx", "server.ts"]