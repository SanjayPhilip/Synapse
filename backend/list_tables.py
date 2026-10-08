import sqlite3
conn = sqlite3.connect('synapse.db')
c = conn.cursor()
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)
for t in tables:
    print(f"\n{t} columns:", [r[1] for r in c.execute(f"PRAGMA table_info({t})").fetchall()])
conn.close()
