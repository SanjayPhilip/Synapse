# Synapse API Reference

Generated from FastAPI OpenAPI spec

Total endpoints: 89

## GET /api/v1/admin/activity
**Tags:** admin
**Summary:** Get Recent Activity

**Parameters:**
- `page` (query, optional) - 
- `page_size` (query, optional) - 
- `status` (query, optional) - 
- `seeker_name` (query, optional) - 
- `days` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/admin/health
**Tags:** admin
**Summary:** System Health

**Responses:**
- `200`: Successful Response

---
## GET /api/v1/admin/jobs
**Tags:** admin
**Summary:** List Admin Jobs

**Parameters:**
- `page` (query, optional) - 
- `page_size` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/admin/jobs/{job_id}
**Tags:** admin
**Summary:** Delete Admin Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/admin/jobs/{job_id}/moderation
**Tags:** admin
**Summary:** Moderate Job

**Parameters:**
- `job_id` (path, required) - 
- `moderation_status` (query, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/admin/notifications/broadcast
**Tags:** admin
**Summary:** Broadcast Notification

**Parameters:**
- `title` (query, required) - 
- `message` (query, optional) - 
- `link` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/admin/stats
**Tags:** admin
**Summary:** Get Admin Stats

**Responses:**
- `200`: Successful Response

---
## GET /api/v1/admin/users
**Tags:** admin
**Summary:** List Users

**Parameters:**
- `page` (query, optional) - 
- `page_size` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/admin/users/{user_id}
**Tags:** admin
**Summary:** Delete User

**Parameters:**
- `user_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/admin/users/{user_id}/status
**Tags:** admin
**Summary:** Update User Status

**Parameters:**
- `user_id` (path, required) - 
- `is_active` (query, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/analytics/admin
**Tags:** analytics
**Summary:** Admin Analytics

**Parameters:**
- `weeks` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/analytics/employer
**Tags:** analytics
**Summary:** Employer Analytics

**Parameters:**
- `from` (query, optional) - 
- `to` (query, optional) - 
- `days` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/analytics/seeker
**Tags:** analytics
**Summary:** Seeker Analytics

**Parameters:**
- `from` (query, optional) - 
- `to` (query, optional) - 
- `days` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/applications
**Tags:** applications
**Summary:** List My Applications

**Parameters:**
- `page` (query, optional) - 
- `page_size` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/applications
**Tags:** applications
**Summary:** Create Application

**Request Body:**
- Content-Type: `application/json`
  Schema: `ApplicationCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/applications/job/{job_id}
**Tags:** applications
**Summary:** List Applications For Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/applications/{application_id}
**Tags:** applications
**Summary:** Update Application

**Parameters:**
- `application_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `ApplicationUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/applications/{application_id}/history
**Tags:** applications
**Summary:** Get Application History

**Parameters:**
- `application_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/change-password
**Tags:** auth
**Summary:** Change Password

**Request Body:**
- Content-Type: `application/json`
  Schema: `PasswordChangeRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/forgot-password
**Tags:** auth
**Summary:** Forgot Password

**Request Body:**
- Content-Type: `application/json`
  Schema: `ForgotPasswordRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/login
**Tags:** auth
**Summary:** Login

**Request Body:**
- Content-Type: `application/json`
  Schema: `UserLogin`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/auth/me
**Tags:** auth
**Summary:** Get Me

**Responses:**
- `200`: Successful Response

---
## PUT /api/v1/auth/me
**Tags:** auth
**Summary:** Update Me

**Request Body:**
- Content-Type: `application/json`
  Schema: `app__schemas__auth__ProfileUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/register
**Tags:** auth
**Summary:** Register

**Request Body:**
- Content-Type: `application/json`
  Schema: `UserRegister`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/resend-verification
**Tags:** auth
**Summary:** Resend Verification

**Request Body:**
- Content-Type: `application/json`
  Schema: `ResendVerificationRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/reset-password
**Tags:** auth
**Summary:** Reset Password

**Request Body:**
- Content-Type: `application/json`
  Schema: `PasswordResetRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/auth/users/{user_id}
**Tags:** auth
**Summary:** Get User Profile

**Parameters:**
- `user_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auth/verify-email
**Tags:** auth
**Summary:** Verify Email

**Request Body:**
- Content-Type: `application/json`
  Schema: `VerifyEmailRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/auto-apply
**Tags:** auto_apply
**Summary:** List Auto Apply Logs

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/auto-apply
**Tags:** auto_apply
**Summary:** Trigger Auto Apply

**Request Body:**
- Content-Type: `application/json`
  Schema: `AutoApplyLogCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/auto-apply/admin/dead-letter
**Tags:** auto_apply
**Summary:** List Dead Letter Logs

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/auto-apply/admin/dead-letter/retry
**Tags:** auto_apply
**Summary:** Retry Dead Letter Logs

**Request Body:**
- Content-Type: `application/json`
  Schema: `DeadLetterRetryRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/auto-apply/admin/dead-letter/retry-all
**Tags:** auto_apply
**Summary:** Retry All Dead Letter Logs

**Responses:**
- `200`: Successful Response

---
## DELETE /api/v1/auto-apply/admin/dead-letter/{log_id}
**Tags:** auto_apply
**Summary:** Delete Dead Letter Log

**Parameters:**
- `log_id` (path, required) - 

**Responses:**
- `204`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/auto-apply/{log_id}
**Tags:** auto_apply
**Summary:** Update Auto Apply Log

**Parameters:**
- `log_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `AutoApplyLogUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/auto-apply/{seeker_id}/{job_id}
**Tags:** auto_apply
**Summary:** Get Auto Apply Log

**Parameters:**
- `seeker_id` (path, required) - 
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/chat/sessions
**Tags:** chat
**Summary:** List Sessions

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/chat/sessions
**Tags:** chat
**Summary:** Create Session

**Request Body:**
- Content-Type: `application/json`
  Schema: `ChatSessionCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/chat/sessions/{session_id}/messages
**Tags:** chat
**Summary:** List Messages

**Parameters:**
- `session_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/chat/sessions/{session_id}/messages
**Tags:** chat
**Summary:** Send Message

**Parameters:**
- `session_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `ChatMessageCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/external-jobs/search
**Tags:** external_jobs
**Summary:** Search External

**Parameters:**
- `q` (query, required) - 
- `location` (query, optional) - 
- `limit` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/external-jobs/{job_id}/apply
**Tags:** external_jobs
**Summary:** Apply External Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/external-jobs/{job_id}/save
**Tags:** external_jobs
**Summary:** Save External Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/job-alerts
**Tags:** job_alerts
**Summary:** List My Alerts

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/job-alerts
**Tags:** job_alerts
**Summary:** Create Alert

**Request Body:**
- Content-Type: `application/json`
  Schema: `JobAlertCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/job-alerts/{alert_id}
**Tags:** job_alerts
**Summary:** Update Alert

**Parameters:**
- `alert_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `JobAlertUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/job-alerts/{alert_id}
**Tags:** job_alerts
**Summary:** Delete Alert

**Parameters:**
- `alert_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/jobs
**Tags:** jobs
**Summary:** List Jobs

**Parameters:**
- `q` (query, optional) - 
- `status` (query, optional) - 
- `category` (query, optional) - 
- `employer_id` (query, optional) - 
- `limit` (query, optional) - 
- `page` (query, optional) - 
- `page_size` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/jobs
**Tags:** jobs
**Summary:** Create Job

**Request Body:**
- Content-Type: `application/json`
  Schema: `JobPostingCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/jobs/{job_id}
**Tags:** jobs
**Summary:** Get Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/jobs/{job_id}
**Tags:** jobs
**Summary:** Update Job

**Parameters:**
- `job_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `JobPostingUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/jobs/{job_id}
**Tags:** jobs
**Summary:** Delete Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/jobs/{job_id}/repost
**Tags:** jobs
**Summary:** Repost Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/matching/compute
**Tags:** matching
**Summary:** Compute Match Score

**Request Body:**
- Content-Type: `application/json`
  Schema: `MatchRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/matching/gap-explanation
**Tags:** matching
**Summary:** Get Gap Explanation

**Request Body:**
- Content-Type: `application/json`
  Schema: `MatchRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/matching/job/{job_id}/candidates
**Tags:** matching
**Summary:** Get Ranked Candidates

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/matching/match-resume/{resume_id}/{job_id}
**Tags:** matching
**Summary:** Match Resume To Job

**Parameters:**
- `resume_id` (path, required) - 
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/matching/user/opportunities
**Tags:** matching
**Summary:** Get Ranked Opportunities

**Responses:**
- `200`: Successful Response

---
## GET /api/v1/notifications
**Tags:** notifications
**Summary:** List Notifications

**Parameters:**
- `page` (query, optional) - 
- `page_size` (query, optional) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/notifications/read-all
**Tags:** notifications
**Summary:** Mark All Read

**Responses:**
- `200`: Successful Response

---
## GET /api/v1/notifications/unread-count
**Tags:** notifications
**Summary:** Unread Count

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/notifications/{notification_id}/read
**Tags:** notifications
**Summary:** Mark Read

**Parameters:**
- `notification_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/profile/avatar
**Tags:** profile
**Summary:** Upload Avatar

**Request Body:**
- Content-Type: `multipart/form-data`
  Schema: `Body_upload_avatar_api_v1_profile_avatar_post`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/profile/avatar
**Tags:** profile
**Summary:** Delete Avatar Endpoint

**Responses:**
- `200`: Successful Response

---
## GET /api/v1/profile/me
**Tags:** profile
**Summary:** Get Profile

**Responses:**
- `200`: Successful Response

---
## PUT /api/v1/profile/me
**Tags:** profile
**Summary:** Update Profile

**Request Body:**
- Content-Type: `application/json`
  Schema: `app__schemas__profile__ProfileUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/resumes
**Tags:** resumes
**Summary:** List Resumes

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/resumes
**Tags:** resumes
**Summary:** Create Resume Manual

**Request Body:**
- Content-Type: `application/json`
  Schema: `ResumeCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/resumes/current
**Tags:** resumes
**Summary:** Get Current Resume

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/resumes/parse
**Tags:** resumes
**Summary:** Parse Resume Text Endpoint

**Request Body:**
- Content-Type: `application/json`
  Schema: `ResumeParseRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/resumes/upload
**Tags:** resumes
**Summary:** Upload Resume

**Request Body:**
- Content-Type: `multipart/form-data`
  Schema: `Body_upload_resume_api_v1_resumes_upload_post`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/resumes/{resume_id}
**Tags:** resumes
**Summary:** Get Resume

**Parameters:**
- `resume_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/resumes/{resume_id}
**Tags:** resumes
**Summary:** Update Resume

**Parameters:**
- `resume_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `ResumeUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/resumes/{resume_id}
**Tags:** resumes
**Summary:** Delete Resume

**Parameters:**
- `resume_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/resumes/{resume_id}/restore
**Tags:** resumes
**Summary:** Restore Resume

**Parameters:**
- `resume_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/rewrites/generate/{resume_id}/{job_id}
**Tags:** rewrites
**Summary:** Generate Suggestions

**Parameters:**
- `resume_id` (path, required) - 
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/rewrites/{resume_id}/{job_id}
**Tags:** rewrites
**Summary:** Get Suggestions

**Parameters:**
- `resume_id` (path, required) - 
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## PUT /api/v1/rewrites/{suggestion_id}
**Tags:** rewrites
**Summary:** Update Suggestion

**Parameters:**
- `suggestion_id` (path, required) - 

**Request Body:**
- Content-Type: `application/json`
  Schema: `RewriteSuggestionUpdate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/saved-jobs
**Tags:** saved_jobs
**Summary:** List Saved Jobs

**Responses:**
- `200`: Successful Response

---
## POST /api/v1/saved-jobs
**Tags:** saved_jobs
**Summary:** Save Job

**Request Body:**
- Content-Type: `application/json`
  Schema: `SavedJobCreate`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## DELETE /api/v1/saved-jobs/{job_id}
**Tags:** saved_jobs
**Summary:** Unsave Job

**Parameters:**
- `job_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/security/delete-account
**Tags:** security
**Summary:** Delete Account

**Request Body:**
- Content-Type: `application/json`
  Schema: `DeleteAccountRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/security/email/change
**Tags:** security
**Summary:** Request Email Change

**Request Body:**
- Content-Type: `application/json`
  Schema: `EmailChangeRequest`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## POST /api/v1/security/email/confirm
**Tags:** security
**Summary:** Confirm Email Change

**Request Body:**
- Content-Type: `application/json`
  Schema: `EmailChangeConfirm`

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /api/v1/security/sessions
**Tags:** security
**Summary:** List Sessions

**Responses:**
- `200`: Successful Response

---
## DELETE /api/v1/security/sessions
**Tags:** security
**Summary:** Revoke Other Sessions

**Responses:**
- `200`: Successful Response

---
## DELETE /api/v1/security/sessions/{session_id}
**Tags:** security
**Summary:** Revoke Session

**Parameters:**
- `session_id` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---
## GET /health
**Tags:** untagged
**Summary:** Health

**Responses:**
- `200`: Successful Response

---
## GET /{full_path}
**Tags:** untagged
**Summary:** Spa Fallback

**Parameters:**
- `full_path` (path, required) - 

**Responses:**
- `200`: Successful Response
- `422`: Validation Error

---