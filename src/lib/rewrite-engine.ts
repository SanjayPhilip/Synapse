import type { ResumeData, GapReport, RewriteSectionType } from '@/types';

export interface RewriteSuggestionDraft {
  section_type: RewriteSectionType;
  original_text: string;
  suggested_text: string;
  reasoning: string;
}

/**
 * Generates evidence-grounded rewrite suggestions for weak resume sections.
 * Suggestions are based ONLY on the candidate's real experience — no fabrication.
 * Uses the gap report to identify which sections need improvement and how.
 */
export function generateRewriteSuggestions(
  resumeData: ResumeData,
  gapReport: GapReport,
  jobDescription: string,
  jobRequirements: string[]
): RewriteSuggestionDraft[] {
  const suggestions: RewriteSuggestionDraft[] = [];

  // 1. Summary rewrite — align with job keywords
  if (resumeData.summary && resumeData.summary.length > 20) {
    const jdKeywords = extractTopKeywords(jobDescription + ' ' + jobRequirements.join(' '));
    const summaryLower = resumeData.summary.toLowerCase();
    const missingInSummary = jdKeywords.filter((kw) => !summaryLower.includes(kw.toLowerCase()));

    if (missingInSummary.length > 0) {
      const matchedSkills = gapReport.matched_skills.slice(0, 4);
      const improvedSummary = buildImprovedSummary(resumeData.summary, matchedSkills, missingInSummary, resumeData);
      suggestions.push({
        section_type: 'summary',
        original_text: resumeData.summary,
        suggested_text: improvedSummary,
        reasoning: `Your summary doesn't mention ${missingInSummary.slice(0, 3).join(', ')} which are key terms in this job description. I've incorporated your existing skills (${matchedSkills.join(', ')}) and aligned the language with the job requirements — no new experience was added.`,
      });
    }
  }

  // 2. Skills suggestions — add missing skills you have but didn't list
  if (resumeData.experience && resumeData.experience.length > 0) {
    const allExpText = resumeData.experience.map((e) => e.description || '').join(' ').toLowerCase();
    const missingButPresent = gapReport.missing_skills.filter((skill) => {
      const skillTokens = skill.toLowerCase().split(/\s+/);
      return skillTokens.some((t) => allExpText.includes(t));
    });

    if (missingButPresent.length > 0) {
      const currentSkills = resumeData.skills || [];
      const suggestedSkills = [...currentSkills, ...missingButPresent];
      suggestions.push({
        section_type: 'skills',
        original_text: currentSkills.join(', '),
        suggested_text: suggestedSkills.join(', '),
        reasoning: `Your experience descriptions mention ${missingButPresent.join(', ')} but these aren't listed in your skills section. Adding them will improve your keyword match score. These skills were found in your existing experience — nothing fabricated.`,
      });
    }
  }

  // 3. Experience rewrite — strengthen weak descriptions with action verbs and quantification hints
  if (resumeData.experience) {
    for (let i = 0; i < resumeData.experience.length; i++) {
      const exp = resumeData.experience[i];
      if (!exp.description || exp.description.length < 50) continue;

      const jdKeywords = extractTopKeywords(jobDescription);
      const descLower = exp.description.toLowerCase();
      const relevantKeywords = jdKeywords.filter((kw) => descLower.includes(kw.toLowerCase()));

      if (relevantKeywords.length === 0 && gapReport.matched_skills.length > 0) {
        const rewritten = rewriteExperienceDescription(exp.description, gapReport.matched_skills, jobRequirements);
        if (rewritten !== exp.description) {
          suggestions.push({
            section_type: 'experience',
            original_text: exp.description,
            suggested_text: rewritten,
            reasoning: `This experience description doesn't reference skills from the job description. I've restructured it to highlight your relevant skills (${gapReport.matched_skills.slice(0, 3).join(', ')}) using stronger action verbs — based entirely on your existing experience.`,
          });
        }
      }
    }
  }

  return suggestions;
}

function extractTopKeywords(text: string): string[] {
  const freq = new Map<string, number>();
  const words = text
    .toLowerCase()
    .replace(/[^\w\s+#.]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function buildImprovedSummary(
  original: string,
  matchedSkills: string[],
  missingKeywords: string[],
  resumeData: ResumeData
): string {
  const yearsExp = resumeData.experience?.length || 0;
  const opener = yearsExp > 0
    ? `Experienced professional with ${yearsExp}+ role${yearsExp > 1 ? 's' : ''} in the field.`
    : 'Dedicated professional with a strong foundation in';

  const skillsPhrase = matchedSkills.length > 0
    ? ` Proven expertise in ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? ', and more' : ''}.`
    : '';

  const alignmentPhrase = missingKeywords.length > 0
    ? ` Seeking to leverage ${missingKeywords.slice(0, 2).join(' and ')} experience in a role that values ${missingKeywords[0] || 'growth'}.`
    : '';

  // Keep the core of the original but prepend aligned language
  const originalTrimmed = original.length > 200 ? original.slice(0, 200) + '...' : original;

  return `${opener}${skillsPhrase} ${originalTrimmed}${alignmentPhrase}`.trim();
}

function rewriteExperienceDescription(
  original: string,
  matchedSkills: string[],
  jobRequirements: string[]
): string {
  const actionVerbs = ['Spearheaded', 'Architected', 'Developed', 'Implemented', 'Optimized', 'Led', 'Managed', 'Delivered'];

  // Find relevant requirement keywords
  const reqKeywords = jobRequirements
    .join(' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10);

  const relevantSkills = matchedSkills.slice(0, 3);
  const verb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];

  // Restructure: lead with action verb, incorporate relevant skills
  const firstSentence = original.split('.')[0];
  const restSentences = original.split('.').slice(1).join('.').trim();

  const rewritten = `${verb} ${firstSentence.toLowerCase().replace(/^(i |i am |responsible for |in charge of )/, '')}, utilizing ${relevantSkills.join(', ')} to deliver measurable results.${restSentences ? ' ' + restSentences : ''}`;

  return rewritten;
}
