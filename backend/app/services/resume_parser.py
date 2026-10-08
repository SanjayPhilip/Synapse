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

    phone_match = re.search(r'(?:\+?\d{1,3}[\s-]?)?(?:\(\d+\)[\s-]?)?\d[\d\s-]{7,12}\d', raw_text)
    if phone_match:
        data["contact"]["phone"] = phone_match.group().strip()

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
        (i for i, l in enumerate(lines) if re.match(r'^(technical\s+)?skills?\b', l, re.I)),
        -1,
    )
    if skills_idx >= 0:
        skills_line = re.sub(r'^(technical\s+)?skills?[:\s]*', '', lines[skills_idx], flags=re.I)
        all_skills = [skills_line]
        for j in range(skills_idx + 1, min(skills_idx + 6, len(lines))):
            nxt = lines[j]
            if re.match(r'^(experience|education|certifications?|projects?|summary)\b', nxt, re.I) or re.search(r'\b\d{4}\b', nxt):
                break
            all_skills.append(nxt)
        split = re.split(r'[,;|•·]\s*|\s{2,}', " ".join(all_skills))
        data["skills"] = list({s.strip() for s in split if 1 < len(s.strip()) < 40})

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

    exp_header_re = re.compile(
        r'^(?:(?:work|professional|employment|internship|internships|relevant)\s+)?(?:experience|history|employment)\b|'
        r'^(?:internships?|work\s+history)\b',
        re.I
    )
    sec_stop_re = re.compile(r'^(education|certifications?|projects?|skills?|publications?|awards?)\b', re.I)
    date_range_re = re.compile(
        r'(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4})\s*[\-–—to\s]+\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(\d{4}|present|current)',
        re.I
    )
    single_date_re = re.compile(r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})\b|\b(20\d\d|19\d\d)\b', re.I)

    exp_idx = next(
        (i for i, l in enumerate(lines) if exp_header_re.match(l)),
        -1,
    )
    if exp_idx >= 0:
        i = exp_idx + 1
        while i < len(lines) and not sec_stop_re.match(lines[i]):
            line = lines[i]
            if len(line) > 3:
                # Check for pipe or dash or job keywords
                if '|' in line or '–' in line or any(k in line.lower() for k in ['intern', 'engineer', 'developer', 'analyst', 'manager', 'lead', 'consultant', 'assistant', 'specialist']):
                    parts = [p.strip() for p in re.split(r'\s*\|\s*', line) if p.strip()]
                    title = parts[0] if parts else line
                    company = parts[1] if len(parts) > 1 else ''

                    start_date, end_date = '', ''
                    desc_lines = []
                    j = i + 1
                    while j < len(lines) and not sec_stop_re.match(lines[j]):
                        nxt = lines[j]
                        if nxt.startswith('(cid:') or nxt.startswith('•') or nxt.startswith('- ') or nxt.startswith('* '):
                            desc_lines.append(re.sub(r'^\(?cid:\d+\)?\s*|[•\-*]\s*', '', nxt))
                        else:
                            dm = date_range_re.search(nxt)
                            if dm:
                                start_date = dm.group(2)
                                end_date = dm.group(4)
                            else:
                                sm = single_date_re.search(nxt)
                                if sm and not start_date:
                                    start_date = sm.group(1) or sm.group(2)
                                elif any(k in nxt.lower() for k in ['intern', 'engineer', 'developer', 'analyst', 'manager', 'lead']) or '|' in nxt:
                                    break
                                else:
                                    desc_lines.append(nxt)
                        j += 1

                    data["experience"].append({
                        "company": company,
                        "title": title,
                        "start_date": start_date,
                        "end_date": end_date,
                        "description": " ".join(desc_lines)[:300],
                    })
                    i = j
                    continue
                else:
                    date_match = re.search(r'(\d{4})\s*[-–]\s*(\d{4}|present|current)', line, re.I)
                    if date_match:
                        desc_lines = []
                        for dl in lines[i + 1: i + 4]:
                            if sec_stop_re.match(dl):
                                break
                            desc_lines.append(dl)
                        data["experience"].append({
                            "company": "",
                            "title": re.sub(r'\d{4}.*$', '', line).strip() or "Position",
                            "start_date": date_match.group(1),
                            "end_date": date_match.group(2) or "",
                            "description": " ".join(desc_lines)[:300],
                        })
                        i += 4
                        continue
                    if not data["experience"] or data["experience"][-1].get("company"):
                        data["experience"].append({"company": line, "title": "", "description": "", "start_date": "", "end_date": ""})
                    else:
                        data["experience"][-1]["company"] = line
            i += 1


    edu_idx = next(
        (i for i, l in enumerate(lines) if re.match(r'^education\b', l, re.I)),
        -1,
    )
    if edu_idx >= 0:
        i = edu_idx + 1
        while i < len(lines) and not re.match(r'^(experience|certifications?|projects?|skills?)\b', lines[i], re.I) and i < edu_idx + 10:
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

    cert_idx = next(
        (i for i, l in enumerate(lines) if re.match(r'^certifications?\b', l, re.I)),
        -1,
    )
    if cert_idx >= 0:
        i = cert_idx + 1
        while i < len(lines) and not re.match(r'^(education|experience|skills?|projects?)\b', lines[i], re.I) and i < cert_idx + 10:
            if len(lines[i]) > 2:
                data["certifications"].append(lines[i])
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
            'PostgreSQL', 'MongoDB', 'Redis', 'FastAPI', 'Django', 'Flask', 'React Native',
            'Next.js', 'Vue', 'Angular', 'Tailwind', 'Machine Learning', 'TensorFlow',
            'PyTorch', 'Pandas', 'NumPy', 'CI/CD', 'Terraform', 'Linux', 'Go', 'Rust',
        ]
        for kw in tech_keywords:
            if re.search(rf'\b{re.escape(kw)}\b', desc, re.I):
                skills.add(kw)
    return [_normalize_skill(s) for s in skills]


