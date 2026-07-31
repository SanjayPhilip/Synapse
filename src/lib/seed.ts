import { api } from '@/lib/api-client';
import type { JobPosting } from '@/types';

const SAMPLE_JOBS: Array<{
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string;
  is_remote: boolean;
  salary_min: number;
  salary_max: number;
  job_type: string;
}> = [
  {
    title: 'Senior Frontend Engineer',
    description: 'We are looking for a Senior Frontend Engineer to lead our React-based web application development. You will architect user interfaces, mentor junior developers, and drive best practices in performance and accessibility.',
    requirements: ['React', 'TypeScript', 'Tailwind CSS', 'REST API', 'Git', '5+ years frontend experience'],
    responsibilities: ['Lead frontend architecture decisions', 'Build reusable component libraries', 'Optimize application performance', 'Mentor junior engineers'],
    location: 'San Francisco, CA',
    is_remote: true,
    salary_min: 140000,
    salary_max: 190000,
    job_type: 'full_time',
  },
  {
    title: 'Machine Learning Engineer',
    description: 'Join our AI team to build and deploy production ML models. You will work on NLP, computer vision, and recommendation systems.',
    requirements: ['Python', 'PyTorch', 'TensorFlow', 'Machine Learning', 'NLP', 'Docker', 'AWS'],
    responsibilities: ['Train and fine-tune ML models', 'Deploy models to production', 'Build data pipelines'],
    location: 'Remote',
    is_remote: true,
    salary_min: 130000,
    salary_max: 180000,
    job_type: 'full_time',
  },
  {
    title: 'Backend API Developer (Python)',
    description: 'Design and build scalable REST APIs using FastAPI and PostgreSQL. You will work on our core platform services.',
    requirements: ['Python', 'FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Docker', 'REST API design'],
    responsibilities: ['Design API endpoints', 'Write clean, tested code', 'Optimize database queries'],
    location: 'Austin, TX',
    is_remote: true,
    salary_min: 110000,
    salary_max: 150000,
    job_type: 'full_time',
  },
  {
    title: 'Full-Stack JavaScript Developer',
    description: 'Build end-to-end features across our React + Node.js stack. You will own features from database schema to UI.',
    requirements: ['JavaScript', 'Node.js', 'React', 'Express', 'MongoDB', 'GraphQL'],
    responsibilities: ['Develop full-stack features', 'Write unit and integration tests', 'Deploy to production'],
    location: 'New York, NY',
    is_remote: false,
    salary_min: 100000,
    salary_max: 140000,
    job_type: 'full_time',
  },
  {
    title: 'DevOps & Cloud Engineer',
    description: 'Manage our cloud infrastructure on AWS, CI/CD pipelines, and container orchestration.',
    requirements: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Linux', 'CI/CD'],
    responsibilities: ['Manage cloud infrastructure', 'Build CI/CD pipelines', 'Monitor system health'],
    location: 'Seattle, WA',
    is_remote: true,
    salary_min: 125000,
    salary_max: 170000,
    job_type: 'full_time',
  },
  {
    title: 'Data Scientist — Analytics',
    description: 'Analyze large datasets to drive business insights. You will build dashboards, run A/B tests, and create predictive models.',
    requirements: ['Python', 'SQL', 'Pandas', 'Tableau', 'Statistics', 'A/B Testing'],
    responsibilities: ['Analyze datasets for business insights', 'Build dashboards and reports', 'Run A/B experiments'],
    location: 'Boston, MA',
    is_remote: true,
    salary_min: 95000,
    salary_max: 130000,
    job_type: 'full_time',
  },
  {
    title: 'Product Designer (UI/UX)',
    description: 'Design intuitive, beautiful interfaces for our SaaS products.',
    requirements: ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'HTML/CSS'],
    responsibilities: ['Design user interfaces', 'Conduct user research', 'Create prototypes'],
    location: 'Remote',
    is_remote: true,
    salary_min: 90000,
    salary_max: 125000,
    job_type: 'full_time',
  },
  {
    title: 'Junior Software Developer (Internship)',
    description: 'Great opportunity for recent grads to gain real-world experience.',
    requirements: ['JavaScript or Python', 'Git', 'Basic SQL', 'Eagerness to learn'],
    responsibilities: ['Build features under mentorship', 'Write tests', 'Learn best practices'],
    location: 'Chicago, IL',
    is_remote: true,
    salary_min: 50000,
    salary_max: 70000,
    job_type: 'internship',
  },
];

export async function seedSampleJobs(): Promise<void> {
  try {
    const existing = await api.get<JobPosting[]>('/api/v1/jobs?status=active&limit=1');
    if (existing.length > 0) return;

    for (const job of SAMPLE_JOBS) {
      await api.post('/api/v1/jobs', job);
    }
  } catch {
    // seed failed silently
  }
}

export async function getSampleJobsForFeed(): Promise<JobPosting[]> {
  return api.get<JobPosting[]>('/api/v1/jobs?status=active');
}
