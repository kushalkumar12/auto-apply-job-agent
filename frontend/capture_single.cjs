const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'C:\\Users\\kusha\\.gemini\\antigravity-ide\\brain\\22c7c497-ecb5-4a48-94fd-c39a138675fd\\screenshots_64';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => !!window.__setTestState, { timeout: 15000 });

  await page.evaluate(() => {
    window.__setTestState.setTheme('default');
    window.__setTestState.setMode('dark');
    window.__setTestState.closeAllModals();
    window.__setTestState.setTab('explore');
  });

  await new Promise(r => setTimeout(r, 600));

  const filepath = path.join(OUTPUT_DIR, '09_default_dark_explore.png');
  await page.screenshot({ path: filepath });
  console.log(`Successfully re-captured ${filepath}`);

  await browser.close();
}

run().catch(console.error);
