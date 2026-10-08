import type { ResumeData } from '@/types';

/**
 * Extracts plain text from a File (PDF or DOCX).
 * For PDF/DOCX we extract raw text via browser APIs; for .txt we read directly.
 * Full PDF/DOCX parsing in-browser requires heavy libs; we use a pragmatic approach:
 * read as text and let the pattern parser extract structure.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    // Use arrayBuffer + TextDecoder for better compatibility
    const buffer = await file.arrayBuffer();
    return new TextDecoder().decode(buffer);
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
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(\d+\)[\s-]?)?\d[\d\s-]{7,12}\d/);
  if (phoneMatch) data.contact!.phone = phoneMatch[0].trim();

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
  const skillsIdx = lines.findIndex((l) => /^(technical\s+)?skills?\b/i.test(l));
  if (skillsIdx >= 0) {
    const skillsLine = lines[skillsIdx].replace(/^(technical\s+)?skills?[:\s]*/i, '');
    const collected = [skillsLine];
    for (let j = skillsIdx + 1; j < Math.min(skillsIdx + 6, lines.length); j++) {
      const nxt = lines[j];
      if (/^(experience|education|certifications?|projects?|summary)\b/i.test(nxt) || /\b\d{4}\b/.test(nxt)) break;
      collected.push(nxt);
    }
    const allSkills = collected
      .join(' ')
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
  const expIdx = lines.findIndex((l) =>
    /^(?:(?:work|professional|employment|internship|internships|relevant)\s+)?(?:experience|history|employment)\b|^(?:internships?|work\s+history)\b/i.test(l)
  );
  if (expIdx >= 0) {
    let i = expIdx + 1;
    while (i < lines.length && !/^(education|certifications?|projects?|skills?|publications?|awards?)\b/i.test(lines[i])) {
      const line = lines[i];
      if (line.length > 3) {
        if (line.includes('|') || line.includes('–') || /(?:intern|engineer|developer|analyst|manager|lead|consultant)/i.test(line)) {
          const parts = line.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
          let title = parts[0] || line;
          let company = parts[1] || '';
          let startDate = '';
          let endDate = '';

          // Check if line contains inline date like (2020-2023) or 2020 - 2023
          const inlineDate = line.match(/\(?(\d{4})\s*[\-–—to\s]+\s*(\d{4}|present|current)\)?/i);
          if (inlineDate) {
            startDate = inlineDate[1];
            endDate = inlineDate[2];
            title = title.replace(/\(?\d{4}\s*[\-–—to\s]+\s*(?:\d{4}|present|current)\)?/i, '').trim();
          }

          // Check if format is 'Title at Company'
          if (!company && /\bat\b/i.test(title)) {
            const atParts = title.split(/\s+\bat\b\s+/i);
            title = atParts[0].trim();
            company = atParts[1]?.trim() || '';
          }

          const descLines: string[] = [];
          let j = i + 1;
          while (j < lines.length && !/^(education|certifications?|projects?|skills?|publications?|awards?)\b/i.test(lines[j])) {
            const nxt = lines[j];
            if (nxt.startsWith('(cid:') || nxt.startsWith('•') || nxt.startsWith('- ') || nxt.startsWith('* ')) {
              descLines.push(nxt.replace(/^\(?cid:\d+\)?\s*|[•\-*]\s*/g, ''));
            } else {
              const dm = nxt.match(/(?:[a-z]{3}\.?\s*)?(\d{4})\s*[\-–—to\s]+\s*(?:[a-z]{3}\.?\s*)?(\d{4}|present|current)/i);
              if (dm && !startDate) {
                startDate = dm[1];
                endDate = dm[2];
              } else if (/(?:intern|engineer|developer|analyst|manager|lead|consultant)/i.test(nxt) || nxt.includes('|')) {
                break;
              } else {
                descLines.push(nxt);
              }
            }
            j++;
          }
          data.experience!.push({
            company,
            title,
            start_date: startDate,
            end_date: endDate,
            description: descLines.join(' ').slice(0, 300),
          });
          i = j;
          continue;
        } else {
          const dateMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/i);
          if (dateMatch) {
            const descLines: string[] = [];
            for (const dl of lines.slice(i + 1, i + 4)) {
              if (/^(education|certifications?|projects?|skills?)\b/i.test(dl)) break;
              descLines.push(dl);
            }
            data.experience!.push({
              company: '',
              title: line.replace(/\d{4}.*$/, '').trim() || 'Position',
              start_date: dateMatch[1],
              end_date: dateMatch[2] || '',
              description: descLines.join(' ').slice(0, 300),
            });
            i += 4;
            continue;
          }
          if (!data.experience!.length || data.experience![data.experience!.length - 1].company) {
            data.experience!.push({ company: line, title: '', description: '', start_date: '', end_date: '' });
          } else {
            data.experience![data.experience!.length - 1].company = line;
          }
        }
      }
      i++;
    }
  }

  // Education section
  const eduIdx = lines.findIndex((l) => /^education\b/i.test(l));
  if (eduIdx >= 0) {
    let i = eduIdx + 1;
    while (i < lines.length && !/^(experience|certifications?|projects?|skills?)\b/i.test(lines[i]) && i < eduIdx + 10) {
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
