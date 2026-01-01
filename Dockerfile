# AURA & ECHO - OPTIMIZED PRODUCTION DOCKERFILE

# --- STAGE 1: Build Stage ---
FROM node:20-slim AS build
WORKDIR /app

# Install all dependencies including devDependencies for compilation
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and config
COPY tsconfig.json vite.config.ts index.html ./
COPY . .

# 1. Build Frontend Assets (Vite)
RUN npm run build

# 2. Build Backend (Compile TS to JS for production stability)
RUN echo "=== Starting backend build ===" && \
    mkdir -p dist-server && \
    echo "Current directory: $(pwd)" && \
    echo "Files in current directory: $(ls -la)" && \
    echo "\n=== Listing source files ===" && \
    ls -la server.ts types.ts 2>/dev/null || echo "Source files not found!" && \
    echo "\n=== Running TypeScript compiler ===" && \
    npx tsc --project tsconfig.server.json --listFiles && \
    npx tsc --project tsconfig.server.json && \
    echo "\n=== Compiled files in dist-server ===" && \
    find dist-server -type f -exec ls -la {} \; || echo "No files found in dist-server" && \
    echo "\n=== Build completed ==="

# --- STAGE 2: Production Stage ---
FROM node:20-slim
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy built backend files and verify
COPY --from=build /app/dist-server/ ./

# Verify files were copied correctly
RUN echo "\n=== Files in /app after copy ===" && \
    ls -la && \
    echo "\n=== Contents of dist-server ===" && \
    ls -la dist-server/ 2>/dev/null || echo "dist-server not found" && \
    echo "\n=== Checking for server.js ===" && \
    if [ -f "dist-server/server.js" ]; then \
        echo "server.js found!" && \
        echo "First 5 lines of server.js:" && \
        head -n 5 dist-server/server.js; \
    else \
        echo "ERROR: server.js not found in dist-server/" && \
        echo "Current directory: $(pwd)" && \
        find . -name "*.js" -o -name "*.ts" | sort; \
    fi

# Environment setup
ENV PORT=4000
ENV NODE_ENV=production
EXPOSE 4000

# Run the server from the correct location
CMD ["node", "dist-server/server.js"]

# DEPLOYMENT NOTES:
# - This 2-stage build ensures the smallest possible container.
# - Running the compiled .js file is much faster and more reliable than tsx in production.
# - Ensure MONGODB_URI and API_KEY are configured in your Sliplane dashboard.
