import httpx
import logging
from app.config import get_settings

settings = get_settings()

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"
CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
]

logger = logging.getLogger(__name__)


async def _gemini_generate(prompt: str, system_instruction: str = "") -> str:
    parts = []
    if system_instruction:
        parts.append({"text": system_instruction})
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 4096,
        },
    }

    async with httpx.AsyncClient(timeout=60) as client:
        last_error = None
        for model in CANDIDATE_MODELS:
            url = f"{GEMINI_BASE}/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        text_parts = candidates[0]["content"].get("parts", [])
                        if text_parts and "text" in text_parts[0]:
                            return text_parts[0]["text"]
                last_error = f"HTTP {resp.status_code}: {resp.text[:200]}"
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Gemini API model {model} failed: {e}")

        logger.error(f"All Gemini models failed. Last error: {last_error}")
        raise RuntimeError(f"Gemini generation failed: {last_error}")


async def parse_resume_with_ai(raw_text: str) -> dict:
    system = (
        "You are a resume parsing assistant. Extract structured data from resumes. "
        "Return ONLY valid JSON with no markdown. Keys: contact (name, email, phone, location, linkedin, website), "
        "summary, skills (array of strings), experience (array of {company, title, start_date, end_date, description}), "
        "education (array of {institution, degree, field, start_date, end_date}), certifications (array of strings)."
    )
    try:
        result = await _gemini_generate(f"Parse this resume:\n\n{raw_text[:8000]}", system)
        import json
        clean = result.strip().removeprefix("```json").removesuffix("```").strip()
        return json.loads(clean)
    except Exception as e:
        logger.warning(f"AI parse fallback triggered: {e}")
        return {}


async def generate_gap_explanation(
    resume_data: dict, job_description: str, gap_report: dict, role: str = "seeker"
) -> str:
    direction = "job seeker" if role == "seeker" else "employer evaluating a candidate"
    prompt = (
        f"As an AI hiring assistant for a {direction}, analyze this match:\n\n"
        f"Resume summary: {resume_data.get('summary', 'N/A')}\n"
        f"Resume skills: {', '.join(resume_data.get('skills', []))}\n"
        f"Job description: {job_description[:2000]}\n"
        f"Gap report: {gap_report}\n\n"
        "Provide a concise natural-language summary (3-5 sentences) explaining strengths, concerns, and a recommendation."
    )
    try:
        return await _gemini_generate(prompt, "You are a professional hiring advisor. Be concise and actionable.")
    except Exception as e:
        logger.warning(f"Gap explanation fallback: {e}")
        return f"Match evaluation complete. Keyword match score is {gap_report.get('match_score', 75)}%. Review missing skills and job requirements for further optimization."


async def generate_rewrite_suggestions(
    resume_data: dict, job_description: str, job_requirements: list[str], gap_report: dict
) -> list[dict]:
    prompt = (
        f"Given this resume:\n{resume_data}\n\n"
        f"Job description: {job_description[:2000]}\n"
        f"Job requirements: {job_requirements}\n"
        f"Gap report: {gap_report}\n\n"
        "Generate 2-4 evidence-grounded rewrite suggestions. Return a JSON array (no markdown) "
        "where each object has: section_type ('summary'|'experience'|'skills'), "
        "original_text, suggested_text, reasoning. "
        "IMPORTANT: Only suggest changes using the candidate's REAL experience. No fabrication."
    )
    system = "You are a resume optimization assistant. Return ONLY valid JSON array, no markdown code blocks."
    try:
        result = await _gemini_generate(prompt, system)
        import json
        clean = result.strip().removeprefix("```json").removesuffix("```").strip()
        return json.loads(clean)
    except Exception as e:
        logger.warning(f"Rewrite suggestions fallback: {e}")
        return []


async def chat_with_assistant(
    messages: list[dict], role_context: str, user_data: dict
) -> tuple[str, str | None]:
    system = (
        f"You are Synapse AI, a hiring platform assistant in {role_context} mode. "
        "You help users with resume optimization, job matching, and application tracking. "
        "Be concise and helpful."
    )

    gemini_messages = []
    for msg in messages:
        gemini_messages.append({"role": "user" if msg.get("role") == "user" else "model", "parts": [{"text": msg.get("content", "")}]})

    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": gemini_messages,
        "generationConfig": {
            "temperature": 0.6,
            "maxOutputTokens": 1024,
        },
    }

    async with httpx.AsyncClient(timeout=30) as client:
        reply = None
        for model in CANDIDATE_MODELS:
            url = f"{GEMINI_BASE}/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        text_parts = candidates[0]["content"].get("parts", [])
                        if text_parts and "text" in text_parts[0]:
                            reply = text_parts[0]["text"]
                            break
            except Exception as e:
                logger.warning(f"Chat Gemini model {model} failed: {e}")

        if not reply:
            reply = f"Hello! I am your Synapse AI assistant in {role_context} mode. How can I help with your job search or candidate evaluations today?"

    module = None
    lower = reply.lower()
    if "resume" in lower:
        module = "resume"
    elif "job" in lower:
        module = "jobs"
    elif "match" in lower or "score" in lower:
        module = "matching"
    elif "application" in lower:
        module = "applications"

    return reply, module

