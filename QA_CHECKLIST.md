# Synapse Manual QA Checklist

> Run through each section. Mark ✅ pass, ❌ fail, or ⏭️ skip.

---

## 🔐 Auth & Accounts

| Test | Expected | Result |
|------|----------|--------|
| Register seeker | Creates account, sends verification email (or prints to console) | |
| Register employer | Creates account, sends verification email | |
| Login valid credentials | Returns JWT, sets localStorage | |
| Login invalid credentials | Shows error toast | |
| Email verification link | Verifies account, redirects to login | |
| Resend verification | Sends new link | |
| Forgot password | Sends reset email | |
| Reset password | Updates password, logs in | |
| Change password (settings) | Updates password, invalidates other sessions | |
| Role switch (seeker↔employer) | Updates UI, persists role | |
| Demo accounts work | All 3 logins succeed | |

---

## 📄 Resume

| Test | Expected | Result |
|------|----------|--------|
| Upload PDF | Parses, shows preview, saves version | |
| Upload DOCX | Parses, shows preview, saves version | |
| Upload TXT | Parses, shows preview, saves version | |
| Oversize file (>5MB) | Rejected with error | |
| Invalid file type | Rejected with error | |
| Manual paste → parse | Calls backend, shows parsed data | |
| Version history | Lists versions, shows diff | |
| Restore version | Sets as current | |
| Delete resume | Removes, clears current | |
| Drag-drop dropzone | Works same as click | |

---

## 🎯 Matching & Rewrites

| Test | Expected | Result |
|------|----------|--------|
| Match score calculation | Shows % with breakdown | |
| Ranked opportunities (seeker) | Lists jobs with scores | |
| Ranked candidates (employer) | Lists applicants with scores | |
| Gap report | Shows matched/missing skills, strengths, concerns | |
| AI gap explanation | Generates via Gemini | |
| AI rewrite suggestions | Generates, accept/reject/edit works | |
| Accept rewrite | Updates resume version | |

---

## 💼 Jobs & Applications

| Test | Expected | Result |
|------|----------|--------|
| Create job (employer) | Saves, appears in feed | |
| Edit job | Updates fields | |
| Delete job | Removes | |
| Auto-screening threshold | Applies on submit | |
| Apply to job | Creates application, triggers auto-screen | |
| Application status timeline | Shows applied→screened→shortlisted→hired | |
| Saved jobs | Bookmark/unbookmark works | |
| Employer: view applicants | Lists with status, match score | |
| Employer: change status | Updates, sends notification | |
| Employer: screening summary | Shows counts by status + avg match | |

---

## 💬 Communications

| Test | Expected | Result |
|------|----------|--------|
| Chat assistant | Responds, routes by role/module | |
| WebSocket notifications | Real-time badge updates | |
| Notification list | Shows all, mark read works | |
| Job alerts CRUD | Create/edit/delete/fire | |
| Alert match notification | Fires on new matching job | |
| Status change notification | In-app + email | |
| Auto-screen notification | In-app + email | |

---

## 👑 Admin Panel

| Test | Expected | Result |
|------|----------|--------|
| Users table | Search/filter/suspend works | |
| Jobs table | Moderation actions work | |
| Activity log | Filters work | |
| Broadcast notification | Sends to all users | |
| System health | Shows API keys, storage, DB status | |
| Analytics charts | Render data | |

---

## 🎨 UI / Theming

| Test | Expected | Result |
|------|----------|--------|
| Dark mode toggle | Persists, applies instantly | |
| Light mode | Clean, readable | |
| Theme persists across reload | localStorage synced | |
| Landing page | Loads, photos render | |
| 404 page | Shows for unknown routes | |
| Verify email page | Handles token param | |
| Toast system | Success/error/info variants | |
| Topbar search (seeker) | Redirects to /app/jobs?q= | |
| Password strength meter | Shows on register | |
| Remember me | Persists email | |

---

## 📱 Responsive / Mobile

| Test | Expected | Result |
|------|----------|--------|
| Mobile viewport (375px) | No horizontal scroll | |
| Tablet (768px) | Layout adapts | |
| Desktop (1440px) | Full layout | |
| Touch targets | ≥44px | |
| Hamburger menu | Works on mobile | |

