import { describe, it, expect } from 'vitest';
import { generateGapSummary, generateSeekerGapSummary } from '@/lib/gap-summary';
import type { GapReport } from '@/types';

describe('gap-summary', () => {
  const baseGapReport: GapReport = {
    missing_skills: ['aws', 'kubernetes'],
    matched_skills: ['python', 'fastapi', 'react'],
    experience_gaps: [],
    keyword_mismatches: ['unrelated', 'irrelevant', 'extra1', 'extra2', 'extra3', 'extra4'],
    strengths: ['python', 'fastapi', 'react'],
  };

  describe('generateGapSummary (employer)', () => {
    it('returns Excellent candidate for score >= 75', () => {
      const result = generateGapSummary(baseGapReport, 80, 'Senior Developer');
      expect(result.headline).toContain('Excellent candidate');
      expect(result.headline).toContain('Senior Developer');
      expect(result.recommendation).toContain('Prioritize for interview');
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('returns Good candidate for score >= 50', () => {
      const result = generateGapSummary(baseGapReport, 60, 'Senior Developer');
      expect(result.headline).toContain('Good candidate');
      expect(result.headline).toContain('gaps');
      expect(result.recommendation).toContain('Worth interviewing');
    });

    it('returns Partial match for score >= 25', () => {
      const result = generateGapSummary(baseGapReport, 35, 'Senior Developer');
      expect(result.headline).toContain('Partial match');
      expect(result.recommendation).toContain('Consider only if');
    });

    it('returns Low match for score < 25', () => {
      const result = generateGapSummary(baseGapReport, 15, 'Senior Developer');
      expect(result.headline).toContain('Low match');
      expect(result.recommendation).toContain('not a fit');
    });

    it('includes matched skills in strengths', () => {
      const result = generateGapSummary(baseGapReport, 80);
      expect(result.strengths.some(s => s.includes('3 key requirement'))).toBe(true);
      expect(result.strengths.some(s => s.includes('python'))).toBe(true);
    });

    it('includes missing skills in concerns', () => {
      const result = generateGapSummary(baseGapReport, 60);
      expect(result.concerns.some(c => c.includes('2 requirement'))).toBe(true);
      expect(result.concerns.some(c => c.includes('aws'))).toBe(true);
    });

    it('includes keyword mismatch concern when > 5', () => {
      const result = generateGapSummary(baseGapReport, 60);
      expect(result.concerns.some(c => c.includes('scope misalignment'))).toBe(true);
    });

    it('does not include mismatch concern when <= 5', () => {
      const report: GapReport = {
        ...baseGapReport,
        keyword_mismatches: ['extra1', 'extra2'],
      };
      const result = generateGapSummary(report, 60);
      expect(result.concerns.some(c => c.includes('scope misalignment'))).toBe(false);
    });

    it('includes experience strength when available', () => {
      const resumeData = {
        experience: [{}, {}],
      } as any;
      const result = generateGapSummary(baseGapReport, 60, undefined, resumeData);
      expect(result.strengths.some(s => s.includes('2+ roles'))).toBe(true);
    });

    it('handles no matched skills', () => {
      const report: GapReport = {
        ...baseGapReport,
        matched_skills: [],
        strengths: [],
      };
      const result = generateGapSummary(report, 20);
      expect(result.concerns.some(c => c.includes('No direct skill matches'))).toBe(true);
    });

    it('works without job title', () => {
      const result = generateGapSummary(baseGapReport, 80);
      expect(result.headline).not.toContain('for "');
    });
  });

  describe('generateSeekerGapSummary', () => {
    it('returns Strong match for score >= 75', () => {
      const result = generateSeekerGapSummary(baseGapReport, 80, 'Senior Developer');
      expect(result.headline).toContain('Strong match');
      expect(result.headline).toContain('Senior Developer');
      expect(result.recommendation).toContain('Apply with confidence');
    });

    it('returns Decent match for score >= 50', () => {
      const result = generateSeekerGapSummary(baseGapReport, 60);
      expect(result.headline).toContain('Decent match');
      expect(result.recommendation).toContain('rewrite suggestions below');
    });

    it('returns Partial match for score >= 25', () => {
      const result = generateSeekerGapSummary(baseGapReport, 35);
      expect(result.headline).toContain('Partial match');
      expect(result.recommendation).toContain('align your resume with this job');
    });

    it('returns Low match for score < 25', () => {
      const result = generateSeekerGapSummary(baseGapReport, 15);
      expect(result.headline).toContain('Low match');
      expect(result.recommendation).toContain('roles that better match');
    });

    it('shows matched skills in strengths', () => {
      const result = generateSeekerGapSummary(baseGapReport, 60);
      expect(result.strengths.some(s => s.includes('match 3 key requirement'))).toBe(true);
    });

    it('shows missing skills in concerns', () => {
      const result = generateSeekerGapSummary(baseGapReport, 60);
      expect(result.concerns.some(c => c.includes('2 requirement'))).toBe(true);
      expect(result.concerns.some(c => c.includes('aws'))).toBe(true);
    });

    it('shows mismatch concern when > 5', () => {
      const result = generateSeekerGapSummary(baseGapReport, 60);
      expect(result.concerns.some(c => c.includes('irrelevant keywords'))).toBe(true);
    });

    it('does not show mismatch concern when <= 5', () => {
      const report: GapReport = {
        ...baseGapReport,
        keyword_mismatches: ['extra1', 'extra2'],
      };
      const result = generateSeekerGapSummary(report, 60);
      expect(result.concerns.some(c => c.includes('irrelevant keywords'))).toBe(false);
    });

    it('works without job title', () => {
      const result = generateSeekerGapSummary(baseGapReport, 80);
      expect(result.headline).not.toContain('for "');
    });
  });
});