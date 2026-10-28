FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/root \
    CHROMA_DB_PATH=/app/chroma_db \
    KNOWLEDGE_BASE_PATH=/app/knowledge_base

WORKDIR /app
COPY req.txt .
RUN pip install --upgrade pip && pip install -r req.txt
COPY . .

# Build and verify the Chroma vector index into /app/chroma_db during image build
RUN python scripts/build_vector_db.py

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
