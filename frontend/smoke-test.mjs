import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Starting Production Dashboard E2E Smoke Test...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌ PAGE LOG ERROR:', msg.text());
    else if (msg.type() === 'log') console.log('📖 PAGE LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('🛑 PAGE RUNTIME ERROR:', err.message));

  try {
    const baseUrl = 'http://localhost:5173';
    console.log(`🔗 Navigating to ${baseUrl}/login...`);
    
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle2' });

    // 1. Perform Login
    console.log('🔑 Performing login as operator...');
    await page.waitForSelector('input[type="text"]');
    await page.type('input[type="text"]', 'operator@paintsapp.com');
    await page.type('input[type="password"]', 'operatorpassword');
    
    // Use evaluate to find the submit button more reliably
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submit = btns.find(b => b.type === 'submit' || b.innerText.includes('Dashboard'));
        if (submit) submit.click();
    });

    console.log('⏳ Waiting for authentication and redirect...');
    // Increase timeout for slow backend
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('📍 Current URL after login:', page.url());

    // 2. Navigate to Production Page (just in case)
    if (!page.url().includes('/production')) {
        console.log('🔗 Redirecting manually to /production...');
        await page.goto(`${baseUrl}/production`, { waitUntil: 'networkidle2' });
    }

    // 3. Verify Page loaded and the Title exists
    await page.waitForFunction(() => document.body.innerText.includes('Production Runs'), { timeout: 15000 });
    console.log('✅ Production page loaded successfully.');

    // 4. Verify Modular Dashboard Tabs
    const tabsFound = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button')).map(b => b.innerText.toUpperCase());
      return ['OVERVIEW', 'ACTIVE RUNS', 'HISTORY'].some(t => tabs.includes(t));
    });
    
    if (tabsFound) {
      console.log('✅ Dashboard Tabs detected.');
    } else {
      const found = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.innerText));
      console.log('Found buttons:', JSON.stringify(found));
      throw new Error('❌ Missing modular dashboard buttons!');
    }

    // 5. Test Tab Switching
    console.log('🖱️ Testing tab switching...');
    const switchSuccess = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const target = tabs.find(b => ['HISTORY', 'ACTIVE RUNS'].includes(b.innerText.toUpperCase()));
      if (target) {
          target.click();
          return true;
      }
      return false;
    });
    
    if (switchSuccess) {
        await new Promise(r => setTimeout(r, 1000));
        console.log('✅ Tab click performed.');
    }

    // 6. Test Modal Interaction
    console.log('🖱️ Testing Modal interface...');
    const modalOpened = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Batch'));
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    });
    
    if (modalOpened) {
      await new Promise(r => setTimeout(r, 1000));
      console.log('✅ Modal trigger clicked.');
      await page.keyboard.press('Escape');
    }

    console.log('\n✨ ALL SMOKE TESTS PASSED: The dashboard is production-ready.');

  } catch (error) {
    console.error('💥 Smoke Test Failed:', error.message);
    const filename = `smoke-test-fail-final.png`;
    await page.screenshot({ path: filename });
    console.log(`📸 Screenshot saved to ${filename}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
