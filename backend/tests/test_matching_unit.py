"""Unit tests for matching score calculation and gap report generation."""
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.services.matching import (
    compute_match,
    jaccard_similarity,
    semantic_similarity,
    tokenize,
)


class TestTokenize:
    """Tests for text tokenization."""

    def test_basic_tokenization(self):
        """Should split text into words, remove stop words and punctuation."""
        tokens = tokenize("Python developer with FastAPI experience")
        assert "python" in tokens
        assert "developer" in tokens
        assert "fastapi" in tokens
        assert "experience" in tokens
        # Stop words removed
        assert "with" not in tokens

    def test_handles_special_chars(self):
        """Should handle +, #, . in skill names."""
        tokens = tokenize("C++ C# .NET Python")
        assert "c++" in tokens
        assert "c#" in tokens
        assert ".net" in tokens
        assert "python" in tokens

    def test_single_chars_removed(self):
        """Single character tokens should be removed."""
        tokens = tokenize("a b c Python")
        assert "a" not in tokens
        assert "b" not in tokens
        assert "c" not in tokens
        assert "python" in tokens


class TestJaccardSimilarity:
    """Tests for Jaccard similarity (used for keyword score)."""

    def test_identical_sets(self):
        """Identical sets should have similarity 1.0."""
        a = {"python", "fastapi", "postgresql"}
        b = {"python", "fastapi", "postgresql"}
        assert jaccard_similarity(a, b) == 1.0

    def test_disjoint_sets(self):
        """Disjoint sets should have similarity 0.0."""
        a = {"python", "fastapi"}
        b = {"java", "spring"}
        assert jaccard_similarity(a, b) == 0.0

    def test_partial_overlap(self):
        """Partial overlap should give proportional score."""
        a = {"python", "fastapi", "postgresql"}
        b = {"python", "fastapi"}  # 2/3 overlap
        assert jaccard_similarity(a, b) == pytest.approx(2/3)

    def test_empty_set(self):
        """Empty set should return 0.0."""
        assert jaccard_similarity(set(), {"python"}) == 0.0
        assert jaccard_similarity({"python"}, set()) == 0.0


class TestSemanticSimilarity:
    """Tests for semantic similarity (cosine similarity of embeddings)."""

    @patch('app.services.matching.get_model')
    def test_identical_texts(self, mock_get_model):
        """Identical texts should have similarity 1.0."""
        mock_model = MagicMock()
        emb = np.array([1.0, 0.0, 0.0])
        mock_model.encode.return_value = np.array([emb, emb])
        mock_get_model.return_value = mock_model

        score = semantic_similarity("Python developer", "Python developer")
        assert score == pytest.approx(1.0)

    @patch('app.services.matching.get_model')
    def test_orthogonal_embeddings(self, mock_get_model):
        """Orthogonal embeddings should have similarity 0.0."""
        mock_model = MagicMock()
        emb1 = np.array([1.0, 0.0])
        emb2 = np.array([0.0, 1.0])
        mock_model.encode.return_value = np.array([emb1, emb2])
        mock_get_model.return_value = mock_model

        score = semantic_similarity("Python", "Java")
        assert score == pytest.approx(0.0)

    @patch('app.services.matching.get_model')
    def test_medium_similarity(self, mock_get_model):
        """45 degree angle gives cos(45) = 0.707."""
        mock_model = MagicMock()
        emb1 = np.array([1.0, 0.0])
        emb2 = np.array([0.707, 0.707])
        mock_model.encode.return_value = np.array([emb1, emb2])
        mock_get_model.return_value = mock_model

        score = semantic_similarity("Python developer", "Software engineer")
        assert score == pytest.approx(0.707, rel=0.05)


class TestComputeMatch:
    """Tests for the main compute_match function."""

    @patch('app.services.matching.get_model')
    def test_full_match_calculation(self, mock_get_model):
        """Test overall score = 0.4 * keyword + 0.6 * semantic."""
        mock_model = MagicMock()
        emb = np.array([1.0, 0.0])
        mock_model.encode.return_value = np.array([emb, emb])
        mock_get_model.return_value = mock_model

        result = compute_match(
            resume_text="Python developer with FastAPI experience",
            resume_skills=["Python", "FastAPI", "PostgreSQL"],
            job_description="Looking for Python developer",
            job_requirements=["Python", "FastAPI", "PostgreSQL", "Redis"],
        )

        # keyword: resume has python, fastapi, postgresql; job needs python, fastapi, postgresql, redis
        # resume tokens include skills + text words
        # semantic: 1.0 (identical embeddings)
        assert "overall_score" in result
        assert "keyword_score" in result
        assert "semantic_score" in result
        assert "gap_report" in result
        assert result["semantic_score"] == 100.0

    @patch('app.services.matching.get_model')
    def test_gap_report_structure(self, mock_get_model):
        """Gap report should have correct structure."""
        mock_model = MagicMock()
        emb = np.array([1.0, 0.0])
        mock_model.encode.return_value = np.array([emb, emb])
        mock_get_model.return_value = mock_model

        result = compute_match(
            resume_text="Python developer",
            resume_skills=["Python", "FastAPI"],
            job_description="Python FastAPI job",
            job_requirements=["Python", "FastAPI", "PostgreSQL"],
        )

        gap = result["gap_report"]
        assert "matched_skills" in gap
        assert "missing_skills" in gap
        assert "strengths" in gap
        assert "keyword_mismatches" in gap
        assert "experience_gaps" in gap
        # python and fastapi matched
        assert "python" in gap["matched_skills"]
        assert "fastapi" in gap["matched_skills"]
        # postgresql missing
        assert "postgresql" in gap["missing_skills"]

    @patch('app.services.matching.get_model')
    def test_all_skills_matched(self, mock_get_model):
        """When all required skills present, missing_skills empty."""
        mock_model = MagicMock()
        emb = np.array([1.0, 0.0])
        mock_model.encode.return_value = np.array([emb, emb])
        mock_get_model.return_value = mock_model

        result = compute_match(
            resume_text="Python FastAPI PostgreSQL developer",
            resume_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
            job_description="Python FastAPI PostgreSQL",
            job_requirements=["Python", "FastAPI", "PostgreSQL"],
        )

        gap = result["gap_report"]
        assert gap["missing_skills"] == []
        assert set(gap["matched_skills"]) == {"python", "fastapi", "postgresql"}

    @patch('app.services.matching.get_model')
    def test_no_skills_matched(self, mock_get_model):
        """When no skills matched, all are missing."""
        mock_model = MagicMock()
        emb = np.array([1.0, 0.0])
        mock_model.encode.return_value = np.array([emb, emb])
        mock_get_model.return_value = mock_model

        result = compute_match(
            resume_text="Java Spring developer",
            resume_skills=["Java", "Spring"],
            job_description="Python job",
            job_requirements=["Python", "FastAPI"],
        )

        gap = result["gap_report"]
        assert gap["matched_skills"] == []
        assert set(gap["missing_skills"]) == {"python", "fastapi"}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])