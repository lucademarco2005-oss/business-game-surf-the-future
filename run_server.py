"""
Server startup wrapper — bypassa il PermissionError di macOS SIP con Python 3.9.
Pre-importa h11 nel contesto corretto prima che uvicorn usi import_from_string.
"""
import sys
import os

# Assicura che i site-packages utente siano in cima al path
user_site = "/Users/lucademarco/Library/Python/3.13/lib/python/site-packages"
if user_site not in sys.path:
    sys.path.insert(0, user_site)

# Pre-importa h11 per priming di sys.modules prima che uvicorn usi import_from_string
import h11  # noqa: F401

import uvicorn

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8003,
        loop="asyncio",
        http="h11",
    )
