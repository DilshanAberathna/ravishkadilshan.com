# Portfolio UI concept

A local, responsive portfolio prototype inspired by the supplied Renando references. All names, projects, and focus areas are explicitly illustrative pending personal details. No login, analytics, external account connection, or message delivery is implemented.

Open index.html directly or run:

    python3 -m http.server 4173 --bind 127.0.0.1

Visit http://127.0.0.1:4173. Google Fonts are optional network resources; system fallbacks work offline.

Files: index.html (content), style.css (responsive visual design), app.js (filters, accessible native dialogs, mobile menu).

Personalization: user confirmed they are a cybersecurity student. Display name is inferred from the supplied LinkedIn URL (ravishkadilshan); exact profile retrieval returned HTTP 999. Education, certifications, achievements, and specific focus areas are unverified and must not be inferred from similarly named profiles. LinkedIn URL is connected; remaining profile buttons and lab content are placeholders.

## Local publishing

Run `python3 server.py` from this folder. Open http://127.0.0.1:4173/admin/ to save, publish, or unpublish content. The admin keeps drafts in the browser and saves published entries in `.portfolio-published.json` beside the project folder. Open http://127.0.0.1:4173/ to review published changes.

The publishing server binds to loopback and checks the request origin. It is a local editing service. A hosted admin needs authentication and a deployment-specific storage setup.
