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

  // 1. Glass Light Mode
  await page.evaluate(() => {
    window.__setTestState.setTheme('glass');
    window.__setTestState.setMode('light');
    window.__setTestState.closeAllModals();
    window.__setTestState.setTab('explore');
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '33_glass_light_explore.png') });
  console.log('Saved 33_glass_light_explore.png');

  // 2. Glass Dark Mode
  await page.evaluate(() => {
    window.__setTestState.setTheme('glass');
    window.__setTestState.setMode('dark');
    window.__setTestState.closeAllModals();
    window.__setTestState.setTab('explore');
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '41_glass_dark_explore.png') });
  console.log('Saved 41_glass_dark_explore.png');

  await browser.close();
}

run().catch(console.error);
