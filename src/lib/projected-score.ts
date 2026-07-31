import type { ResumeData, RewriteSuggestion } from '@/types';
import { computeMatchScore, type ScoreResult } from '@/lib/matching';

/**
 * Applies accepted/edited rewrite suggestions to resume data, producing a
 * "projected" resume that reflects the improvements. Used to compute the
 * before/after match score comparison.
 */
export function applySuggestionsToResume(
  baseData: ResumeData,
  baseRawText: string,
  baseSkills: string[],
  suggestions: RewriteSuggestion[]
): { data: ResumeData; rawText: string; skills: string[] } {
  const applied = suggestions.filter((s) => s.status === 'accepted' || s.status === 'edited');
  if (applied.length === 0) {
    return { data: baseData, rawText: baseRawText, skills: baseSkills };
  }

  const data: ResumeData = JSON.parse(JSON.stringify(baseData));
  let rawText = baseRawText;
  let skills = [...baseSkills];

  for (const sug of applied) {
    const newText = sug.user_edited_text || sug.suggested_text;

    if (sug.section_type === 'summary' && data.summary) {
      rawText = rawText.replace(sug.original_text, newText);
      data.summary = newText;
    } else if (sug.section_type === 'skills') {
      const suggestedSkills = newText.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
      skills = [...new Set([...skills, ...suggestedSkills])];
      data.skills = skills;
      rawText = rawText.replace(sug.original_text, newText);
    } else if (sug.section_type === 'experience' && data.experience) {
      const expIdx = data.experience.findIndex((e) => e.description === sug.original_text);
      if (expIdx >= 0) {
        data.experience[expIdx].description = newText;
        rawText = rawText.replace(sug.original_text, newText);
      } else {
        rawText = rawText.replace(sug.original_text, newText);
      }
    }
  }

  return { data, rawText, skills };
}

/**
 * Computes the projected match score after applying accepted/edited suggestions.
 */
export function computeProjectedScore(
  baseData: ResumeData,
  baseRawText: string,
  baseSkills: string[],
  suggestions: RewriteSuggestion[],
  jobDescription: string,
  jobRequirements: string[]
): ScoreResult {
  const { rawText, skills } = applySuggestionsToResume(baseData, baseRawText, baseSkills, suggestions);
  return computeMatchScore(rawText, skills, jobDescription, jobRequirements);
}
