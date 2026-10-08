# 📝 Cum poate un utilizator să marcheze o sarcină ca rezolvată?

În funcție de profilul echipei dvs. (tehnică sau non-tehnică) și de instrumentele pe care le folosiți, există trei metode principale prin care un utilizator poate marca o sarcină ca finalizată:

---

## 🟢 Metoda 1: Direct în Google Sheets (Dropdown pe Telefon/PC) — *Recomandat pentru echipe non-tehnice*

Aceasta este cea mai simplă metodă. Membrii echipei deschid Excel-ul partajat direct pe telefon sau pe calculator.

### Cum funcționează:
1. În coloana **Status** (Coloana E), configurați o validare de date cu opțiuni de tip listă (dropdown): `De făcut`, `În curs`, `Realizat`.
2. Când termină sarcina, utilizatorul deschide fișierul de pe telefon și schimbă statusul în **`Realizat`**.
3. **Ce se întâmplă în fundal (Automatizare):**
   * Scriptul de calendar rulează, detectează că statusul este *Realizat*, **șterge automat alerta** din Google Calendarul echipei (ca să nu mai primească e-mail-uri de atenționare) și scrie *FINALIZAT* în coloana de control.

---

## ✉️ Metoda 2: Butoane interactive direct în E-mail sau MS Teams — *Cel mai confortabil*

Utilizatorul primește e-mailul de atenționare zilnică sau notificarea pe Teams și rezolvă sarcina cu **un singur click direct din mesaj**, fără a mai deschide tabelul sau fișierele.

### Cum funcționează:
1. În e-mail-ul primit de utilizator, pe lângă detalii, adăugăm un buton/link interactiv:
   > `[Marchează ca finalizat: LOG-03]`
2. **Ce se întâmplă în fundal (Automatizare):**
   * Link-ul este o legătură către o funcție web de tip **Google Apps Script Web App** (o mini-pagină web care rulează în fundal).
   * Când utilizatorul dă click, Apps Script primește ID-ul sarcinii, deschide tabelul, caută rândul cu sarcina `LOG-03`, îi schimbă statusul în *Realizat* și afișează un mesaj pe ecran: *„Sarcina LOG-03 a fost marcată ca realizată cu succes! Mulțumim!”*.

---

## 💻 Metoda 3: Editare directă în fișierul Markdown (VS Code / Git) — *Pentru echipa tehnică*

Dacă utilizatorul lucrează în VS Code (cum ar fi programatorii sau coordonatorii care au acces la cod).

### Cum funcționează:
1. Deschide fișierul [current_sprint.md](file:///c:/Projects/PontajSmart/tasks/current_sprint.md) în editorul de text.
2. Caută sarcina sa și înlocuiește spațiul gol din paranteze cu caracterul **`x`**:
   * De la: `- [ ] **LOG-03**: Închiriere 500 scaune...`
   * La: `- [x] **LOG-03**: Închiriere 500 scaune...`
3. Salvează fișierul (`Ctrl + S`) și face commit/push în Git.
