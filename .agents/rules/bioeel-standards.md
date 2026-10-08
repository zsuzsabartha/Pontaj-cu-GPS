---
description: Bioeel application design, language guidelines, White/Black theme, and Anti-Bloat code hygiene rules
trigger: always_on
---

# Bioeel Engineering & Design Guidelines

When developing, refactoring, or discussing any Bioeel project:
1. **Sidebar Navigation:** Use a modern collapsible sidebar layout with clear section icons.
2. **Interactive Data Tables:** All data tables must be sortable (column header clicks with indicators), filterable (instant text search + status chips/filters), and paginated.
3. **Romanian Business Vocabulary:** All UI labels, headers, action buttons, table columns, and notifications must be in natural Romanian business terminology (e.g., â€žPanou principalâ€, â€žAprobare cereriâ€, â€žUtilizatoriâ€, â€žStocuriâ€, â€žTrimite solicitareaâ€), avoiding raw English acronyms.
4. **White Skin / Black Theme (TemÄƒ LuminoasÄƒ / ÃŽntunecatÄƒ):**
   - **White Skin (Standard Principal):** Fundal curat alb/luminos (`bg-white` / `#f8fafc`), text Ã®nchis cu lizibilitate maximÄƒ (`#1e293b` / `slate-900`), carduri albe cu borduri subtile (`border-slate-200`) È™i accente Bioeel (smarald `#10b981` / `#059669`).
   - **Black Theme (Mod ÃŽntunecat):** Fundal negru profund (`bg-black`), text gri odihnitor (`#94a3b8` / `slate-400`), borduri discrete (`border-slate-800`), cu tranziÈ›ie linÄƒ (`transition: background-color 0.3s, color 0.3s`).
5. **AI Data Governance:** Never send sensitive, confidential, financial, or personal (GDPR/medical) data to unapproved public AI tools. Maintain human-in-the-loop oversight.
6. **IgienÄƒ Anti-Bloat & Cod Minimal (Principiul Dijkstra):**
   - **Simplitate Ã®nainte de toate:** EvitaÈ›i abstractizÄƒrile premature È™i codul stufos (*bloated*); scrieÈ›i doar codul strict necesar soluÈ›iei.
   - **Eliminarea codului mort (`knip`):** VerificaÈ›i È™i eliminaÈ›i componentele orfane, exporturile neapelate È™i pachetele parazite din `package.json` (ex: drivere de baze de date sau unelte nefolosite).
   - **Combaterea duplicÄƒrii (`jscpd`):** Este interzis copy-paste-ul de logicÄƒ Ã®ntre fiÈ™iere; unificaÈ›i logica comunÄƒ Ã®n hook-uri sau funcÈ›ii utilitare unice.
   - **CurÄƒÈ›enia depozitului:** Nu lÄƒsaÈ›i scripturi de cercetare temporarÄƒ (`tmp_*`, `scratch_*`, `test_*.cjs`) amestecate Ã®n directoarele de producÈ›ie.

*(NotÄƒ: Matricea de roluri `PM_ADMIN`, `PM_SPONSOR`, etc. se aplicÄƒ specific doar fluxurilor de Management de Proiect È™i Aprobare AplicaÈ›ii, nu tuturor proiectelor Bioeel. Fiecare aplicaÈ›ie Ã®È™i foloseÈ™te rolurile specifice domeniului sÄƒu, ex: Casier, Farmacist, Gestionar).*

