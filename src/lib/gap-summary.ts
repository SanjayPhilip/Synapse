import type { GapReport, ResumeData, JobPosting } from '@/types';

export interface GapSummary {
  headline: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

export function generateGapSummary(
  gapReport: GapReport,
  score: number,
  jobTitle?: string,
  resumeData?: ResumeData
): GapSummary {
  const strengths: string[] = [];
  const concerns: string[] = [];

  const matched = gapReport.matched_skills || [];
  const missing = gapReport.missing_skills || [];
  const mismatches = gapReport.keyword_mismatches || [];

  if (matched.length > 0) {
    strengths.push(
      `Strong alignment on ${matched.length} key requirement${matched.length > 1 ? 's' : ''}: ${matched.slice(0, 4).join(', ')}${matched.length > 4 ? ', and more' : ''}.`
    );
  } else {
    concerns.push('No direct skill matches found against the job requirements.');
  }

  if (missing.length > 0) {
    concerns.push(
      `${missing.length} requirement${missing.length > 1 ? 's' : ''} not evidenced: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', and more' : ''}.`
    );
  }

  if (mismatches.length > 5) {
    concerns.push(
      `Resume contains ${mismatches.length} keywords not referenced in the job description, suggesting potential scope misalignment.`
    );
  }

  if (resumeData?.experience && resumeData.experience.length > 0) {
    const totalYears = resumeData.experience.length;
    strengths.push(`Demonstrates ${totalYears}+ role${totalYears > 1 ? 's' : ''} of relevant work experience.`);
  }

  let headline: string;
  let recommendation: string;
  const jobRef = jobTitle ? ` for "${jobTitle}"` : '';

  if (score >= 75) {
    headline = `Excellent candidate${jobRef}. This profile strongly matches the role requirements.`;
    recommendation = 'Prioritize for interview. Focus validation on depth of experience in matched skill areas.';
  } else if (score >= 50) {
    headline = `Good candidate with some gaps${jobRef}. Matches on core requirements but has notable missing areas.`;
    recommendation = 'Worth interviewing. Probe missing skills during the interview to assess transferable knowledge.';
  } else if (score >= 25) {
    headline = `Partial match${jobRef}. Significant gaps exist between this profile and the role requirements.`;
    recommendation = 'Consider only if the candidate pool is thin or if missing skills can be learned on the job.';
  } else {
    headline = `Low match${jobRef}. This profile does not align well with the role requirements.`;
    recommendation = 'Likely not a fit for this role. Consider for other positions that better match their skill set.';
  }

  return { headline, strengths, concerns, recommendation };
}

export function generateSeekerGapSummary(
  gapReport: GapReport,
  score: number,
  jobTitle?: string
): GapSummary {
  const strengths: string[] = [];
  const concerns: string[] = [];

  const matched = gapReport.matched_skills || [];
  const missing = gapReport.missing_skills || [];
  const mismatches = gapReport.keyword_mismatches || [];

  if (matched.length > 0) {
    strengths.push(
      `You match ${matched.length} key requirement${matched.length > 1 ? 's' : ''} (${matched.slice(0, 3).join(', ')}${matched.length > 3 ? '...' : ''}).`
    );
  }

  if (missing.length > 0) {
    concerns.push(
      `${missing.length} requirement${missing.length > 1 ? 's' : ''} missing from your resume: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}. Add these if you have relevant experience.`
    );
  }

  if (mismatches.length > 5) {
    concerns.push(
      `Your resume mentions ${mismatches.length} terms not in the job description. Consider trimming irrelevant keywords to focus the narrative.`
    );
  }

  let headline: string;
  let recommendation: string;
  const jobRef = jobTitle ? ` for "${jobTitle}"` : '';

  if (score >= 75) {
    headline = `Strong match${jobRef}. Your resume aligns well with this role.`;
    recommendation = 'Apply with confidence. Use the rewrite suggestions to fine-tune for an even stronger application.';
  } else if (score >= 50) {
    headline = `Decent match${jobRef}, but there's room to improve.`;
    recommendation = 'Review the rewrite suggestions below to strengthen weak sections before applying.';
  } else if (score >= 25) {
    headline = `Partial match${jobRef}. Your resume needs significant tailoring.`;
    recommendation = 'Use the rewrite suggestions to align your resume with this job. Focus on adding missing keywords and strengthening experience descriptions.';
  } else {
    headline = `Low match${jobRef}. This role may not be the best fit for your current profile.`;
    recommendation = 'Consider looking for roles that better match your existing skills, or use the rewrite tool to refocus your resume.';
  }

  return { headline, strengths, concerns, recommendation };
}