---

## ♿ Accessibility

| Test | Expected | Result |
|------|----------|--------|
| Keyboard navigation | Tab order logical, focus visible | |
| Focus states | Visible on all interactive | |
| Color contrast | WCAG AA (4.5:1 text) | |
| Form labels | Associated with inputs | |
| ARIA labels | On icon buttons | |
| Screen reader | Announces toasts, modals | |

---

## 🔍 Search & External Jobs

| Test | Expected | Result |
|------|----------|--------|
| Job feed search | Filters results | |
| Sort dropdown | Score/date/salary works | |
| Location filter | Works | |
| Salary filter | Works | |
| Remote toggle | Works | |
| External job search | Shows Adzuna/JSearch results | |
| Save external job | Materializes to JobPosting | |
| Apply external job | Creates AutoApplyLog | |
| Stale flag | Shows when APIs down | |

---

## 📊 Analytics & Charts

| Test | Expected | Result |
|------|----------|--------|
| Employer: volume over time | Line/area chart renders | |
| Employer: match distribution | Histogram renders | |
| Employer: funnel | Applied→shortlisted→hired | |
| Employer: time-to-fill | Shows avg days | |
| Seeker: outcomes over time | Chart renders | |
| Admin: platform growth | Weekly users/jobs/apps | |
| Export CSV | Downloads data | |

---

## ⚙️ Settings

| Test | Expected | Result |
|------|----------|--------|
| Avatar upload | Crops, uploads, displays | |
| Bio/headline | Saves, displays on profile | |
| Phone/location/LinkedIn/website | Saves | |
| Password change form | Works, validates | |
| Email change | Sends verification, switches after verify | |
| Active sessions | Lists, revoke works | |
| Delete account | Confirms, soft-deletes | |
| Theme toggle in settings | Syncs with topbar | |
| Locale select | Changes UI language | |
| Export my data | Downloads JSON | |
| Notification preferences | Toggles email vs in-app | |

---

## 📝 Onboarding & Empty States

| Test | Expected | Result |
|------|----------|--------|
| First login seeker | Shows upload resume CTA | |
| First login employer | Shows post job CTA | |
| Empty job feed | Icon + heading + CTA | |
| Empty applications | Icon + heading + CTA | |
| Empty saved jobs | Icon + heading + CTA | |
| Guided tour tooltips | Appear on key pages | |

---

## 🧪 Error / Edge Cases

| Test | Expected | Result |
|------|----------|--------|
| Network offline | Shows offline toast | |
| API 500 | Shows friendly error, request ID | |
| API 401 | Redirects to login | |
| API 403 | Shows forbidden | |
| API 404 | Shows not found | |
| Validation errors | Inline field messages | |
| Form submit loading | Disables button, shows spinner | |
| Duplicate application | Prevents, shows error | |
| Expired token | Auto-refresh or redirect | |

---

## 🐳 Docker / Deployment

| Test | Expected | Result |
|------|----------|--------|
| `docker compose up -d` | All services healthy | |
| Backend health endpoint | Returns 200 | |
| Frontend served | Loads at / | |
| WebSocket connects | /ws works | |
| Migrations run | Tables created | |
| Seed data | Demo accounts exist | |
| Worker starts | Processes queue | |
| Backup cron | Runs at 2 AM | |

---

## Summary

| Category | Total | Pass | Fail | Skip |
|----------|-------|------|------|------|
| Auth | 10 | | | |
| Resume | 10 | | | |
| Matching | 7 | | | |
| Jobs/Apps | 9 | | | |
| Communications | 7 | | | |
| Admin | 6 | | | |
| UI/Theming | 10 | | | |
| Responsive | 5 | | | |
| Accessibility | 6 | | | |
| Search/External | 8 | | | |
| Analytics | 7 | | | |
| Settings | 12 | | | |
| Onboarding | 6 | | | |
| Error Cases | 9 | | | |
| Docker | 8 | | | |
| **TOTAL** | **120** | | | |

---

**Sign-off:** _________________ **Date:** _________________