# Stage 1: Build PWA frontend application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package dependency manifests
COPY package*.json ./

# Install dependencies deterministically
RUN npm ci

# Copy full frontend source code
COPY . .

# Build production bundle with TypeScript check
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with reverse proxy and security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
