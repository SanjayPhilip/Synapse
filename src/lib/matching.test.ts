import { describe, it, expect } from 'vitest';
import {
  computeMatchScore,
  tokenize,
  jaccardSimilarity,
  cosineSimilarity,
  embed,
  scoreColor,
  scoreBgColor,
  scoreLabel,
} from '@/lib/matching';

describe('matching', () => {
  describe('tokenize', () => {
    it('splits text into lowercase tokens', () => {
      const tokens = tokenize('Python FastAPI Developer');
      expect(tokens).toEqual(['python', 'fastapi', 'developer']);
    });

    it('removes punctuation', () => {
      const tokens = tokenize('Python, FastAPI; React!');
      expect(tokens).toEqual(['python', 'fastapi', 'react']);
    });

    it('filters stop words', () => {
      const tokens = tokenize('the and or but in on at to for of with');
      expect(tokens).toEqual([]);
    });

    it('filters short tokens', () => {
      const tokens = tokenize('a i an be');
      expect(tokens).toEqual([]);
    });

    it('preserves technical terms', () => {
      const tokens = tokenize('C++ C# .NET Node.js');
      expect(tokens).toContain('c++');
      expect(tokens).toContain('c#');
      expect(tokens).toContain('.net');
      expect(tokens).toContain('node.js');
    });
  });

  describe('jaccardSimilarity', () => {
    it('returns 1 for identical sets', () => {
      const a = new Set(['python', 'react']);
      const b = new Set(['python', 'react']);
      expect(jaccardSimilarity(a, b)).toBe(1);
    });

    it('returns 0 for disjoint sets', () => {
      const a = new Set(['python']);
      const b = new Set(['java']);
      expect(jaccardSimilarity(a, b)).toBe(0);
    });

    it('returns partial for overlapping sets', () => {
      const a = new Set(['python', 'react', 'sql']);
      const b = new Set(['python', 'java', 'aws']);
      expect(jaccardSimilarity(a, b)).toBeCloseTo(1 / 5); // 1 intersection, 5 union
    });

    it('returns 0 for empty sets', () => {
      expect(jaccardSimilarity(new Set(), new Set(['python']))).toBe(0);
      expect(jaccardSimilarity(new Set(['python']), new Set())).toBe(0);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      expect(cosineSimilarity(a, b)).toBe(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0, 0];
      const b = [0, 1, 0];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('returns partial for similar vectors', () => {
      const a = [3, 0];
      const b = [4, 0];
      expect(cosineSimilarity(a, b)).toBe(1);
    });

    it('returns 0 for zero magnitude', () => {
      expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
      expect(cosineSimilarity([1, 1], [0, 0])).toBe(0);
    });
  });

  describe('embed', () => {
    it('creates vocabulary and vector', () => {
      const { vector, vocab } = embed('python fastapi python react');
      expect(vocab.size).toBe(3);
      expect(vocab.has('python')).toBe(true);
      expect(vocab.has('fastapi')).toBe(true);
      expect(vocab.has('react')).toBe(true);
      expect(vector[vocab.get('python')!]).toBe(2);
      expect(vector[vocab.get('fastapi')!]).toBe(1);
    });

    it('reuses provided vocabulary', () => {
      const vocab = new Map([['python', 0], ['fastapi', 1]]);
      const { vector, vocab: newVocab } = embed('python fastapi react', vocab);
      expect(newVocab).toBe(vocab);
      expect(vector.length).toBe(2);
    });
  });

  describe('computeMatchScore', () => {
    const resumeText = 'Python developer with FastAPI and React experience. Built microservices with PostgreSQL and Docker.';
    const resumeSkills = ['Python', 'FastAPI', 'React', 'PostgreSQL', 'Docker'];
    const jobDescription = 'We need a Python developer with FastAPI experience.';
    const jobRequirements = ['Python', 'FastAPI', 'React', 'AWS'];

    it('computes overall score between 0-100', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
    });

    it('computes keyword score between 0-100', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(result.keyword_score).toBeGreaterThanOrEqual(0);
      expect(result.keyword_score).toBeLessThanOrEqual(100);
    });

    it('computes semantic score between 0-100', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(result.semantic_score).toBeGreaterThanOrEqual(0);
      expect(result.semantic_score).toBeLessThanOrEqual(100);
    });

    it('identifies matched skills', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(result.gap_report.matched_skills).toContain('python');
      expect(result.gap_report.matched_skills).toContain('fastapi');
      expect(result.gap_report.matched_skills).toContain('react');
    });

    it('identifies missing skills', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(result.gap_report.missing_skills).toContain('aws');
    });

    it('includes keyword mismatches', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(Array.isArray(result.gap_report.keyword_mismatches)).toBe(true);
    });

    it('returns strengths as matched skills', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, jobRequirements);
      expect(result.gap_report.strengths).toEqual(result.gap_report.matched_skills);
    });

    it('handles empty resume skills', () => {
      const result = computeMatchScore(resumeText, [], jobDescription, jobRequirements);
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.gap_report.matched_skills).toHaveLength(0);
      expect(result.gap_report.missing_skills).toEqual(['python', 'fastapi', 'react', 'aws']);
    });

    it('handles empty job requirements', () => {
      const result = computeMatchScore(resumeText, resumeSkills, jobDescription, []);
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.gap_report.missing_skills).toHaveLength(0);
    });
  });

  describe('scoreColor', () => {
    it('returns emerald for >= 75', () => {
      expect(scoreColor(75)).toBe('text-emerald-600');
      expect(scoreColor(100)).toBe('text-emerald-600');
    });

    it('returns amber for >= 50', () => {
      expect(scoreColor(50)).toBe('text-amber-600');
      expect(scoreColor(74)).toBe('text-amber-600');
    });

    it('returns orange for >= 25', () => {
      expect(scoreColor(25)).toBe('text-orange-600');
      expect(scoreColor(49)).toBe('text-orange-600');
    });

    it('returns red for < 25', () => {
      expect(scoreColor(0)).toBe('text-red-600');
      expect(scoreColor(24)).toBe('text-red-600');
    });
  });

  describe('scoreBgColor', () => {
    it('returns emerald bg for >= 75', () => {
      expect(scoreBgColor(75)).toBe('bg-emerald-500');
    });

    it('returns amber bg for >= 50', () => {
      expect(scoreBgColor(50)).toBe('bg-amber-500');
    });

    it('returns orange bg for >= 25', () => {
      expect(scoreBgColor(25)).toBe('bg-orange-500');
    });

    it('returns red bg for < 25', () => {
      expect(scoreBgColor(0)).toBe('bg-red-500');
    });
  });

  describe('scoreLabel', () => {
    it('returns Excellent Match for >= 75', () => {
      expect(scoreLabel(75)).toBe('Excellent Match');
      expect(scoreLabel(100)).toBe('Excellent Match');
    });

    it('returns Good Match for >= 50', () => {
      expect(scoreLabel(50)).toBe('Good Match');
      expect(scoreLabel(74)).toBe('Good Match');
    });

    it('returns Partial Match for >= 25', () => {
      expect(scoreLabel(25)).toBe('Partial Match');
      expect(scoreLabel(49)).toBe('Partial Match');
    });

    it('returns Low Match for < 25', () => {
      expect(scoreLabel(0)).toBe('Low Match');
      expect(scoreLabel(24)).toBe('Low Match');
    });
  });
});