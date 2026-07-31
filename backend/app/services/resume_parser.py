import re
from typing import Optional


def parse_resume_text(raw_text: str) -> dict:
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    data = {
        "contact": {},
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": [],
    }

    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', raw_text)
    if email_match:
        data["contact"]["email"] = email_match.group()

    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}', raw_text)
    if phone_match:
        data["contact"]["phone"] = phone_match.group()

    linkedin_match = re.search(r'linkedin\.com/(in/[\w-]+)', raw_text, re.I)
    if linkedin_match:
        data["contact"]["linkedin"] = f"linkedin.com/{linkedin_match.group(1)}"

    website_match = re.search(r'(https?://[\w.-]+\.[a-z]{2,}[^\s]*)', raw_text, re.I)
    if website_match:
        data["contact"]["website"] = website_match.group()

    for line in lines[:5]:
        if (
            "@" not in line
            and not re.search(r'\d{3,}', line)
            and not re.match(r'^(resume|cv|curriculum)', line, re.I)
            and 3 < len(line) < 60
            and len(line.split()) <= 4
        ):
            data["contact"]["name"] = line
            break

    skills_idx = next(
        (i for i, l in enumerate(lines) if re.match(r'^(technical\s+)?skills?[:\s]', l, re.I)),
        -1,
    )
    if skills_idx >= 0:
        skills_line = re.sub(r'^(technical\s+)?skills?[:\s]*', '', lines[skills_idx], flags=re.I)
        after_lines = " ".join(lines[skills_idx + 1: skills_idx + 6])
        all_skills = re.split(r'[,;|•·]\s*|\s{2,}', skills_line + " " + after_lines)
        data["skills"] = list({s.strip() for s in all_skills if 1 < len(s.strip()) < 40})

    if not data["skills"]:
        tech_keywords = [
            'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'React', 'Angular', 'Vue',
            'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'SQL', 'PostgreSQL',
            'MySQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
            'Git', 'CI/CD', 'Jenkins', 'REST', 'GraphQL', 'HTML', 'CSS', 'Tailwind',
            'Machine Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
        ]
        data["skills"] = [
            kw for kw in tech_keywords
            if re.search(rf'\b{re.escape(kw)}\b', raw_text, re.I)
        ]

    exp_idx = next(
        (i for i, l in enumerate(lines) if re.match(r'^(work\s+)?experience[:\s]', l, re.I)),
        -1,
    )
    if exp_idx >= 0:
        i = exp_idx + 1
        while i < len(lines) and not re.match(r'^(education|certifications?|projects?|skills?)[:\s]', lines[i], re.I):
            line = lines[i]
            if len(line) > 3:
                date_match = re.search(r'(\d{4})\s*[-–]\s*(\d{4}|present|current)', line, re.I)
                if date_match:
                    data["experience"].append({
                        "title": re.sub(r'\d{4}.*$', '', line).strip() or "Position",
                        "start_date": date_match.group(1),
                        "end_date": date_match.group(2) or "",
                        "description": " ".join(lines[i + 1: i + 4])[:300],
                    })
                    i += 4
                    continue
                if not data["experience"] or data["experience"][-1].get("company"):
                    data["experience"].append({"company": line, "title": "", "description": ""})
                else:
                    data["experience"][-1]["company"] = line
            i += 1

    edu_idx = next(
        (i for i, l in enumerate(lines) if re.match(r'^education[:\s]', l, re.I)),
        -1,
    )
    if edu_idx >= 0:
        i = edu_idx + 1
        while i < len(lines) and not re.match(r'^(experience|certifications?|projects?|skills?)[:\s]', lines[i], re.I) and i < edu_idx + 10:
            line = lines[i]
            if len(line) > 3:
                degree_match = re.search(
                    r'(b\.?sc\.?|b\.?tech\.?|m\.?sc\.?|m\.?tech\.?|mba|ph\.?d|bachelor|master|diploma)',
                    line, re.I,
                )
                data["education"].append({
                    "institution": re.sub(
                        r'(b\.?sc\.?|b\.?tech\.?|m\.?sc\.?|m\.?tech\.?|mba|ph\.?d|bachelor|master|diploma).*$',
                        '', line, flags=re.I,
                    ).strip() or line,
                    "degree": degree_match.group() if degree_match else "",
                })
            i += 1

    for line in lines:
        if (
            len(line) > 50
            and "@" not in line
            and not re.match(r'^\+?\d', line)
            and not re.match(r'^(skills?|experience|education|certifications?)', line, re.I)
        ):
            data["summary"] = line[:500]
            break

    return data


def extract_skills_from_data(data: dict) -> list[str]:
    skills = set(data.get("skills", []))
    for exp in data.get("experience", []):
        desc = exp.get("description", "")
        tech_keywords = [
            'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
            'AWS', 'Docker', 'Kubernetes', 'Git', 'REST', 'GraphQL', 'HTML', 'CSS',
        ]
        for kw in tech_keywords:
            if re.search(rf'\b{kw}\b', desc, re.I):
                skills.add(kw)
    return list(skills)
