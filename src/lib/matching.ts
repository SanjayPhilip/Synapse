import type { GapReport } from '@/types';

const STOP_WORDS = new Set([
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
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s+#.]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function extractKeywords(text: string): Set<string> {
  return new Set(tokenize(text));
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = dotProduct(a, b);
  const magA = Math.sqrt(dotProduct(a, a));
  const magB = Math.sqrt(dotProduct(b, b));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Lightweight semantic embedding using term-frequency vectors.
 * This approximates dense embeddings for in-browser scoring without a model server.
 */
function embed(text: string, vocabulary?: Map<string, number>): { vector: number[]; vocab: Map<string, number> } {
  const tokens = tokenize(text);
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  let vocab = vocabulary;
  if (!vocab) {
    vocab = new Map<string, number>();
    for (const key of freq.keys()) {
      if (!vocab.has(key)) vocab.set(key, vocab.size);
    }
  }

  const vector = new Array(vocab.size).fill(0);
  for (const [word, count] of freq.entries()) {
    const idx = vocab.get(word);
    if (idx !== undefined) vector[idx] = count;
  }

  return { vector, vocab };
}

export interface ScoreResult {
  overall_score: number;
  keyword_score: number;
  semantic_score: number;
  gap_report: GapReport;
}

export function computeMatchScore(
  resumeText: string,
  resumeSkills: string[],
  jobDescription: string,
  jobRequirements: string[]
): ScoreResult {
  const resumeTokens = extractKeywords(resumeText);
  const jobTokens = extractKeywords(jobDescription + ' ' + jobRequirements.join(' '));

  const keywordScore = jaccardSimilarity(resumeTokens, jobTokens) * 100;

  const resumeEmb = embed(resumeText);
  const jobEmb = embed(jobDescription + ' ' + jobRequirements.join(' '), resumeEmb.vocab);
  const semanticScore = cosineSimilarity(resumeEmb.vector, jobEmb.vector) * 100;

  const overall = keywordScore * 0.4 + semanticScore * 0.6;

  const resumeSkillsLower = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const jobReqsLower = jobRequirements.map((r) => r.toLowerCase());

  const missing_skills = jobReqsLower.filter((r) => {
    const rTokens = tokenize(r);
    return !rTokens.some((t) => resumeSkillsLower.has(t));
  });

  const matched_skills = jobReqsLower.filter((r) => {
    const rTokens = tokenize(r);
    return rTokens.some((t) => resumeSkillsLower.has(t));
  });

  const gap_report: GapReport = {
    missing_skills,
    matched_skills,
    experience_gaps: [],
    keyword_mismatches: [...resumeTokens].filter((t) => !jobTokens.has(t)).slice(0, 15),
    strengths: matched_skills,
  };

  return {
    overall_score: Math.round(overall * 100) / 100,
    keyword_score: Math.round(keywordScore * 100) / 100,
    semantic_score: Math.round(semanticScore * 100) / 100,
    gap_report,
  };
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  if (score >= 25) return 'text-orange-600';
  return 'text-red-600';
}

export function scoreBgColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  if (score >= 25) return 'bg-orange-500';
  return 'bg-red-500';
}

export function scoreLabel(score: number): string {
  if (score >= 75) return 'Excellent Match';
  if (score >= 50) return 'Good Match';
  if (score >= 25) return 'Partial Match';
  return 'Low Match';
}
