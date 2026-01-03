# AURA & ECHO - SIMPLIFIED PRODUCTION DOCKERFILE
# This single-stage approach ensures maximum reliability on Sliplane

FROM node:20-slim
WORKDIR /app

# 1. Install system dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 2. Install ALL dependencies
COPY package*.json ./
RUN npm install

# 3. Copy source and build frontend
COPY . .
RUN npm run build

# 4. Final Environment Setup
ENV PORT=4000
ENV NODE_ENV=production
EXPOSE 4000

# 5. Start the Sanctuary engine
# We use 'npm run server' which triggers 'tsx server.ts'
CMD ["npm", "run", "server"]
