# 📖 Tutorial Pas cu Pas: Cum se gestionează un Proiect General/Cultural

Acest tutorial vă va ghida prin procesul practic de planificare, execuție și finalizare a unui proiect non-software (cultural sau eveniment), folosind metodologia hibridă. 

Pentru acest exercițiu, vom folosi ca studiu de caz organizarea unui **Concert de Muzică Clasică în aer liber (Bioeel Classic Fest)**.

---

## 🏁 Pasul 1: Inițierea & Definirea Obiectivelor (Săptămâna 1)
Înainte de a scrie task-uri, trebuie să definiți exact ce faceți. Creați un document numit `1_initiere.md` care să conțină:

1. **Obiectivul SMART:** Organizarea unui concert de muzică clasică cu 3 artiști, în Parcul Central, în data de 15 Octombrie, pentru un public de minimum 500 de spectatori.
2. **Echipa de Proiect (Roluri):**
   * **Manager Proiect (Tu):** Coordonează tot, monitorizează termenele limită și bugetul.
   * **Responsabil Artistic:** Relația cu artiștii, programul muzical, repetițiile.
   * **Responsabil Logistică:** Echipament tehnic, scenă, autorizații primărie, scaune.
   * **Responsabil PR/Marketing:** Promovare, afișe, relații cu presa, invitați VIP.

---

## 📍 Pasul 2: Stabilirea Jaloanelor Directoare (Milestones) (Săptămâna 2)
Jaloanele sunt termenele de check-in majore. Ele nu au o durată, ci reprezintă o stare atinsă. Adăugați-le în fișierul de task-uri:

* 📅 **M1: 15 Septembrie** — Autorizația de la Primărie obținută și artiștii contractați.
* 📅 **M2: 25 Septembrie** — Campania de promovare lansată și afișele tipărite.
* 📅 **M3: 10 Octombrie** — Probele tehnice de sunet și lumini contractate, logistica finalizată.
* 📅 **M4: 15 Octombrie** — **Ziua Evenimentului (Ora 18:00 - Concertul)**.
* 📅 **M5: 30 Octombrie** — Toate plățile către artiști/furnizori efectuate și raportul final depus.

---

## 🧩 Pasul 3: Defalcarea Sarciniilor (WBS) (Săptămâna 3)
Împreună cu echipa, spargeți proiectul pe categorii (WBS). Creați coduri unice pentru task-uri:

* **Logistcă (`LOG`):**
  * `LOG-01`: Închiriere scenă, sistem de sunet și lumini.
  * `LOG-02`: Obținere aviz de la primărie și poliție locală.
  * `LOG-03`: Închiriere 500 de scaune pentru spectatori.
* **Artistic (`ART`):**
  * `ART-01`: Contractare orchestră și dirijor.
  * `ART-02`: Stabilire listă de piese (repertoriu) și program repetiții.
* **PR / Marketing (`MKT`):**
  * `MKT-01`: Design grafic afiș și broșură program.
  * `MKT-02`: Promovare campanie pe Facebook și Instagram.
  * `MKT-03`: Trimitere invitații VIP și comunicat de presă.

---

## 📋 Pasul 4: Gestionarea zilnică a activităților (Kanban-ul) (Săptămânile 4 - 7)
Creați fișierul `2_sarcini_active.md`. În fiecare zi sau de două ori pe săptămână, faceți o ședință scurtă de 15 minute cu echipa și mutați task-urile în funcție de progres.

### Cum arată Kanban-ul la mijlocul proiectului (Exemplu):
```markdown
### 📝 De Făcut (To Do)
- [ ] **LOG-03**: Închiriere 500 de scaune — *Resp: Andrei (Logistică)* — *Due: 08 Octombrie*
- [ ] **MKT-03**: Trimitere invitații VIP — *Resp: Ioana (PR)* — *Due: 10 Octombrie*

### ⏳ În Curs (In Progress)
- [ ] **LOG-01**: Negociere ofertă tehnică sunet/scenă — *Resp: Andrei (Logistică)* — *Due: 20 Septembrie*
- [ ] **MKT-02**: Rulare campanie Facebook Ads — *Resp: Ioana (PR)* — *Due: Activează din 25 Septembrie*

### 🔍 În Așteptare (Blocked)
- [ ] **LOG-02**: Aprobare aviz primărie — *Resp: Andrei* — *Status: Cererea este depusă, așteptăm comisia de avizare.*

### ✅ Realizat (Done)
- [x] **ART-01**: Semnarea contractelor cu orchestra — *Finalizat la 10 Septembrie*
- [x] **MKT-01**: Design afiș realizat de designer — *Finalizat la 12 Septembrie*
```

---

## ⚡ Pasul 5: Ziua Evenimentului (Execuția) (15 Octombrie)
În ziua Z, nu se mai folosește Kanban-ul. Se folosește un **Orar de Desfășurare pe Ore (Minute-by-Minute Cue Sheet)**, care se printează și se împarte echipei:

* **08:00 - 12:00:** Montare scenă, sunet și lumini.
* **12:00 - 14:00:** Aranjare scaune spectatori și delimitare zonă.
* **14:30 - 16:30:** Sosește orchestra. Proba de sunet (Soundcheck).
* **17:00:** Accesul publicului în zonă. Muzică ambientală.
* **18:00 - 20:00:** **Desfășurarea Concertului** (Partea I: 45 min, Pauză: 15 min, Partea II: 60 min).
* **20:00 - 22:00:** Strângerea instrumentelor, demontarea scenei și curățenia în zonă.

---

## 🏁 Pasul 6: Închiderea Proiectului (Post-Eveniment) (16 - 30 Octombrie)
După succesul evenimentului, urmează faza administrativă:

1. **Plăți:** Achitarea facturilor finale către furnizori și a onorariilor artiștilor.
2. **Deconturi:** Strângerea tuturor chitanțelor și facturilor pentru contabilitate.
3. **Raport final:** Scrierea unui scurt document cu:
   * Numărul estimat de participanți.
   * Ce a mers foarte bine (ex: *„Sunetul a fost excepțional”*).
   * Ce putem îmbunătăți data viitoare (ex: *„Trebuia să începem campania de marketing cu o săptămână mai devreme”*).
