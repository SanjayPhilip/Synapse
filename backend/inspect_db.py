import sqlite3
conn = sqlite3.connect('synapse.db')
c = conn.cursor()

print("=== PROFILES (Users) ===")
users = c.execute("SELECT id, email, role, is_active, is_verified FROM profiles").fetchall()
for u in users:
    uid, email, role, active, verified = u
    print(f"\n  {email} (role={role}, active={active}, verified={verified})")
    print(f"    id: {uid}")
    resumes = c.execute("SELECT id, is_current, file_name FROM resumes WHERE user_id=?", (uid,)).fetchall()
    for r in resumes:
        print(f"    Resume: {r[0]} is_current={r[1]} file={r[2]}")
    apps = c.execute("SELECT id, job_posting_id, status, resume_id FROM applications WHERE seeker_id=?", (uid,)).fetchall()
    print(f"    Applications: {len(apps)}")
    for a in apps:
        print(f"      app_id={a[0]} status={a[2]} resume_id={a[3]}")

print("\n=== JOB POSTINGS ===")
jobs = c.execute("SELECT id, title, status, moderation_status, employer_id FROM job_postings LIMIT 15").fetchall()
for j in jobs:
    print(f"  {j[1]} status={j[2]} mod={j[3]}")

conn.close()
