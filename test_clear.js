const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('LOG:', msg.text()));
        
        await page.goto('http://localhost:3000');
        await page.waitForSelector('#btn-play-guest-auth');
        await page.click('#btn-play-guest-auth'); // Go to title
        
        await page.waitForSelector('#btn-play');
        await page.click('#btn-play'); // Start game
        
        await page.waitForSelector('.money-btn');
        // Wait for first scan prompt and ignore/click something to get to payment
        await page.evaluate(() => {
            // Force items to be "scanned"
            const state = window.state; // Need to expose state, or just click items?
        });
        
        // Actually, the money buttons might be available but clicking them only works if not roundLocked
        // Let's just expose state to window in main.js
    } catch(e) {
        console.error(e);
    }
})();
