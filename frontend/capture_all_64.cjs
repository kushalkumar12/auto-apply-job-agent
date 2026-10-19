const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'C:\\Users\\kusha\\.gemini\\antigravity-ide\\brain\\22c7c497-ecb5-4a48-94fd-c39a138675fd\\screenshots_64';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const THEMES = ['default', 'difference', 'glass', 'minimal'];
const MODES = ['light', 'dark'];
const VIEWS = ['explore', 'generation', 'automation', 'profile', 'analytics', 'tools', 'settings', 'popups'];

async function run() {
  console.log(`Starting 64-view capture across 4 themes x 2 modes x 8 views...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error]:`, msg.text());
    }
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for React hydration and test helper
  await page.waitForFunction(() => !!window.__setTestState, { timeout: 15000 });

  let count = 0;
  const results = [];

  for (const theme of THEMES) {
    for (const mode of MODES) {
      for (const view of VIEWS) {
        count++;
        const filename = `${String(count).padStart(2, '0')}_${theme}_${mode}_${view}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);

        // Apply theme and mode
        const themeId = theme === 'minimal' ? 'no-color' : theme;
        await page.evaluate(({ t, m }) => {
          window.__setTestState.setTheme(t);
          window.__setTestState.setMode(m);
        }, { t: themeId, m: mode });

        // Handle view
        if (view === 'settings') {
          await page.evaluate(() => {
            window.__setTestState.closeAllModals();
            window.__setTestState.setTab('explore');
            window.__setTestState.openSettings();
          });
        } else if (view === 'popups') {
          await page.evaluate(() => {
            window.__setTestState.closeAllModals();
            window.__setTestState.setTab('explore');
            window.__setTestState.openThemes();
          });
        } else {
          await page.evaluate((tab) => {
            window.__setTestState.closeAllModals();
            window.__setTestState.setTab(tab);
          }, view);
        }

        // Brief wait for transitions/render
        await new Promise(r => setTimeout(r, 400));

        // Capture screenshot
        await page.screenshot({ path: filepath });

        // Validate basic DOM integrity
        const validation = await page.evaluate(() => {
          const bodyBg = window.getComputedStyle(document.body).backgroundColor;
          const bodyColor = window.getComputedStyle(document.body).color;
          const hasError = !!document.querySelector('.error-boundary-fallback');
          return { bodyBg, bodyColor, hasError };
        });

        results.push({
          index: count,
          theme,
          mode,
          view,
          filename,
          filepath,
          validation
        });

        if (count % 8 === 0) {
          console.log(`Captured ${count}/64 views (${theme} - ${mode} complete)`);
        }
      }
    }
  }

  await browser.close();

  // Save manifest
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));

  console.log(`Successfully completed all 64 views! Manifest written to ${manifestPath}`);
}

run().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
