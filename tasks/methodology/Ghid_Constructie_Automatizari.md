# 🛠️ Ghid de Implementare: Cum Construim Automatizările

Acest ghid tehnic conține pașii, tehnologiile și **codul sursă complet** pentru a construi două dintre cele mai utile automatizări pentru proiecte generale/culturale:
1. **Sincronizarea automată din Google Sheets (Excel) în Google Calendar** (folosind Google Apps Script).
2. **Trimiterea de notificări automate pe Microsoft Teams** (folosind Incoming Webhooks).

Ambele soluții sunt **gratuite**, nu necesită instalarea de servere și pot fi implementate în mai puțin de 15 minute.

---

## 🚀 Automatizarea 1: Google Sheets ➡️ Google Calendar (Apps Script)

Această automatizare citește un tabel din Google Sheets unde echipa își notează sarcinile și le adaugă automat în Google Calendar.

### Pasul 1.1: Structura Tabelului în Google Sheets
Creați un tabel în Google Sheets cu următoarele coloane (pe primul rând):
* A: `ID` (ex: LOG-01)
* B: `Sarcina` (ex: Inchiriat scaune)
* C: `Responsabil` (ex: andrei@bioeel.ro)
* D: `Termen Limita` (ex: 2026-10-05)
* E: `Status` (ex: De facut, In curs, Realizat)
* F: `Calendar Event ID` (lăsați goală - va fi completată automat de script)

### Pasul 1.2: Adăugarea Codului Apps Script
1. În Google Sheets, dați click pe **Extensions (Extensii)** ➡️ **Apps Script**.
2. Ștergeți tot codul existent și lipiți codul de mai jos:

```javascript
// Rulează această funcție pentru a sincroniza sarcinile în Calendar
function syncTasksToCalendar() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  // Înlocuiți cu ID-ul calendarului vostru sau lăsați 'primary' pentru cel implicit
  var calendar = CalendarApp.getDefaultCalendar(); 
  
  // Parcurgem rândurile (sărim peste capul de tabel, adică rândul 0)
  for (var i = 1; i < data.length; i++) {
    var id = data[i][0];
    var taskName = data[i][1];
    var assignee = data[i][2];
    var dueDate = data[i][3];
    var status = data[i][4];
    var eventId = data[i][5]; // Coloana F (Index 5)
    
    // Validăm dacă avem data limită și sarcina
    if (!dueDate || !taskName) continue;
    
    var eventTitle = "[" + id + "] " + taskName + " — Resp: " + assignee;
    
    // Dacă evenimentul nu a fost creat în calendar încă și sarcina nu este "Realizat"
    if (!eventId && status !== "Realizat") {
      // Creăm eveniment de tip All-Day în calendar
      var newEvent = calendar.createAllDayEvent(eventTitle, new Date(dueDate), {
        description: "Status curent: " + status + "\nResponsabil: " + assignee
      });
      
      // Salvăm ID-ul evenimentului în coloana F pentru a nu-l duplica data viitoare
      sheet.getRange(i + 1, 6).setValue(newEvent.getId());
      console.log("Creat eveniment nou pentru: " + id);
    } 
    // Dacă evenimentul există deja în calendar, dar sarcina a fost finalizată ("Realizat")
    else if (eventId && status === "Realizat") {
      try {
        var existingEvent = calendar.getEventById(eventId);
        if (existingEvent) {
          existingEvent.deleteEvent(); // Îl ștergem din calendar pentru că e gata
          sheet.getRange(i + 1, 6).setValue("FINALIZAT");
          console.log("Șters eveniment (sarcina finalizată): " + id);
        }
      } catch (e) {
        console.error("Nu s-a putut șterge evenimentul pentru: " + id);
      }
    }
  }
}
```

### Pasul 1.3: Activarea Rulării Automate
Pentru ca scriptul să ruleze singur în fiecare oră sau în fiecare zi:
1. În ecranul Apps Script, dați click pe pictograma ceas (**Triggers / Declanșatori**) din meniul stâng.
2. Dați click pe **+ Add Trigger (+ Adăugați declanșator)**.
3. Selectați funcția: `syncTasksToCalendar`.
4. Selectați sursa: **Time-driven (În funcție de timp)**.
5. Setați frecvența (ex: **Day timer / Zilnic** sau **Hour timer / La fiecare oră**).
6. Dați click pe **Save** (vă va cere să acordați permisiuni pentru Calendar).

---

## 📬 Automatizarea 2: Notificări Automate pe MS Teams (Webhooks)

Această metodă trimite o notificare frumoasă pe canalul de chat MS Teams de fiecare dată când se întâmplă ceva important (ex: s-a finalizat un jalon).

### Pasul 2.1: Obținerea URL-ului Webhook din MS Teams
1. Deschideți **Microsoft Teams** și mergeți la canalul unde doriți notificările.
2. Dați click pe cele 3 puncte `...` din dreptul canalului și selectați **Connectors (Conectori)** sau **Manage Channel (Gestionați canalul)** ➡️ **Connectors**.
3. Căutați **Incoming Webhook** și dați click pe **Configure (Configurați)**.
4. Puneți un nume botului (ex: `Bioeel Project Bot`), opțional o poză, și dați click pe **Create**.
5. **Copiați URL-ul unic** generat (arată ca `https://bioeel.webhook.office.com/webhookb2/...`). Păstrați-l secret.

### Pasul 2.2: Codul pentru trimiterea notificării (Node.js sau Google Apps Script)

#### Opțiunea A: Trimitere din Google Apps Script (Direct din Excelul online)
Adăugați această funcție în editorul Apps Script de la Pasul 1 pentru a trimite mesaje pe Teams:

```javascript
function sendTeamsNotification(taskName, assignee, status) {
  var webhookUrl = "AICI_LIPIȚI_URL_UL_TEAMS_WEBHOOK";
  
  // Formatul JSON cerut de Microsoft Teams pentru Message Cards
  var payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": status === "Realizat" ? "00953B" : "FF8C00", // Verde pentru succes, Portocaliu altfel
    "summary": "Actualizare Proiect",
    "sections": [{
      "activityTitle": "📢 Sarcina a fost actualizata!",
      "activitySubtitle": "Proiect: Bioeel Classic Fest",
      "facts": [
        { "name": "Sarcina:", "value": taskName },
        { "name": "Responsabil:", "value": assignee },
        { "name": "Status nou:", "value": "**" + status.toUpperCase() + "**" }
      ],
      "markdown": true
    }]
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(webhookUrl, options);
}
```

#### Opțiunea B: Trimitere din Node.js backend (în `bridge/server.js`)
Dacă doriți ca serverul dvs. local să anunțe pe Teams când cineva își validează pontajul sau când se face un manual sync:

```javascript
import fetch from 'node-fetch';

async function notifyTeams(messageText) {
    const webhookUrl = 'URL_TEAMS_WEBHOOK';
    const payload = {
        text: messageText
    };
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("Teams notification sent.");
    } catch (e) {
        console.error("Failed to notify Teams:", e);
    }
}
```
