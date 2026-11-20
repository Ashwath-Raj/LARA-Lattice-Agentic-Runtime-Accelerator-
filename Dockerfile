# Stage 1: Build the React 19 Frontend from source
FROM node:22-alpine AS frontend-builder
WORKDIR /build

# Copy frontend configuration and locked dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and configuration
COPY frontend/ ./frontend/

# Run frontend type-check, tests, and build (outputs to backend/app/static)
RUN cd frontend && npm test -- --run && npm run build

# Stage 2: Hardened Python 3.12 runtime
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Run as non-root user for container security
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -d /app appuser

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY data/ ./data/

# Copy compiled static assets from frontend-builder into backend/app/static
COPY --from=frontend-builder /build/backend/app/static/ ./backend/app/static/

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
