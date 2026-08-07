# Multi-stage build: Frontend -> Backend
FROM node:20-alpine AS frontend-builder

ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source and build
COPY . .
RUN npm run build

# Backend stage
FROM python:3.12-slim AS backend

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers for auto-apply
RUN playwright install-deps chromium && playwright install chromium

# Copy backend source
COPY backend/ .

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/backend/static ./static

EXPOSE 8000

# Run migrations, seed, then start server
CMD ["sh", "-c", "python -m app.init_db && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]