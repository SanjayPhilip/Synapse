import sqlite3
import json
import sys
sys.path.insert(0, '.')

conn = sqlite3.connect('synapse.db')
c = conn.cursor()

# 1. Approve all pending/null moderation jobs
pending = c.execute("SELECT count(*) FROM job_postings WHERE moderation_status != 'approved' OR moderation_status IS NULL").fetchone()[0]
print(f"Jobs not approved: {pending}")
c.execute("UPDATE job_postings SET moderation_status = 'approved' WHERE moderation_status != 'approved' OR moderation_status IS NULL")
print(f"  -> Updated {conn.total_changes} jobs to approved")

# 2. Reparse all resumes with updated parser
from app.services.resume_parser import parse_resume_text

resumes = c.execute('SELECT id, raw_text FROM resumes').fetchall()
print(f"\nReparsing {len(resumes)} resumes...")
for r_id, raw in resumes:
    if not raw:
        print(f"  Resume {r_id}: NO RAW TEXT, skipping")
        continue
    parsed = parse_resume_text(raw)
    exp_count = len(parsed.get('experience', []))
    skills_count = len(parsed.get('skills', []))
    print(f"  Resume {r_id}: {exp_count} experiences, {skills_count} skills")
    c.execute('UPDATE resumes SET parsed_data=? WHERE id=?', (json.dumps(parsed), r_id))

conn.commit()
print("\nAll done!")

# 3. Show users and their resume state
print("\nUsers:")
users = c.execute("SELECT id, email, role FROM users").fetchall()
for u in users:
    print(f"  {u[1]} ({u[2]}) - id: {u[0]}")
    resumes_for_user = c.execute("SELECT id, is_current FROM resumes WHERE user_id=?", (u[0],)).fetchall()
    for r in resumes_for_user:
        print(f"    Resume: {r[0]} is_current={r[1]}")
    apps = c.execute("SELECT id, status FROM applications WHERE seeker_id=?", (u[0],)).fetchall()
    print(f"    Applications: {len(apps)}")
    for a in apps:
        print(f"      {a[0]} status={a[1]}")

conn.close()
