import { chromium } from 'playwright';

const TOKEN = process.argv[2];
const BASE_URL = 'http://localhost:3000';
const COOKIE_NAME = 'app_session_id';
const OUTPUT_DIR = '/home/ubuntu/screenshots_final';

const pages = [
  { path: '/', name: '01-dashboard' },
  { path: '/children', name: '02-children' },
  { path: '/attendance', name: '03-attendance' },
  { path: '/daily-reports', name: '04-daily-reports' },
  { path: '/messages', name: '05-messages' },
  { path: '/finance', name: '06-finance' },
  { path: '/loyalty', name: '07-loyalty' },
  { path: '/notifications', name: '08-notifications' },
];

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });
  
  // Set the auth cookie
  await context.addCookies([{
    name: COOKIE_NAME,
    value: TOKEN,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  
  const page = await context.newPage();
  
  // Create output directory
  const { execSync } = await import('child_process');
  execSync(`mkdir -p ${OUTPUT_DIR}`);
  
  for (const p of pages) {
    console.log(`Capturing ${p.name} (${p.path})...`);
    await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait extra time for any animations/transitions to complete
    await page.waitForTimeout(2000);
    
    // Wait for skeletons to disappear (if any)
    try {
      await page.waitForFunction(() => {
        const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
        return skeletons.length === 0;
      }, { timeout: 10000 });
    } catch (e) {
      console.log(`  Warning: Some skeletons still visible on ${p.name}`);
    }
    
    // Additional wait after skeletons disappear
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: `${OUTPUT_DIR}/${p.name}.png`,
      fullPage: false,
    });
    console.log(`  Saved ${p.name}.png`);
  }
  
  await browser.close();
  console.log('Done! All screenshots saved to', OUTPUT_DIR);
}

main().catch(console.error);
