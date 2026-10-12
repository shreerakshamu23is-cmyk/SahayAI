"""
Tamper Simulation Utility for Viva / Panel Demonstration
Usage:
  python simulate_tamper.py tamper   -> Simulates malicious alteration of Block #1
  python simulate_tamper.py check    -> Checks ledger integrity via backend logic
  python simulate_tamper.py restore  -> Restores original valid block hash
"""

import sys
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sahayai.db")

def tamper():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, block_hash FROM blockchain_records ORDER BY id ASC LIMIT 1")
    row = c.fetchone()
    if not row:
        print("No blockchain records found in database.")
        conn.close()
        return

    orig_id, orig_hash = row
    backup_file = os.path.join(os.path.dirname(__file__), ".orig_block_hash.txt")
    with open(backup_file, "w") as f:
        f.write(f"{orig_id}:{orig_hash}")

    fake_hash = "deadbeef" + orig_hash[8:]
    c.execute("UPDATE blockchain_records SET block_hash = ? WHERE id = ?", (fake_hash, orig_id))
    conn.commit()
    conn.close()
    print(f"[TAMPERED] Block #{orig_id} hash altered from {orig_hash[:16]}... to {fake_hash[:16]}...")
    print("Now go to frontend and click 'Audit Ledger Integrity' to see the security alarm in action!")

def restore():
    backup_file = os.path.join(os.path.dirname(__file__), ".orig_block_hash.txt")
    if not os.path.exists(backup_file):
        print("No backup hash found.")
        return

    with open(backup_file, "r") as f:
        orig_id, orig_hash = f.read().strip().split(":")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE blockchain_records SET block_hash = ? WHERE id = ?", (orig_hash, int(orig_id)))
    conn.commit()
    conn.close()
    os.remove(backup_file)
    print(f"[RESTORED] Block #{orig_id} restored to authentic hash {orig_hash[:16]}...")
    print("Blockchain ledger is 100% healthy again!")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "status"
    if action == "tamper":
        tamper()
    elif action == "restore":
        restore()
    else:
        print("Usage: python simulate_tamper.py [tamper|restore]")
