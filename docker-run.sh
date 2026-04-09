#!/bin/bash

# Create a network for the containers to communicate
docker network create paints-network 2>/dev/null || true

# Run the backend
echo "Starting backend..."
docker run -d \
  --name paints-backend \
  --network paints-network \
  -p 3000:3000 \
  --env-file .env \
  paints-backend

# Run the frontend
echo "Starting frontend..."
docker run -d \
  --name paints-frontend \
  --network paints-network \
  -p 80:80 \
  -e VITE_API_URL=http://localhost:3000 \
  paints-frontend

echo "Services started!"
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost"
