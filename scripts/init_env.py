"""Create local credentials without displaying them or overwriting existing configuration."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
target = root / ".env"
if target.exists():
    print(".env already exists; preserved")
else:
    content = (root / ".env.example").read_text(encoding="utf-8")
    replacements = {
        "replace-with-at-least-24-random-characters": secrets.token_urlsafe(32),
        "replace-with-a-different-random-secret": secrets.token_urlsafe(32),
        "replace-with-another-different-random-secret": secrets.token_urlsafe(32),
        "replace-control-db-password": secrets.token_urlsafe(24),
        "replace-lab-db-password": secrets.token_urlsafe(24),
    }
    for old, new in replacements.items():
        content = content.replace(old, new)
    target.write_text(content, encoding="utf-8")
    print("Created .env with independent random secrets. Keep this file private.")
