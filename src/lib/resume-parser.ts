import type { ResumeData } from '@/types';

/**
 * Extracts plain text from a File (PDF or DOCX).
 * For PDF/DOCX we extract raw text via browser APIs; for .txt we read directly.
 * Full PDF/DOCX parsing in-browser requires heavy libs; we use a pragmatic approach:
 * read as text and let the pattern parser extract structure.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }

  // For PDF/DOCX, attempt to read as text (works for simple files).
  // In production this would use pdfplumber/python-docx server-side.
  try {
    const text = await file.text();
    if (text && text.trim().length > 50) {
      return text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s{3,}/g, '\n').trim();
    }
  } catch {
    // fall through
  }

  return '';
}

/**
 * Pattern-based resume parser. Extracts structured data from raw resume text.
 * Uses regex patterns to identify contact info, skills, experience, education.
 */
export function parseResumeText(rawText: string): ResumeData {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const data: ResumeData = {
    contact: {},
    summary: '',
    skills: [],
    experience: [],
    education: [],
    certifications: [],
  };

  // Email
  const emailMatch = rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) data.contact!.email = emailMatch[0];

  // Phone
  const phoneMatch = rawText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  if (phoneMatch) data.contact!.phone = phoneMatch[0];

  // LinkedIn
  const linkedinMatch = rawText.match(/linkedin\.com\/(in\/[\w-]+)/i);
  if (linkedinMatch) data.contact!.linkedin = `linkedin.com/${linkedinMatch[1]}`;

  // Website
  const websiteMatch = rawText.match(/(https?:\/\/[\w.-]+\.[a-z]{2,}[^\s]*)/i);
  if (websiteMatch) data.contact!.website = websiteMatch[0];

  // Name — first non-empty line that's not an email/phone
  for (const line of lines.slice(0, 5)) {
    if (
      !line.includes('@') &&
      !line.match(/\d{3,}/) &&
      !line.match(/^(resume|cv|curriculum)/i) &&
      line.length > 3 &&
      line.length < 60 &&
      line.split(' ').length <= 4
    ) {
      data.contact!.name = line;
      break;
    }
  }

  // Skills section
  const skillsIdx = lines.findIndex((l) => /^(technical\s+)?skills?[:\s]/i.test(l));
  if (skillsIdx >= 0) {
    const skillsLine = lines[skillsIdx].replace(/^(technical\s+)?skills?[:\s]*/i, '');
    const afterLine = lines.slice(skillsIdx + 1).slice(0, 5).join(' ');
    const allSkills = (skillsLine + ' ' + afterLine)
      .split(/[,;|•·]\s*|\s{2,}/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 40);
    data.skills = [...new Set(allSkills)] as string[];
  }

  // If no skills section found, try to extract from common tech keywords
  if (!data.skills || data.skills.length === 0) {
    const techKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'React', 'Angular', 'Vue',
      'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'SQL', 'PostgreSQL',
      'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Git', 'CI/CD', 'Jenkins', 'REST', 'GraphQL', 'HTML', 'CSS', 'Tailwind',
      'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
      'Data Analysis', 'Tableau', 'Power BI', 'Excel', 'Leadership', 'Agile', 'Scrum',
      'Project Management', 'Communication', 'Teamwork', 'Problem Solving',
    ];
    const found = techKeywords.filter((kw) =>
      new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(rawText)
    );
    data.skills = found;
  }

  // Experience section
  const expIdx = lines.findIndex((l) => /^(work\s+)?experience[:\s]/i.test(l));
  if (expIdx >= 0) {
    let i = expIdx + 1;
    while (i < lines.length && !/^(education|certifications?|projects?|skills?)[:\s]/i.test(lines[i])) {
      const line = lines[i];
      if (line.length > 3) {
        const dateMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/i);
        if (dateMatch) {
          data.experience!.push({
            title: line.replace(/\d{4}.*$/, '').trim() || 'Position',
            start_date: dateMatch[1],
            end_date: dateMatch[2] || '',
            description: lines.slice(i + 1, i + 4).join(' ').slice(0, 300),
          });
          i += 4;
          continue;
        }
        if (!data.experience!.length || data.experience![data.experience!.length - 1].company) {
          data.experience!.push({ company: line, title: '', description: '' });
        } else {
          data.experience![data.experience!.length - 1].company = line;
        }
      }
      i++;
    }
  }

  // Education section
  const eduIdx = lines.findIndex((l) => /^education[:\s]/i.test(l));
  if (eduIdx >= 0) {
    let i = eduIdx + 1;
    while (i < lines.length && !/^(experience|certifications?|projects?|skills?)[:\s]/i.test(lines[i]) && i < eduIdx + 10) {
      const line = lines[i];
      if (line.length > 3) {
        const degreeMatch = line.match(/(b\.?sc\.?|b\.?tech\.?|m\.?sc\.?|m\.?tech\.?|mba|ph\.?d|bachelor|master|diploma)/i);
        data.education!.push({
          institution: line.replace(/(b\.?sc\.?|b\.?tech\.?|m\.?sc\.?|m\.?tech\.?|mba|ph\.?d|bachelor|master|diploma).*$/i, '').trim() || line,
          degree: degreeMatch ? degreeMatch[0] : '',
        });
      }
      i++;
    }
  }

  // Summary — first paragraph after name that's not contact info
  for (const line of lines) {
    if (
      line.length > 50 &&
      !line.includes('@') &&
      !line.match(/^\+?\d/) &&
      !line.match(/^(skills?|experience|education|certifications?)/i)
    ) {
      data.summary = line.slice(0, 500);
      break;
    }
  }

  return data;
}

export function extractSkillsFromData(data: ResumeData): string[] {
  const skills = new Set<string>(data.skills || []);
  if (data.experience) {
    for (const exp of data.experience) {
      if (exp.description) {
        const techKeywords = [
          'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
          'AWS', 'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL', 'HTML', 'CSS',
        ];
        for (const kw of techKeywords) {
          if (new RegExp(`\\b${kw}\\b`, 'i').test(exp.description)) skills.add(kw);
        }
      }
    }
  }
  return [...skills];
}
