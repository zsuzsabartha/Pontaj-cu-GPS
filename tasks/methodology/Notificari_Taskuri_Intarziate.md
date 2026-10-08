# ⏰ Automatizare: Alerte E-mail Sarcini Întârziate & Atenționări Scadențe

Da, este absolut posibil și foarte util! Putem construi o automatizare (un **Cron Job** sau **Declanșator Zilnic**) care rulează singur în fiecare dimineață (de exemplu la ora 08:00 AM), verifică termenele limită și trimite e-mail-uri automate.

Aplicația poate funcționa în două moduri simultan:
1. **Mesaj individual pentru Responsabili:** Fiecare membru al echipei primește un e-mail consolidat cu sarcinile lui care expiră în curând (în 48h) sau sunt deja întârziate.
2. **Raport general pentru Manager:** Tu, în calitate de manager de proiect, primești o listă centralizată cu toate sarcinile întârziate din proiect, pentru a ști unde sunt blocajele.

---

## 🛠️ Implementarea în Google Apps Script (Gratuit & Rapid)

Dacă folosiți Google Sheets pentru managementul proiectului, adăugați codul de mai jos în editorul Apps Script. Acesta va grupa automat sarcinile per utilizator pentru a evita trimiterea de e-mail-uri multiple (spam).

### Pasul 1: Codul Complet pentru Alerte Zilnice
Lipiți acest cod în Apps Script:

```javascript
function checkDeadlinesAndSendEmails() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  var today = new Date();
  today.setHours(0, 0, 0, 0); // Resetăm timpul la miezul nopții pentru comparare corectă
  
  var warningPeriodMs = 2 * 24 * 60 * 60 * 1000; // 2 Zile în milisecunde pentru atenționări
  
  // Obiect în care grupăm sarcinile per e-mail responsabil: { "email@test.com": { overdue: [], upcoming: [] } }
  var notifications = {};
  var managerReport = []; // Raportul general pentru manager

  // Parcurgem rândurile (sărim peste rândul 0 de antet)
  for (var i = 1; i < data.length; i++) {
    var id = data[i][0];
    var taskName = data[i][1];
    var email = data[i][2] ? data[i][2].toString().trim().toLowerCase() : "";
    var dueDateValue = data[i][3];
    var status = data[i][4];
    
    // Sărim peste sarcinile finalizate sau fără dată limită
    if (status === "Realizat" || !dueDateValue || !email) continue;
    
    var dueDate = new Date(dueDateValue);
    dueDate.setHours(0,0,0,0);
    
    var diffTime = dueDate.getTime() - today.getTime();
    
    // Inițializăm structura pentru responsabilul curent dacă nu există
    if (!notifications[email]) {
      notifications[email] = { overdue: [], upcoming: [] };
    }
    
    var taskDetails = "**[" + id + "] " + taskName + "** (Scadență: " + Utilities.formatDate(dueDate, "GMT+2", "dd-MM-yyyy") + ")";

    // Cazul 1: Sarcina este întârziată (Data limită a trecut de azi)
    if (diffTime < 0) {
      notifications[email].overdue.push(taskDetails);
      managerReport.push(taskDetails + " — Responsabil: " + email);
    } 
    // Cazul 2: Sarcina expiră în următoarele 2 zile (48 de ore)
    else if (diffTime <= warningPeriodMs) {
      notifications[email].upcoming.push(taskDetails);
    }
  }

  // Trimitem e-mail-urile individuale către responsabili
  for (var recipient in notifications) {
    var overdueList = notifications[recipient].overdue;
    var upcomingList = notifications[recipient].upcoming;
    
    if (overdueList.length === 0 && upcomingList.length === 0) continue;
    
    var subject = "⚠️ Atenționare Sarcini Proiect (Alerte / Scadențe)";
    
    var htmlBody = "<h3>Salut,</h3>" +
                   "<p>Acesta este un mesaj automat cu starea sarcinilor tale în cadrul proiectului:</p>";
                   
    if (overdueList.length > 0) {
      htmlBody += "<h4 style='color:red;'>🚨 SARCINI ÎNTÂRZIATE (Termen depășit):</h4><ul>";
      for (var j = 0; j < overdueList.length; j++) {
        htmlBody += "<li>" + overdueList[j] + "</li>";
      }
      htmlBody += "</ul>";
    }
    
    if (upcomingList.length > 0) {
      htmlBody += "<h4 style='color:orange;'>⏳ SCADENȚE ÎN URMĂTOARELE 48 DE ORE:</h4><ul>";
      for (var k = 0; k < upcomingList.length; k++) {
        htmlBody += "<li>" + upcomingList[k] + "</li>";
      }
      htmlBody += "</ul>";
    }
    
    htmlBody += "<p>Te rugăm să actualizezi statusul lor în tabelul partajat după finalizare.</p>" +
                "<p>O zi bună,<br>Sistemul de Monitorizare Bioeel</p>";
                
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
    console.log("E-mail trimis la responsabilul: " + recipient);
  }

  // Trimitem raportul centralizat către Managerul de Proiect (TINE)
  if (managerReport.length > 0) {
    var managerEmail = "manager@bioeel.ro"; // ⚠️ Înlocuiți cu adresa dvs. de e-mail!
    
    var managerSubject = "📊 Raport Zilnic: Sarcini Întârziate în Proiect";
    var managerHtml = "<h3>Salut,</h3>" +
                      "<p>Iată lista sarcinilor nefinalizate care au depășit termenul limită în proiect:</p><ul>";
                      
    for (var m = 0; m < managerReport.length; m++) {
      managerHtml += "<li style='color:red;'>" + managerReport[m] + "</li>";
    }
    managerHtml += "</ul><p>Sistemul de Monitorizare Bioeel</p>";
    
    MailApp.sendEmail({
      to: managerEmail,
      subject: managerSubject,
      htmlBody: managerHtml
    });
    console.log("Raport trimis către manager: " + managerEmail);
  }
}
```

### Pasul 2: Setați declanșatorul zilnic (Trigger-ul)
Pentru ca scriptul să verifice automat datele în fiecare dimineață:
1. În ecranul Apps Script, dați click pe pictograma ceas (**Triggers**) din stânga.
2. Dați click pe **+ Add Trigger**.
3. Selectați funcția: `checkDeadlinesAndSendEmails`.
4. Setați sursa evenimentului: **Time-driven** (În funcție de timp).
5. Tipul declanșatorului: **Day timer** (Zilnic).
6. Selectați intervalul orar: **8am to 9am** (sau ora dorită).
7. Dați click pe **Save**.

Gata! În fiecare dimineață, la ora 8:00, sistemul va lucra ca un asistent personal, trimițând alerte separate fiecărui membru din echipă și un raport complet către dvs.
