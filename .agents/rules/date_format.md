# Date Format Rule

All dates in the application metadata and UI should strictly use the Romanian format: `DD.MM.YYYY` (or `ZZ.LL.AAAA`).
This applies to:
- Form inputs (use text inputs with this placeholder, rather than native date pickers if they default to US locales)
- API requests and responses (unless ISO is strictly required by the backend, but the frontend should always display `DD.MM.YYYY`)
- Extracted metadata from documents

Avoid using `MM/DD/YYYY` or `YYYY-MM-DD` for user-facing UI elements.

PontajSmart note: internally (state, API, SQL) calendar days are `YYYY-MM-DD` computed in local time with `utils/date.ts`; only the display uses `DD.MM.YYYY`.
