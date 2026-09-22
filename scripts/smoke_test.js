// scripts/smoke_test.js
// Automated Runtime & MIME Smoke Test for Bioeel PontajSmart (Child Process Isolation)
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function runSmokeTest() {
  console.log('🔍 [1/4] Verificare integritate build PontajSmart (dist/)...');
  if (!fs.existsSync(distDir)) {
    console.error('❌ Directorul dist/ lipsește. Rulați "npm run build" înainte de test.');
    process.exit(1);
  }

  const assetsDir = path.join(distDir, 'assets');
  const assetFiles = fs.readdirSync(assetsDir);
  const jsBundle = assetFiles.find(f => f.endsWith('.js'));
  const cssBundle = assetFiles.find(f => f.endsWith('.css'));

  if (!jsBundle) {
    console.error('❌ Nu s-a găsit niciun bundle JS în dist/assets/.');
    process.exit(1);
  }
  console.log(`   ✓ Bundle JS identificat: ${jsBundle}`);
  console.log(`   ✓ Bundle CSS identificat: ${cssBundle || 'none'}`);

  console.log('🚀 [2/4] Pornire proces server Pontaj pe port temporar 3998...');
  const serverProcess = spawn('node', ['bridge/server.js'], {
    cwd: rootDir,
    env: { ...process.env, PORT: '3998' },
    stdio: ['ignore', 'ignore', 'ignore']
  });

  const killServer = () => {
    try {
      if (serverProcess && serverProcess.pid) {
        // Windows forceful tree kill
        spawn('taskkill', ['/F', '/T', '/PID', serverProcess.pid.toString()]);
      }
    } catch (_) {}
  };

  // Wait for server to start responding
  let serverReady = false;
  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    try {
      const ping = await fetch('http://localhost:3998/api/v1/ping');
      if (ping.status === 200) {
        serverReady = true;
        break;
      }
    } catch (_) {
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!serverReady) {
    console.error('❌ Serverul Pontaj nu a răspuns în 10 secunde.');
    killServer();
    process.exit(1);
  }

  console.log('🧪 [3/4] Rulare probe HTTP & verificare MIME Types...');
  const baseUrl = 'http://localhost:3998';
  const tests = [
    {
      name: 'Rădăcină SPA (/)',
      url: `${baseUrl}/`,
      expectedStatus: 200,
      expectedContentType: 'text/html'
    },
    {
      name: 'Prefix Producție SPA (/pontaj/)',
      url: `${baseUrl}/pontaj/`,
      expectedStatus: 200,
      expectedContentType: 'text/html'
    },
    {
      name: `Strict JS MIME Check (/pontaj/assets/${jsBundle})`,
      url: `${baseUrl}/pontaj/assets/${jsBundle}`,
      expectedStatus: 200,
      expectedContentType: 'javascript'
    },
    {
      name: 'API Ping Test (/api/v1/ping)',
      url: `${baseUrl}/api/v1/ping`,
      expectedStatus: 200,
      expectedContentType: 'application/json',
      validateBody: (data) => data.status === 'PONG'
    },
    {
      name: 'API Rutare Transparentă /pontaj/api (/pontaj/api/v1/ping)',
      url: `${baseUrl}/pontaj/api/v1/ping`,
      expectedStatus: 200,
      expectedContentType: 'application/json',
      validateBody: (data) => data.status === 'PONG'
    }
  ];

  let failed = false;

  for (const test of tests) {
    try {
      const res = await fetch(test.url);
      const contentType = res.headers.get('content-type') || '';
      const statusOk = res.status === test.expectedStatus;
      const mimeOk = contentType.includes(test.expectedContentType);

      let bodyOk = true;
      if (test.validateBody) {
        const json = await res.json();
        bodyOk = test.validateBody(json);
      }

      if (statusOk && mimeOk && bodyOk) {
        console.log(`   ✅ PASS: ${test.name} -> HTTP ${res.status} [${contentType.split(';')[0]}]`);
      } else {
        console.error(`   ❌ FAIL: ${test.name}`);
        console.error(`      Status: ${res.status} (Așteptat: ${test.expectedStatus})`);
        console.error(`      Content-Type: ${contentType} (Așteptat: ${test.expectedContentType})`);
        if (!bodyOk) console.error(`      Validare conținut JSON eșuată!`);
        failed = true;
      }
    } catch (fetchErr) {
      console.error(`   ❌ FAIL: ${test.name} -> Eroare conexiune:`, fetchErr.message);
      failed = true;
    }
  }

  killServer();

  console.log('🏁 [4/4] Finalizare test...');
  if (failed) {
    console.error('\n💥 SMOKE TEST EȘUAT! Există erori de runtime sau configurare server Pontaj.');
    process.exit(1);
  } else {
    console.log('\n🎉 TOATE PROBELE DE RUNTIME PONTAJ AU FOST VALIDATE CU SUCCES!');
    console.log('   Gata de lansare în producție.');
    process.exit(0);
  }
}

runSmokeTest();
