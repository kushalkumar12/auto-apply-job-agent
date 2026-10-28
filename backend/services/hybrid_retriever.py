"""
Hybrid Retrieval Engine for Skill2Role RAG System.
Combines SQLite FTS5 BM25 lexical keyword matching with NumPy vectorized cosine similarity
via Reciprocal Rank Fusion (RRF, k=60), with strict candidate profile isolation.
"""

import re
import numpy as np
from typing import List, Dict, Any, Optional

try:
    from ..database import get_db
    from .embedding_service import (
        generate_embeddings, generate_embeddings_with_meta,
        unpack_vector_blob, EMBEDDING_DIM
    )
except (ImportError, ValueError):
    from database import get_db
    from services.embedding_service import (
        generate_embeddings, generate_embeddings_with_meta,
        unpack_vector_blob, EMBEDDING_DIM
    )

RRF_K = 60

def sanitize_fts_query(query: str) -> str:
    """
    Cleans raw query text into safe FTS5 query tokens.
    Removes syntax characters that could cause FTS5 parse errors.
    """
    tokens = re.findall(r"[a-zA-Z0-9_#\+\.\-]+", query)
    safe_tokens = [f'"{t}"' for t in tokens if len(t) >= 2]
    if not safe_tokens:
        return '""'
    return " OR ".join(safe_tokens[:15])

def retrieve_lexical_chunks(query: str, profile_id: str = "default", limit: int = 20) -> List[Dict[str, Any]]:
    """
    Executes BM25-ranked full-text search across candidate's indexed chunks.
    """
    safe_q = sanitize_fts_query(query)
    if safe_q == '""':
        return []

    with get_db() as conn:
        cur = conn.cursor()
        sql = """
            SELECT chunk_id, section_type, section_title, chunk_text, rank
            FROM document_chunks_fts
            WHERE document_chunks_fts MATCH ? AND profile_id = ?
            ORDER BY rank
            LIMIT ?
        """
        rows = cur.execute(sql, (safe_q, profile_id, limit)).fetchall()
        return [dict(r) for r in rows]

def retrieve_vector_chunks(query: str, profile_id: str = "default", limit: int = 20) -> List[Dict[str, Any]]:
    """
    Executes cosine similarity search over packed float32 BLOB vectors.
    Strictly verifies that query embedding model and dimension match stored vectors.
    """
    q_vecs, query_model, query_dim = generate_embeddings_with_meta([query])
    q_vec = q_vecs[0]
    norm_q = np.linalg.norm(q_vec)
    if norm_q < 1e-6:
        return []

    with get_db() as conn:
        cur = conn.cursor()
        sql = """
            SELECT e.chunk_id, e.embedding, e.embedding_model, e.vector_dimension, c.section_type, c.section_title, c.chunk_text
            FROM chunk_embeddings e
            JOIN document_chunks c ON e.chunk_id = c.id
            WHERE e.profile_id = ?
        """
        rows = cur.execute(sql, (profile_id,)).fetchall()

    if not rows:
        return []

    # Model and Dimension Incompatibility Guard:
    # Never compare embeddings from different models or dimensions
    compatible_rows = [
        r for r in rows
        if r["vector_dimension"] == query_dim and r["embedding_model"] == query_model
    ]

    if not compatible_rows:
        stored_models = list(set(r["embedding_model"] for r in rows))
        print(
            f"[Hybrid Retriever] Model/dimension mismatch for profile '{profile_id}': "
            f"query model='{query_model}' ({query_dim}-dim) vs stored models={stored_models}. "
            f"Safe fallback: skipping vector search and falling back to FTS5-only retrieval."
        )
        return []

    chunk_ids = []
    metadata = []
    blobs = []

    for r in compatible_rows:
        chunk_ids.append(r["chunk_id"])
        blobs.append(r["embedding"])
        metadata.append({
            "chunk_id": r["chunk_id"],
            "section_type": r["section_type"],
            "section_title": r["section_title"],
            "chunk_text": r["chunk_text"]
        })

    # Unpack all into (N, dim) matrix
    doc_matrix = np.frombuffer(b"".join(blobs), dtype=np.float32).reshape(len(blobs), query_dim)
    norm_docs = np.linalg.norm(doc_matrix, axis=1)
    
    similarities = np.dot(doc_matrix, q_vec) / (norm_docs * norm_q + 1e-10)
    top_indices = np.argsort(similarities)[::-1][:limit]

    results = []
    for idx in top_indices:
        item = dict(metadata[idx])
        item["cosine_score"] = float(similarities[idx])
        results.append(item)

    return results

def hybrid_retrieve(query: str, profile_id: str = "default", top_k: int = 8) -> List[Dict[str, Any]]:
    """
    Merges lexical and semantic search results using Reciprocal Rank Fusion (RRF).
    Attaches associated career facts for grounding.
    """
    lexical_results = retrieve_lexical_chunks(query, profile_id=profile_id, limit=20)
    vector_results = retrieve_vector_chunks(query, profile_id=profile_id, limit=20)

    # Calculate RRF Scores
    rrf_scores: Dict[str, float] = {}
    chunk_data: Dict[str, Dict[str, Any]] = {}

    for rank, item in enumerate(lexical_results, start=1):
        cid = item["chunk_id"]
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (RRF_K + rank))
        chunk_data[cid] = item

    for rank, item in enumerate(vector_results, start=1):
        cid = item["chunk_id"]
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (RRF_K + rank))
        if cid not in chunk_data:
            chunk_data[cid] = item

    sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

    # Fetch relevant career facts linked to these chunks
    final_results = []
    with get_db() as conn:
        cur = conn.cursor()
        for cid, rrf_score in sorted_chunks:
            item = dict(chunk_data[cid])
            item["rrf_score"] = round(rrf_score, 6)
            
            # Retrieve associated facts filtered by section context or skills
            sec_type = item.get("section_type", "")
            sec_title = item.get("section_title", "")
            
            facts = cur.execute("""
                SELECT id, fact_type, fact_text, normalized_value, source_section
                FROM career_facts
                WHERE profile_id = ? AND (
                    source_section LIKE ? OR
                    source_section LIKE ? OR
                    fact_type = 'skill'
                )
                ORDER BY created_at DESC LIMIT 6
            """, (profile_id, f"%{sec_title}%", f"%{sec_type}%")).fetchall()
            
            item["associated_facts"] = [dict(f) for f in facts]
            final_results.append(item)

    return final_results
