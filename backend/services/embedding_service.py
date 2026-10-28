"""
Embedding Service for Skill2Role RAG System.
Generates 768-dimensional float32 vector embeddings using Gemini 'gemini-embedding-2'
via the official google-genai SDK, with deterministic offline fallback and BLOB packing.
"""

import os
import time
import hashlib
import numpy as np
from typing import List, Optional, Dict, Any

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

try:
    from ..database import get_db
except (ImportError, ValueError):
    from database import get_db

EMBEDDING_MODEL = "gemini-embedding-2"
FALLBACK_MODEL = "deterministic-local-v1"
EMBEDDING_DIM = 768

def get_gemini_api_key() -> Optional[str]:
    """Retrieves Gemini API key from settings_ai table or environment."""
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key:
        return env_key.strip()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            row = cur.execute("SELECT gemini_key FROM settings_ai WHERE id = 'default'").fetchone()
            if row and row["gemini_key"]:
                return row["gemini_key"].strip()
    except Exception:
        pass
    return None

def generate_deterministic_embedding(text: str, dim: int = EMBEDDING_DIM) -> np.ndarray:
    """
    Deterministic fallback embedding for offline operation or when no API key is set.
    Hashes n-grams into 768 buckets and normalizes to unit sphere.
    """
    vec = np.zeros(dim, dtype=np.float32)
    words = text.lower().split()
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
        bucket = h % dim
        sign = 1.0 if ((h >> 16) & 1) else -1.0
        vec[bucket] += sign
    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec /= norm
    return vec

def generate_embeddings_with_meta(texts: List[str]) -> tuple[List[np.ndarray], str, int]:
    """
    Generates 768-dim float32 embeddings for a batch of strings.
    Returns: (vectors, model_name, dimension)
    Uses Gemini API if key is present, otherwise falls back gracefully to deterministic-local-v1.
    """
    api_key = get_gemini_api_key()
    if api_key and GENAI_AVAILABLE:
        try:
            client = genai.Client(api_key=api_key)
            result_vectors = []
            # Batch in chunks of 20 to prevent rate limit spikes
            for i in range(0, len(texts), 20):
                batch = texts[i:i+20]
                res = client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=batch,
                    config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM)
                )
                for emb in res.embeddings:
                    v = np.array(emb.values, dtype=np.float32)
                    norm = np.linalg.norm(v)
                    if norm > 1e-6:
                        v /= norm
                    result_vectors.append(v)
            return result_vectors, EMBEDDING_MODEL, EMBEDDING_DIM
        except Exception as e:
            print(f"[Embedding Service] Gemini API call failed ({e}). Falling back to deterministic local embeddings.")

    # Graceful offline fallback
    fallback_vecs = [generate_deterministic_embedding(t, EMBEDDING_DIM) for t in texts]
    return fallback_vecs, FALLBACK_MODEL, EMBEDDING_DIM

def generate_embeddings(texts: List[str]) -> List[np.ndarray]:
    """
    Backward-compatible wrapper returning only the vectors list.
    """
    vectors, _, _ = generate_embeddings_with_meta(texts)
    return vectors

def pack_vector_blob(vector: np.ndarray) -> bytes:
    """Serializes a 768 float32 array to 3072 raw IEEE 754 bytes."""
    return vector.astype(np.float32).tobytes()

def unpack_vector_blob(blob: bytes, dim: int = EMBEDDING_DIM) -> np.ndarray:
    """Deserializes raw IEEE 754 bytes into a float32 array."""
    return np.frombuffer(blob, dtype=np.float32).reshape(-1, dim)

def index_chunks(chunks: List[Dict[str, Any]], profile_id: str = "default") -> int:
    """
    Inserts chunks into document_chunks (triggering FTS5 sync)
    and computes + stores binary float32 BLOB vectors in chunk_embeddings
    with accurate model metadata.
    """
    if not chunks:
        return 0

    texts = [c["chunk_text"] for c in chunks]
    vectors, model_used, dim = generate_embeddings_with_meta(texts)
    now = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        for chunk, vec in zip(chunks, vectors):
            # 1. Insert into document_chunks (triggers automatically sync into document_chunks_fts)
            cur.execute("""
                INSERT OR REPLACE INTO document_chunks (id, document_id, profile_id, section_type, section_title, chunk_text, chunk_index, chunk_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                chunk["id"],
                chunk["document_id"],
                profile_id,
                chunk["section_type"],
                chunk["section_title"],
                chunk["chunk_text"],
                chunk["chunk_index"],
                chunk["chunk_hash"],
                now
            ))

            # 2. Insert into chunk_embeddings with actual model used
            blob = pack_vector_blob(vec)
            cur.execute("""
                INSERT OR REPLACE INTO chunk_embeddings (chunk_id, document_id, profile_id, embedding, embedding_model, vector_dimension, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                chunk["id"],
                chunk["document_id"],
                profile_id,
                blob,
                model_used,
                dim,
                now
            ))

    return len(chunks)

def reindex_all_chunks(profile_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Re-generates embeddings for all document_chunks matching profile_id (or all profiles).
    Safely handles model upgrades, updating embedding_model and vector_dimension metadata.
    """
    with get_db() as conn:
        cur = conn.cursor()
        query = "SELECT id, document_id, profile_id, chunk_text FROM document_chunks"
        params = ()
        if profile_id:
            query += " WHERE profile_id = ?"
            params = (profile_id,)
        rows = cur.execute(query, params).fetchall()

    if not rows:
        return {"reindexed": 0, "model": EMBEDDING_MODEL, "dimension": EMBEDDING_DIM}

    texts = [r["chunk_text"] for r in rows]
    vectors, model_used, dim = generate_embeddings_with_meta(texts)
    now = int(time.time() * 1000)

    with get_db() as conn:
        cur = conn.cursor()
        for row, vec in zip(rows, vectors):
            blob = pack_vector_blob(vec)
            cur.execute("""
                INSERT OR REPLACE INTO chunk_embeddings (
                    chunk_id, document_id, profile_id, embedding, embedding_model, vector_dimension, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                row["id"],
                row["document_id"],
                row["profile_id"],
                blob,
                model_used,
                dim,
                now
            ))

    return {"reindexed": len(rows), "model": model_used, "dimension": dim}
