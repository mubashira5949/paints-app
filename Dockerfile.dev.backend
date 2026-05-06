# Dockerfile.backend
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Download RDS SSL certificates bundle
RUN apk add --no-cache curl
RUN curl -o global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Build TypeScript
RUN npm run build

# Expose backend port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
