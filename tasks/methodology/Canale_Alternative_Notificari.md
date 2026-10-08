# ✉️ Canale Alternative de Notificare (Fără Teams)

Dacă echipa dvs. nu folosește Microsoft Teams, puteți trimite notificările automate pe alte canale de comunicare universale sau gratuite. Cele mai eficiente trei alternative sunt:

1. **E-mail automat (SMTP / Google Mail)** — Funcționează pentru oricine și este 100% gratuit.
2. **Discord Webhooks** — O platformă de chat gratuită, foarte populară, excelentă pentru echipe.
3. **Telegram Bot** — Cel mai simplu și rapid mod de a trimite mesaje pe telefoanele echipei.

---

## 📧 Alternativa A: E-mail Automat (Prin Google Apps Script)

Dacă folosiți Google Sheets pentru tabelul de sarcini, puteți trimite e-mail-uri automate echipei folosind serverele Google, cu o singură linie de cod.

### Codul Apps Script pentru trimitere e-mail:
Adăugați acest cod în editorul dvs. Apps Script pentru a trimite un e-mail când un task se modifică:

```javascript
function sendEmailNotification(taskName, assigneeEmail, status) {
  // Verificăm dacă avem o adresă de e-mail validă
  if (!assigneeEmail || !assigneeEmail.includes("@")) return;

  var subject = "⚠️ Actualizare Sarcina: " + taskName;
  
  var body = "Salut,\n\n" +
             "Sarcina ta a fost actualizată în panoul de proiect:\n" +
             "• Sarcina: " + taskName + "\n" +
             "• Status Nou: " + status.toUpperCase() + "\n\n" +
             "O zi bună,\n" +
             "Sistemul Automat Bioeel Classic Fest";

  // Trimite e-mail-ul folosind contul tău de Google
  MailApp.sendEmail(assigneeEmail, subject, body);
  console.log("E-mail trimis către: " + assigneeEmail);
}
```

---

## 💬 Alternativa B: Discord Webhooks (Extrem de Simplu)

Discord este gratuit și folosește un sistem de webhooks aproape identic cu cel din Teams, dar mult mai simplu de configurat.

### Pasul B.1: Obținerea Webhook-ului în Discord
1. Pe serverul dvs. de Discord, dați click dreapta pe canalul unde vreți notificări și selectați **Edit Channel (Editează canalul)**.
2. Mergeți la **Integrations (Integrări)** ➡️ **Webhooks** ➡️ **Create Webhook**.
3. Copiați URL-ul webhook-ului (arată ca `https://discord.com/api/webhooks/...`).

### Pasul B.2: Codul pentru Discord (Apps Script sau Node.js)
Trimiteți un mesaj simplu pe Discord apelând URL-ul:

```javascript
function sendDiscordNotification(taskName, assignee, status) {
  var webhookUrl = "AICI_LIPIȚI_URL_UL_DISCORD_WEBHOOK";
  
  var messageContent = "📢 **Actualizare Proiect:** Sarcina **" + taskName + 
                       "** alocată lui **" + assignee + 
                       "** este acum în starea **" + status.toUpperCase() + "**! 🚀";

  var payload = {
    "content": messageContent
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(webhookUrl, options);
}
```

---

## 📱 Alternativa C: Telegram Bot (Notificări pe Telefon)

Telegram este ideal pentru a primi alerte direct pe telefonul mobil, printr-un bot pe care îl creați în 2 minute.

### Pasul C.1: Crearea Bot-ului de Telegram
1. Deshideți Telegram, căutați utilizatorul **`@BotFather`** și trimiteți mesajul `/newbot`.
2. Urmați instrucțiunile pentru a-i da un nume și un username.
3. BotFather vă va oferi un **Token de acces API** (ex: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
4. Căutați botul dvs. proaspăt creat în Telegram și dați click pe **Start** (pentru a-i permite să vă trimită mesaje).
5. Pentru a afla ID-ul dvs. de chat (Chat ID), căutați utilizatorul `@userinfobot` în Telegram și dați-i start. Acesta vă va returna ID-ul dvs. numeric (ex: `987654321`).

### Pasul C.2: Codul pentru Telegram (Apps Script sau Node.js)
Trimiteți notificarea printr-un simplu apel HTTP:

```javascript
function sendTelegramNotification(taskName, assignee, status) {
  var botToken = "TOKEN_UL_TĂU_DE_LA_BOTFATHER";
  var chatId = "ID_UL_TĂU_DE_CHAT"; // Poate fi ID-ul tău sau ID-ul unui grup de Telegram
  
  var message = "📢 *Actualizare Proiect*\n\n" +
                "• Sarcina: *" + taskName + "*\n" +
                "• Responsabil: " + assignee + "\n" +
                "• Status nou: *" + status.toUpperCase() + "*";
                
  var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
  
  var payload = {
    "chat_id": chatId,
    "text": message,
    "parse_mode": "Markdown" // Permite text bold/italic
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(url, options);
}
```
