# 🛡️ Protocol de Guvernanță & Management de Proiect PontajSmart

> **REGULA DE AUR PENTRU LUCRUL CU ASISTENTUL AI:**
> **FĂRĂ PROMPTING ÎN ORB.** Nicio cerință, modificare de fișier, cod sau intervenție nu se execută fără respectarea metodologiei și a porților de calitate.

---

## 🧭 Ciclul Obligatoriu de Dezvoltare & Validare

La fiecare modificare adusă codului, asistentul AI va respecta următorul flux standardizat:

### 1. 📌 Identificare Obiectiv & Scope
* Verificarea impactului asupra componentelor React și a serverului de sincronizare `bridge/server.js`.

### 2. 🛠️ Execuția Controlată
* Editare minimă, modulară și sigură.
* Asigurarea că prefixul de producție `/pontaj/` este respectat atât în frontend cât și în backend.

### 3. 🏁 Închidere & Definition of Done (DoD)
* **Validare Dublă Obligatorie:**
  1. Compilare statică: `npm run build` (fără erori TypeScript / bundling).
  2. Test de Runtime & MIME: `npm test` (probe automate HTTP pentru assets JS, MIME types corecte `text/javascript`, rutare transparentă `/pontaj/api` și API-uri active).
* Commit Git aferent modificării (`feat(...)`, `fix(...)`, `docs(...)`).
