# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production Runtime
FROM python:3.11-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /root/.local /home/appuser/.local

# Create non-root user appuser
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app /home/appuser

# Copy application source code into /app/api
COPY --chown=appuser:appuser . /app/api/

# Create symlink /app/app -> /app/api/app so uvicorn app.main:app works seamlessly
RUN ln -s /app/api/app /app/app

# Set environment and PATH
ENV PATH="/home/appuser/.local/bin:$PATH" \
    PYTHONPATH="/app:/app/api" \
    PYTHONUNBUFFERED=1

USER appuser

# Health check hitting /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

# Entrypoint running uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
