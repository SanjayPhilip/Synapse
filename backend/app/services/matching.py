import re
import math
from collections import Counter
from typing import Optional
from sentence_transformers import SentenceTransformer
import numpy as np

_model: Optional[SentenceTransformer] = None

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


def semantic_similarity(text_a: str, text_b: str) -> float:
    model = get_model()
    emb = model.encode([text_a, text_b], convert_to_numpy=True)
    dot = np.dot(emb[0], emb[1])
    mag = np.linalg.norm(emb[0]) * np.linalg.norm(emb[1])
    if mag == 0:
        return 0.0
    return float(dot / mag)


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
