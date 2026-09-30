import re
import math
import hashlib
from collections import Counter, OrderedDict
from typing import Optional
from uuid import UUID
from sentence_transformers import SentenceTransformer
import numpy as np

_model: Optional[SentenceTransformer] = None

# Bounded in-memory LRU cache for sentence embeddings
_EMBEDDING_CACHE: OrderedDict[str, np.ndarray] = OrderedDict()
MAX_EMBEDDING_CACHE_SIZE: int = 2000
_CACHE_HITS: int = 0
_CACHE_MISSES: int = 0


def _text_cache_key(text: str) -> str:
    """Generate deterministic hash key for caching embeddings."""
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def get_embedding_cache_stats() -> dict:
    """Return metrics on embedding cache hits, misses, and current size."""
    return {
        "hits": _CACHE_HITS,
        "misses": _CACHE_MISSES,
        "size": len(_EMBEDDING_CACHE),
        "max_size": MAX_EMBEDDING_CACHE_SIZE,
    }


def clear_embedding_cache() -> None:
    """Clear in-memory embedding cache and reset hit/miss counters."""
    global _CACHE_HITS, _CACHE_MISSES
    _EMBEDDING_CACHE.clear()
    _CACHE_HITS = 0
    _CACHE_MISSES = 0


def get_embedding(text: str) -> np.ndarray:
    """Get or compute embedding vector for a single text string."""
    global _CACHE_HITS, _CACHE_MISSES
    clean_text = text.strip() if text else ""
    if not clean_text:
        return np.zeros(384, dtype=np.float32)

    key = _text_cache_key(clean_text)
    if key in _EMBEDDING_CACHE:
        _CACHE_HITS += 1
        _EMBEDDING_CACHE.move_to_end(key)
        return _EMBEDDING_CACHE[key]

    _CACHE_MISSES += 1
    model = get_model()
    raw = model.encode([clean_text], convert_to_numpy=True)
    emb = np.asarray(raw)[0] if np.ndim(raw) > 1 else np.asarray(raw)
    _EMBEDDING_CACHE[key] = emb
    if len(_EMBEDDING_CACHE) > MAX_EMBEDDING_CACHE_SIZE:
        _EMBEDDING_CACHE.popitem(last=False)
    return emb


def semantic_similarity(text_a: str, text_b: str) -> float:
    global _CACHE_HITS, _CACHE_MISSES
    clean_a = text_a.strip() if text_a else ""
    clean_b = text_b.strip() if text_b else ""

    key_a = _text_cache_key(clean_a)
    key_b = _text_cache_key(clean_b)

    cached_a = _EMBEDDING_CACHE.get(key_a)
    cached_b = _EMBEDDING_CACHE.get(key_b)

    if cached_a is not None and cached_b is not None:
        _CACHE_HITS += 2
        _EMBEDDING_CACHE.move_to_end(key_a)
        _EMBEDDING_CACHE.move_to_end(key_b)
        emb_a, emb_b = cached_a, cached_b
    elif cached_a is not None and cached_b is None:
        _CACHE_HITS += 1
        _CACHE_MISSES += 1
        _EMBEDDING_CACHE.move_to_end(key_a)
        model = get_model()
        raw = model.encode([clean_b], convert_to_numpy=True)
        emb_b = np.asarray(raw)[0] if np.ndim(raw) > 1 else np.asarray(raw)
        _EMBEDDING_CACHE[key_b] = emb_b
        if len(_EMBEDDING_CACHE) > MAX_EMBEDDING_CACHE_SIZE:
            _EMBEDDING_CACHE.popitem(last=False)
        emb_a = cached_a
    elif cached_a is None and cached_b is not None:
        _CACHE_HITS += 1
        _CACHE_MISSES += 1
        _EMBEDDING_CACHE.move_to_end(key_b)
        model = get_model()
        raw = model.encode([clean_a], convert_to_numpy=True)
        emb_a = np.asarray(raw)[0] if np.ndim(raw) > 1 else np.asarray(raw)
        _EMBEDDING_CACHE[key_a] = emb_a
        if len(_EMBEDDING_CACHE) > MAX_EMBEDDING_CACHE_SIZE:
            _EMBEDDING_CACHE.popitem(last=False)
        emb_b = cached_b
    else:
        _CACHE_MISSES += 2
        model = get_model()
        raw = model.encode([clean_a, clean_b], convert_to_numpy=True)
        raw_arr = np.asarray(raw)
        if raw_arr.ndim > 1:
            emb_a, emb_b = raw_arr[0], raw_arr[1]
        else:
            emb_a, emb_b = raw_arr, raw_arr
        _EMBEDDING_CACHE[key_a] = emb_a
        _EMBEDDING_CACHE[key_b] = emb_b
        while len(_EMBEDDING_CACHE) > MAX_EMBEDDING_CACHE_SIZE:
            _EMBEDDING_CACHE.popitem(last=False)

    dot = np.dot(emb_a, emb_b)
    mag = np.linalg.norm(emb_a) * np.linalg.norm(emb_b)
    if mag == 0:
        return 0.0
    return float(dot / mag)

STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'some', 'any', 'no', 'not', 'as', 'if', 'then', 'than', 'also', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out',
    'off', 'over', 'under', 'again', 'further', 'once', 'here', 'there', 'your', 'our',
    'their', 'its', 'my', 'me', 'him', 'her', 'us', 'them', 'am', 'so', 'very', 'just',
    'more', 'most', 'other', 'such', 'only', 'own', 'same', 'too', 'now', 'will',
}


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def tokenize(text: str) -> list[str]:
    return [
        w for w in re.sub(r'[^\w\s+#.]', ' ', text.lower()).split()
        if len(w) > 1 and w not in STOP_WORDS
    ]


def jaccard_similarity(set_a: set[str], set_b: set[str]) -> float:
    if not set_a or not set_b:
        return 0.0
    return len(set_a & set_b) / len(set_a | set_b)




def compute_match(
    resume_text: str,
    resume_skills: list[str],
    job_description: str,
    job_requirements: list[str],
) -> dict:
    job_full = job_description + " " + " ".join(job_requirements)

    resume_tokens = set(tokenize(resume_text))
    job_tokens = set(tokenize(job_full))
    keyword_score = jaccard_similarity(resume_tokens, job_tokens) * 100

    semantic_score = semantic_similarity(resume_text, job_full) * 100

    overall = keyword_score * 0.4 + semantic_score * 0.6

    resume_skills_lower = {s.lower() for s in resume_skills}
    job_reqs_lower = [r.lower() for r in job_requirements]

    matched_skills = [
        r for r in job_reqs_lower
        if any(t in resume_skills_lower for t in tokenize(r))
    ]
    missing_skills = [
        r for r in job_reqs_lower if r not in matched_skills
    ]

    gap_report = {
        "missing_skills": missing_skills,
        "matched_skills": matched_skills,
        "experience_gaps": [],
        "keyword_mismatches": list(resume_tokens - job_tokens)[:15],
        "strengths": matched_skills,
    }

    return {
        "overall_score": round(overall, 2),
        "keyword_score": round(keyword_score, 2),
        "semantic_score": round(semantic_score, 2),
        "gap_report": gap_report,
    }


async def recompute_scores_for_resume(db, resume_id: UUID):
    from app.models import MatchScore, JobPosting, Resume
    from sqlalchemy import select

    resume_result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = resume_result.scalar_one_or_none()
    if not resume:
        return

    jobs_result = await db.execute(select(JobPosting).where(JobPosting.status == "active"))
    jobs = jobs_result.scalars().all()

    for job in jobs:
        scores = compute_match(
            resume.raw_text,
            resume.skills or [],
            job.description,
            job.requirements or [],
        )
        existing = await db.execute(
            select(MatchScore).where(
                MatchScore.resume_id == resume_id,
                MatchScore.job_posting_id == job.id,
                MatchScore.direction == "seeker",
            )
        )
        ms = existing.scalar_one_or_none()
        if ms:
            ms.overall_score = scores["overall_score"]
            ms.keyword_score = scores["keyword_score"]
            ms.semantic_score = scores["semantic_score"]
            ms.gap_report = scores["gap_report"]
        else:
            ms = MatchScore(
                resume_id=resume_id,
                job_posting_id=job.id,
                direction="seeker",
                overall_score=scores["overall_score"],
                keyword_score=scores["keyword_score"],
                semantic_score=scores["semantic_score"],
                gap_report=scores["gap_report"],
            )
            db.add(ms)
    await db.flush()


async def recompute_scores_for_job(db, job_id: UUID):
    from app.models import MatchScore, Resume, JobPosting, Application
    from sqlalchemy import select

    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        return

    apps_result = await db.execute(
        select(Application.resume_id).where(Application.job_posting_id == job_id, Application.resume_id.isnot(None))
    )
    resume_ids = [r[0] for r in apps_result.all()]
    if not resume_ids:
        return

    resumes_result = await db.execute(
        select(Resume).where(Resume.id.in_(resume_ids), Resume.is_current == True)
    )
    resumes = resumes_result.scalars().all()

    for resume in resumes:
        scores = compute_match(
            resume.raw_text,
            resume.skills or [],
            job.description,
            job.requirements or [],
        )
        existing = await db.execute(
            select(MatchScore).where(
                MatchScore.resume_id == resume.id,
                MatchScore.job_posting_id == job_id,
                MatchScore.direction == "seeker",
            )
        )
        ms = existing.scalar_one_or_none()
        if ms:
            ms.overall_score = scores["overall_score"]
            ms.keyword_score = scores["keyword_score"]
            ms.semantic_score = scores["semantic_score"]
            ms.gap_report = scores["gap_report"]
        else:
            ms = MatchScore(
                resume_id=resume.id,
                job_posting_id=job_id,
                direction="seeker",
                overall_score=scores["overall_score"],
                keyword_score=scores["keyword_score"],
                semantic_score=scores["semantic_score"],
                gap_report=scores["gap_report"],
            )
            db.add(ms)
    await db.flush()
