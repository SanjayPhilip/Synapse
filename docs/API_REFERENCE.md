# Synapse — API Reference

Auto-generated from the FastAPI app. For interactive browsing, start the backend and open:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

This document provides a structured reference for the main API routes.

## Base URL

```
http://localhost:8000/api/v1
```

## Auth

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/auth/register` | Register seeker/employer |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/change-password` | Change password (authenticated) |
| POST | `/auth/forgot-password` | Request password reset email |
| POST | `/auth/reset-password` | Reset password with token |
| POST | `/auth/resend-verification` | Resend email verification |
| POST | `/auth/verify-email` | Verify email with token |
| GET | `/auth/me` | Get current profile |
| PUT | `/auth/me` | Update profile |
| GET | `/auth/users/{user_id}` | Get user profile by ID |

## Resumes

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/resumes` | List resumes |
| GET | `/resumes/current` | Get current resume |
| POST | `/resumes/upload` | Upload file (PDF/DOCX/TXT) |
| POST | `/resumes` | Create manual resume |
| POST | `/resumes/parse` | Parse raw resume text |
| PUT | `/resumes/{id}` | Update resume |
| DELETE | `/resumes/{id}` | Delete resume |

## Jobs

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/jobs` | List job postings |
| POST | `/jobs` | Create job posting |
| PUT | `/jobs/{id}` | Update job posting |
| DELETE | `/jobs/{id}` | Delete job posting |

## Applications

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/applications` | My applications |
| POST | `/applications` | Apply to job |
| GET | `/applications/{id}` | Get application detail |
| GET | `/applications/{id}/history` | Get status history |
| PUT | `/applications/{id}` | Update application status |

## Matching

| Method | Path | Description |
| :--- | :--- | :--- |
| POST | `/matching/match-resume/{rid}/{jid}` | Score resume vs job |
| POST | `/matching/compute` | Ad-hoc match computation |
| GET | `/matching/job/{jid}/candidates` | Ranked candidates |
| GET | `/matching/user/opportunities` | Ranked opportunities |

## Chat

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/chat/sessions` | List sessions |
| POST | `/chat/sessions` | Create session |
| POST | `/chat/sessions/{id}/messages` | Send message |

## Saved Jobs

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/saved-jobs` | List saved jobs |
| POST | `/saved-jobs` | Save job |
| DELETE | `/saved-jobs/{id}` | Unsave job |

## Rewrites

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/rewrites` | List rewrite suggestions |
| POST | `/rewrites` | Create rewrite suggestion |
| PUT | `/rewrites/{id}` | Update rewrite status |

## Auto-Apply

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/auto-apply/logs` | List auto-apply logs |
| POST | `/auto-apply/apply` | Queue external job application |

## Job Alerts

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/job-alerts` | List job alerts |
| POST | `/job-alerts` | Create job alert |
| PUT | `/job-alerts/{id}` | Update job alert |
| DELETE | `/job-alerts/{id}` | Delete job alert |

## External Jobs

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/external-jobs/search` | Search external jobs |
| POST | `/external-jobs/{id}/save` | Save external job |
| POST | `/external-jobs/{id}/apply` | Apply to external job |

## Notifications

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/notifications` | List notifications |
| POST | `/notifications` | Create notification |
| PUT | `/notifications/{id}/read` | Mark as read |
| DELETE | `/notifications/{id}` | Delete notification |

## Admin

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/users` | List all users |
| PUT | `/admin/users/{id}` | Update user |
| GET | `/admin/jobs` | List all jobs |
| GET | `/admin/activity` | Activity log |

## WebSocket

| Path | Description |
| :--- | :--- |
| `WS /ws/notifications` | Real-time notification push |

## Health

| Method | Path | Description |
| :--- | :--- | :--- |
| GET | `/health` | Health check |
