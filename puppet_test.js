const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGEERROR:', err.toString()));
    page.on('error', err => console.log('ERROR:', err.toString()));
    
    await page.goto('http://localhost:3000');
    await new Promise(r => setTimeout(r, 1000));
    
    await page.evaluate(() => {
        document.getElementById('btn-play-guest-auth').click();
    });
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
        document.getElementById('btn-play').click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
        document.getElementById('btn-clear-change').click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
  } catch(e) { console.error(e); }
})();
