"""Seed the FORENSIGHT user accounts.

Creates the three demo login accounts (investigator / analyst / admin)
so the application can be accessed immediately after setup.

No cases, evidence, entities, or other data is seeded.  The
application starts completely empty, ready for real data entry.

Usage:
    python seed.py            # seed (skips if users already exist)
    python seed.py --force    # drop all tables, recreate and seed
"""

import sys

if sys.stdout and sys.stdout.encoding and sys.stdout.encoding.lower() in ("cp1252", "ascii"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, init_db
from models import User
from security import hash_password


def _seed_users(db: Session) -> None:
    users = [
        User(
            login_id="investigator",
            name="A. Sharma",
            email="a.sharma@forensight.example",
            password_hash=hash_password("demo123"),
            role="INVESTIGATOR",
            department="Field Investigation Unit",
        ),
        User(
            login_id="analyst",
            name="R. Patel",
            email="r.patel@forensight.example",
            password_hash=hash_password("demo123"),
            role="ANALYST",
            department="Analytics Support",
        ),
        User(
            login_id="admin",
            name="S. Verma",
            email="s.verma@forensight.example",
            password_hash=hash_password("admin123"),
            role="ADMIN",
            department="Platform Governance",
        ),
    ]
    for user in users:
        db.add(user)
    db.flush()


def main() -> None:
    force = "--force" in sys.argv

    init_db()

    with SessionLocal() as db:
        existing = db.query(User).first()
        if existing and not force:
            print("Users already present. Run `python seed.py --force` to rebuild.")
            return

        if force:
            Base.metadata.drop_all(bind=engine)
            init_db()

        _seed_users(db)
        db.commit()

    print("Seed complete. Demo logins:")
    print("  investigator / demo123  (INVESTIGATOR, A. Sharma)")
    print("  analyst      / demo123  (ANALYST, R. Patel)")
    print("  admin        / admin123 (ADMIN, S. Verma)")
    print("\nStart the API with:")
    print("  uvicorn main:app --reload --port 8000")


if __name__ == "__main__":
    main()
