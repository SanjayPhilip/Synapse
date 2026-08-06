"""Golden-output tests for the resume parser (fixtures -> expected structure/skills)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.resume_parser import parse_resume_text, extract_skills_from_data  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def _load(name: str) -> str:
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return f.read()


def test_parse_backend_resume_contact_and_sections():
    data = parse_resume_text(_load("resume_backend.txt"))
    assert data["contact"]["email"] == "alex.johnson@example.com"
    assert "linkedin.com/in/alexjohnson" in data["contact"].get("linkedin", "")
    assert len(data["experience"]) >= 2
    assert any("FastAPI" in e.get("description", "") for e in data["experience"])
    assert len(data["education"]) >= 1
    assert len(data["certifications"]) >= 1


def test_extract_skills_backend_golden():
    data = parse_resume_text(_load("resume_backend.txt"))
    skills = set(extract_skills_from_data(data))
    for expected in {"Python", "FastAPI", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Git"}:
        assert expected in skills, f"missing expected skill: {expected}"


def test_extract_skills_frontend_golden():
    data = parse_resume_text(_load("resume_frontend.txt"))
    skills = set(extract_skills_from_data(data))
    for expected in {"React", "TypeScript", "JavaScript", "Node.js", "Next.js", "GraphQL"}:
        assert expected in skills, f"missing expected skill: {expected}"


def test_skill_normalization_synonyms():
    from app.services.resume_parser import _normalize_skill
    assert _normalize_skill("nodejs") == "Node.js"
    assert _normalize_skill("postgres") == "PostgreSQL"
    assert _normalize_skill("golang") == "Go"
    assert _normalize_skill("k8s") == "Kubernetes"
    assert _normalize_skill("machinelearning") == "Machine Learning"
    assert _normalize_skill("Custom Skill") == "Custom Skill"
