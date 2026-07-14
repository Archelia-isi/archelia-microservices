const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Goto error:', e.message));
  
  console.log('Waiting for a bit...');
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
