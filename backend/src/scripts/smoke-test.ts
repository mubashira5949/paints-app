import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = 'http://localhost:3000';

async function runSmokeTest() {
  console.log('Starting API Smoke Test...\n');
  let passCount = 0;
  let failCount = 0;

  try {
    process.stdout.write(`Testing Login Flow (/api/auth/login)... `);
    const loginStart = Date.now();
    let token = '';

    try {
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'manager@paintsapp.com', password: 'managerpassword' })
      });
      const latency = Date.now() - loginStart;

      if (loginRes.ok) {
        const data = await loginRes.json() as { token: string };
        token = data.token;
        console.log(`✅ OK [${loginRes.status}] (${latency}ms)`);
        passCount++;
      } else {
        console.log(`❌ FAILED [${loginRes.status}]`);
        const text = await loginRes.text();
        console.log(`   Response: ${text.substring(0, 100)}`);
        failCount++;
        throw new Error('Login failed. Cannot continue tests.');
      }
    } catch (err: any) {
      console.log(`❌ ERROR [${err.message}]`);
      failCount++;
      throw err;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Define endpoints to check
    const endpoints = [
      { name: 'Dashboard Widget Data', url: '/api/dashboard' },
      { name: 'Inventory Data', url: '/api/inventory' },
      { name: 'Production Runs', url: '/production-runs' },
      { name: 'Colors List', url: '/colors' },
      { name: 'Sales Orders', url: '/sales/orders' },
      { name: 'System Users', url: '/users' },
      { name: 'Clients Management', url: '/clients' },
    ];

    for (const ep of endpoints) {
      process.stdout.write(`Testing ${ep.name} (${ep.url})... `);
      const reqStart = Date.now();
      try {
        const response = await fetch(`${BASE_URL}${ep.url}`, { headers });
        const latency = Date.now() - reqStart;
        
        if (response.ok) {
          console.log(`✅ OK [${response.status}] (${latency}ms)`);
          passCount++;
        } else {
          console.log(`❌ FAILED [${response.status}]`);
          const text = await response.text();
          console.log(`   Response: ${text.substring(0, 100)}`);
          failCount++;
        }
      } catch (err: any) {
        console.log(`❌ ERROR [${err.message}]`);
        failCount++;
      }
    }

    // Ping frontend
    process.stdout.write(`Testing Frontend Dev Server (http://localhost:5173)... `);
    try {
      const feRes = await fetch('http://localhost:5173/');
      if (feRes.ok) {
        console.log(`✅ OK [${feRes.status}]`);
        passCount++;
      } else {
        console.log(`❌ FAILED [${feRes.status}]`);
        failCount++;
      }
    } catch {
       console.log(`❌ ERROR - Is frontend running?`);
       failCount++;
    }

    console.log(`\nSmoke Test Complete. ${passCount} passed, ${failCount} failed.`);
    if (failCount === 0) {
      console.log('🚀 Your application is ready for the presentation!');
    }

  } catch (err: any) {
    console.error('Fatal Test Error:', err.message);
  }
}

runSmokeTest();
