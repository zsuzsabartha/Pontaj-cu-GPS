# 💬 Automatizarea Notificărilor pe WhatsApp

WhatsApp este cea mai utilizată aplicație de mesagerie, fiind ideală pentru trimiterea alertelor direct pe telefoanele echipei. Totuși, deoarece Meta (compania mamă) protejează rețeaua împotriva spam-ului, automatizarea pe WhatsApp este puțin diferită față de Telegram sau Teams.

Există două moduri principale de a trimite mesaje automate pe WhatsApp:

1. **Green API (Serviciu Cloud - Cel mai simplu):** Îți permite să conectezi un cont de WhatsApp scanând un QR code (ca la WhatsApp Web) și să trimiți mesaje prin apeluri HTTP simple.
2. **`whatsapp-web.js` (Librărie Node.js - 100% Gratuit):** Un script care rulează direct pe serverul tău (`be-apl01`), deschide un WhatsApp Web invizibil în fundal și trimite mesaje.

---

## 🟢 Opțiunea A: Green API (Recomandat pentru Google Sheets / Cloud)

**Green API** (green-api.com) oferă o metodă simplă de a trimite mesaje. Ei oferă un plan gratuit (Developer Plan) cu limitări de mesaje, sau planuri ieftine de producție.

### Cum funcționează:
1. Creați un cont pe [green-api.com](https://green-api.com/).
2. În consola lor, veți primi un **`IdInstance`** (ex: `1101123456`) și un **`ApiTokenInstance`** (ex: `d78b273b4...`).
3. Scanați codul QR afișat în consola lor cu telefonul dvs. (din meniul *Dispozitive asociate / Linked devices* în WhatsApp).
4. Trimiteți mesaje folosind codul de mai jos (Google Apps Script):

```javascript
function sendWhatsAppGreenAPI(phoneNumber, taskName, assignee, status) {
  var idInstance = "ID_UL_TĂU_DE_INSTANȚĂ";
  var apiToken = "TOKEN_UL_TĂU_API";
  
  // Formatăm numărul de telefon cu prefix de țară (ex: 40722123456 pentru România)
  // Eliminăm spațiile sau caracterele speciale dacă există
  var formattedNumber = phoneNumber.replace(/[^0-9]/g, "") + "@c.us"; 
  
  var message = "📢 *Actualizare Proiect: Bioeel Classic Fest*\n\n" +
                "Sarcina *" + taskName + "* alocată lui *" + assignee + "* " +
                "este acum în starea *" + status.toUpperCase() + "*! 🚀";

  var url = "https://api.green-api.com/waInstance" + idInstance + "/sendMessage/" + apiToken;
  
  var payload = {
    "chatId": formattedNumber,
    "message": message
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(url, options);
}
```

---

## 🤖 Opțiunea B: `whatsapp-web.js` (Gratuit, rulează local în Node.js)

Dacă doriți ca serverul local al aplicației de Pontaj (`bridge/server.js` pe serverul `be-apl01`) să trimită mesaje direct pe WhatsApp fără a plăti niciun serviciu cloud, puteți integra librăria **`whatsapp-web.js`**.

### Pasul B.1: Instalarea în proiectul Node
În folderul `bridge`, rulați:
```bash
npm install whatsapp-web.js qrcode-terminal
```

### Pasul B.2: Integrarea în codul serverului (`server.js`)
Lipiți acest cod în serverul dvs. Node.js:

```javascript
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Inițializăm clientul WhatsApp cu salvarea sesiunii locale (nu trebuie scanat codul de fiecare dată)
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './wa_session' }),
    puppeteer: {
        args: ['--no-sandbox'],
    }
});

// Afișează codul QR în terminal la pornire (trebuie scanat doar prima dată)
client.on('qr', (qr) => {
    console.log('Scanați codul QR de mai jos cu telefonul pentru a conecta WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Web Client este gata și conectat! ✅');
});

client.initialize();

// Funcție pe care o puteți apela de oriunde în backend
export async function sendWhatsAppMessage(targetNumber, message) {
    try {
        // Formatare număr (România: prefix 40)
        let formattedNumber = targetNumber.replace(/[^0-9]/g, "");
        if (!formattedNumber.startsWith("40")) {
            formattedNumber = "40" + formattedNumber;
        }
        
        const chatId = formattedNumber + "@c.us";
        await client.sendMessage(chatId, message);
        console.log(`Mesaj trimis pe WhatsApp către ${targetNumber}`);
    } catch (error) {
        console.error("Eroare la trimiterea mesajului pe WhatsApp:", error);
    }
}
```

### Cum se utilizează:
Când reporniți serverul prin `start_pontaj.bat`, în consolă va apărea un cod QR din caractere text. Îl scanați o singură dată cu opțiunea *Linked Devices* din WhatsApp. Serverul va memora sesiunea în folderul `./wa_session` și va putea trimite mesaje oricând doriți!
