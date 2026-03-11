const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('response', response => {
      if (!response.ok()) console.log('NETWORK ERROR:', response.url(), response.status());
    });

    console.log("Navigating...");
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 2000));

    console.log("Clicking guest...");
    await page.click('#btn-play-guest-auth');
    await new Promise(r => setTimeout(r, 1000));

    console.log("Clicking play...");
    await page.click('#btn-play');
    await new Promise(r => setTimeout(r, 3000));

    console.log("Done");
    await browser.close();
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
  }
})();
