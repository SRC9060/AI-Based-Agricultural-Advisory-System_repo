FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/root \
    CHROMA_DB_PATH=/app/chroma_db \
    KNOWLEDGE_BASE_PATH=/app/knowledge_base

WORKDIR /app

# 1. Install dependencies first (rebuilt only when req.txt changes)
COPY req.txt .
RUN pip install --upgrade pip && pip install -r req.txt

# 2. Copy only knowledge-base assets and indexing logic
# This layer and the build layer below are cached by Docker/Render
# and will ONLY re-run when knowledge_base/, build_vector_db.py, or
# services/knowledge_base.py change.
COPY knowledge_base/ ./knowledge_base/
COPY scripts/build_vector_db.py ./scripts/build_vector_db.py
COPY services/knowledge_base.py ./services/knowledge_base.py

# 3. Build and verify the Chroma vector index into /app/chroma_db
RUN python scripts/build_vector_db.py

# 4. Copy the remaining application source code
# Application code updates (app.py, routers, models, tests, etc.)
# will NOT invalidate the pre-built vector database layer above.
COPY . .

# 5. Sanity check: confirm the bundled index remains verified and undisturbed
RUN python -c "from services.knowledge_base import validate_vector_database; ok, count, msg = validate_vector_database(); assert ok and count > 0, msg; print(f'[BUILD] Bundled Chroma index verified intact with {count} documents.')"

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
