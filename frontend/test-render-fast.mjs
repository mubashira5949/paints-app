import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => {
     console.log('PAGE ERROR CAPTURED:', error.message);
     process.exit(1);
  });
  
  try {
    // Just go to page, don't wait for networkidle which might hang if vite hot module replacement is active
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    // wait a moment for react to render
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.log("Goto error:", e.message);
  }
  
  await browser.close();
})();
