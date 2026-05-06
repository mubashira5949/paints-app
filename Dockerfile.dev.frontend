# Dockerfile.frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source
COPY frontend/ ./

# Accept API URL as an argument at build time
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Build Vite application
RUN npm run build

# Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Add basic SPA Nginx configuration natively inline
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
