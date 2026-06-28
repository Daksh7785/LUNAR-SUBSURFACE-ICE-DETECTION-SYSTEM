FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for GDAL/rasterio/psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Launch Celery worker
CMD ["celery", "-A", "celery_worker.app", "worker", "--loglevel=info"]
