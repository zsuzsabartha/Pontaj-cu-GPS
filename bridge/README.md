# Pontaj API Bridge - Instalare

Acesta este serverul backend (Node.js) care face legătura între aplicația React și Microsoft SQL Server.

## 1. Instalare
1. Asigură-te că ai **Node.js** instalat.
2. Deschide un terminal în acest folder.
3. Rulează comanda:
   ```bash
   npm install
   ```

## 2. Configurare
Verifică fișierul `.env` pentru a te asigura că datele de conectare la SQL Server sunt corecte:
- Server: be-sql01
- User: PontajAppUser
- Database: PontajSmart

## 3. Pornire Server
Rulează comanda:
```bash
node server.js
```

Serverul va porni pe portul 3001.
