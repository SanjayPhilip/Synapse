import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface JobResult {
  title: string;
  description: string;
  requirements: string[];
  location: string;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  job_type: string;
  external_source: string;
  external_id: string;
  external_url: string;
}

function extractRequirements(description: string): string[] {
  const keywords = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "React", "Angular", "Vue",
    "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "SQL", "PostgreSQL",
    "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
    "Git", "CI/CD", "Jenkins", "REST", "GraphQL", "HTML", "CSS", "Tailwind",
    "Machine Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn",
    "Data Analysis", "Tableau", "Power BI", "Excel", "Leadership", "Agile", "Scrum",
    "Project Management", "Communication", "Teamwork", "Problem Solving", "Figma",
    "User Research", "Prototyping", "Linux", "Terraform", "Jira",
  ];
  return keywords.filter((kw) =>
    new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(description)
  );
}

async function searchAdzuna(query: string, location: string): Promise<JobResult[]> {
  const appId = Deno.env.get("ADZUNA_APP_ID");
  const apiKey = Deno.env.get("ADZUNA_API_KEY");
  if (!appId || !apiKey) return [];

  try {
    const country = "us";
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${apiKey}&what=${encodeURIComponent(query)}${location ? `&where=${encodeURIComponent(location)}` : ""}&results_per_page=10`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.results) return [];

    return data.results.map((job: any): JobResult => ({
      title: job.title || "Unknown Title",
      description: job.description || "",
      requirements: extractRequirements(job.description || ""),
      location: job.location?.display_name || null,
      is_remote: (job.description || "").toLowerCase().includes("remote"),
      salary_min: job.salary_min ? Math.round(job.salary_min) : null,
      salary_max: job.salary_max ? Math.round(job.salary_max) : null,
      job_type: job.contract_time === "full_time" ? "full_time" : job.contract_time === "part_time" ? "part_time" : "full_time",
      external_source: "adzuna",
      external_id: job.id?.toString() || "",
      external_url: job.redirect_url || "",
    }));
  } catch {
    return [];
  }
}

async function searchJSearch(query: string, location: string): Promise<JobResult[]> {
  const apiKey = Deno.env.get("JSEARCH_API_KEY");
  if (!apiKey) return [];

  try {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}${location ? `&location=${encodeURIComponent(location)}` : ""}&num_pages=1`;

    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.data) return [];

    return data.data.map((job: any): JobResult => ({
      title: job.job_title || "Unknown Title",
      description: job.job_description || job.job_highlights || "",
      requirements: extractRequirements(job.job_description || ""),
      location: job.job_city ? `${job.job_city}, ${job.job_state || ""}` : job.job_country || null,
      is_remote: (job.job_description || "").toLowerCase().includes("remote") || job.job_is_remote === true,
      salary_min: job.job_min_salary ? Math.round(job.job_min_salary) : null,
      salary_max: job.job_max_salary ? Math.round(job.job_max_salary) : null,
      job_type: job.job_employment_type ? job.job_employment_type.toLowerCase().replace("-", "_") : "full_time",
      external_source: "jsearch",
      external_id: job.job_id?.toString() || "",
      external_url: job.job_apply_link || "",
    }));
  } catch {
    return [];
  }
}

function deduplicateJobs(jobs: JobResult[]): JobResult[] {
  const seen = new Set<string>();
  const result: JobResult[] = [];
  for (const job of jobs) {
    const key = `${job.external_source}-${job.external_id}`;
    if (!seen.has(key) && job.external_id) {
      seen.add(key);
      result.push(job);
    }
  }
  return result;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";
    const location = url.searchParams.get("location") || "";

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search both sources in parallel
    const [adzunaResults, jsearchResults] = await Promise.all([
      searchAdzuna(query, location),
      searchJSearch(query, location),
    ]);

    // Combine and deduplicate
    const allJobs = deduplicateJobs([...adzunaResults, ...jsearchResults]);

    return new Response(
      JSON.stringify({ jobs: allJobs, count: allJobs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