SKILL_SYNONYMS = {
    "nodejs": "Node.js", "node.js": "Node.js", "node": "Node.js",
    "js": "JavaScript", "javascript": "JavaScript", "es6": "JavaScript",
    "ts": "TypeScript", "typescript": "TypeScript",
    "reactjs": "React", "react.js": "React",
    "py": "Python", "python3": "Python",
    "postgres": "PostgreSQL", "postgresql": "PostgreSQL",
    "mongodb": "MongoDB", "mongo": "MongoDB",
    "golang": "Go", "go lang": "Go",
    "rustlang": "Rust",
    "ml": "Machine Learning", "machinelearning": "Machine Learning",
    "tf": "TensorFlow", "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "ci/cd": "CI/CD", "cicd": "CI/CD",
    "docker": "Docker", "dockerize": "Docker",
    "kubernetes": "Kubernetes", "k8s": "Kubernetes",
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "GCP", "google cloud": "GCP",
    "azure": "Azure",
    "git": "Git", "github": "Git", "gitlab": "Git",
}


def _normalize_skill(skill: str) -> str:
    key = skill.strip().lower()
    return SKILL_SYNONYMS.get(key, skill.strip())


def parse_linkedin_profile_text(raw_text: str) -> dict:
    """
    Parses LinkedIn text export / copied profile sections:
    - Contact (Name, Headline, Email, LinkedIn URL, Location)
    - Summary / About
    - Experience (Positions, Company, Dates, Location, Responsibilities)
    - Education (School, Degree, Field of Study, Dates, Grade)
    - Skills & Endorsements (Skills + Endorsement counts)
    - Certifications & Licenses
    """
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    data = {
        "contact": {},
        "summary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "certifications": [],
        "endorsements": {},
    }

    # Email, phone, linkedin url
    email_match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', raw_text)
    if email_match:
        data["contact"]["email"] = email_match.group()

    phone_match = re.search(r'(?:\+?\d{1,3}[\s-]?)?(?:\(\d+\)[\s-]?)?\d[\d\s-]{7,12}\d', raw_text)
    if phone_match:
        data["contact"]["phone"] = phone_match.group().strip()

    li_match = re.search(r'linkedin\.com/(in/[\w-]+)', raw_text, re.I)
    if li_match:
        data["contact"]["linkedin"] = f"linkedin.com/{li_match.group(1)}"

    # Name extraction (LinkedIn typically has name on top line)
    for line in lines[:3]:
        if not re.search(r'(@|linkedin\.com|contact|experience|about)', line, re.I) and 2 < len(line) < 50:
            data["contact"]["name"] = line
            break

    # Extract sections
    current_section = None
    section_map = {
        "about": "summary",
        "summary": "summary",
        "experience": "experience",
        "work experience": "experience",
        "education": "education",
        "skills": "skills",
        "skills & endorsements": "skills",
        "top skills": "skills",
        "licenses & certifications": "certifications",
        "certifications": "certifications",
        "honors & awards": "certifications",
    }

    buffer_lines = []
    
    def flush_section(sec_name, sec_lines):
        if not sec_lines or not sec_name:
            return
        if sec_name == "summary":
            data["summary"] = "\n".join(sec_lines)[:600]
        elif sec_name == "skills":
            for sl in sec_lines:
                # Matches patterns like "Python · 15 endorsements" or "React (12)" or comma separated
                endorsed = re.search(r'([A-Za-z0-9#+.\s-]+?)(?:\s*[·•\(\[]\s*(\d+)\s*(?:endorsements?)?[\)\]]?|$)', sl)
                if endorsed:
                    skill_name = _normalize_skill(endorsed.group(1))
                    if 1 < len(skill_name) < 40 and not re.match(r'^(see\s+more|endorsements?|skills)$', skill_name, re.I):
                        if skill_name not in data["skills"]:
                            data["skills"].append(skill_name)
                        if endorsed.group(2):
                            data["endorsements"][skill_name] = int(endorsed.group(2))
                else:
                    for chunk in re.split(r'[,|•·]', sl):
                        sn = _normalize_skill(chunk.strip())
                        if 1 < len(sn) < 40 and sn not in data["skills"]:
                            data["skills"].append(sn)
        elif sec_name == "experience":
            # Parse LinkedIn position blocks
            idx = 0
            while idx < len(sec_lines):
                title_line = sec_lines[idx]
                idx += 1
                company_line = sec_lines[idx] if idx < len(sec_lines) else ""
                date_str = ""
                desc = []
                # Check for dates in next few lines
                while idx < len(sec_lines):
                    l = sec_lines[idx]
                    date_m = re.search(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*(\d{4})?\s*[-–]\s*(Present|\w+\s*\d{4}|\d{4})', l, re.I)
                    if date_m:
                        date_str = l
                        idx += 1
                        break
                    elif idx > 2:
                        break
                    idx += 1
                while idx < len(sec_lines):
                    l = sec_lines[idx]
                    # if looks like a new role or company, break
                    if re.match(r'^(full-time|part-time|contract|internship)', l, re.I):
                        idx += 1
                        continue
                    if len(l) > 10 and not re.search(r'(\d{4}\s*[-–])', l):
                        desc.append(l)
                    idx += 1
                data["experience"].append({
                    "title": title_line,
                    "company": company_line,
                    "dates": date_str,
                    "description": " ".join(desc)[:400]
                })
        elif sec_name == "education":
            for el in sec_lines:
                deg_match = re.search(r'(bachelor|master|b\.?s|m\.?s|b\.?tech|ph\.?d|degree|diploma)', el, re.I)
                if deg_match or len(data["education"]) == 0 or "institution" not in data["education"][-1]:
                    data["education"].append({
                        "institution": el,
                        "degree": deg_match.group() if deg_match else ""
                    })
                elif len(data["education"]) > 0:
                    data["education"][-1]["degree"] = el
        elif sec_name == "certifications":
            for cl in sec_lines:
                if len(cl) > 3 and not re.match(r'^(issued|credential)', cl, re.I):
                    data["certifications"].append(cl)

    for line in lines:
        lower = line.lower().strip()
        matched_sec = None
        for key, val in section_map.items():
            if lower == key or lower.startswith(f"{key}:") or lower == f"{key} /":
                matched_sec = val
                break
        if matched_sec:
            if current_section:
                flush_section(current_section, buffer_lines)
            current_section = matched_sec
            buffer_lines = []
        else:
            if current_section:
                buffer_lines.append(line)

    if current_section and buffer_lines:
        flush_section(current_section, buffer_lines)

    # Fallback to standard parser if not enough fields filled
    if not data["skills"] and not data["experience"]:
        return parse_resume_text(raw_text)
    return data

