import { chromium } from 'playwright';

const PARENT_TOKEN = process.argv[2];
const ADMIN_TOKEN = process.argv[3];
const BASE_URL = 'http://localhost:3000';
const COOKIE_NAME = 'app_session_id';
const OUTPUT_DIR = '/home/ubuntu/screenshots_final';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Parent portal - loyalty page with real points
  console.log('Capturing parent loyalty page...');
  const parentContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });
  await parentContext.addCookies([{
    name: COOKIE_NAME,
    value: PARENT_TOKEN,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  const parentPage = await parentContext.newPage();
  
  // Parent Dashboard
  await parentPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await parentPage.waitForTimeout(3000);
  try {
    await parentPage.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 10000 });
  } catch (e) {}
  await parentPage.waitForTimeout(500);
  await parentPage.screenshot({ path: `${OUTPUT_DIR}/09-parent-dashboard.png`, fullPage: false });
  console.log('  Saved 09-parent-dashboard.png');
  
  // Parent Loyalty
  await parentPage.goto(`${BASE_URL}/loyalty`, { waitUntil: 'networkidle', timeout: 30000 });
  await parentPage.waitForTimeout(3000);
  try {
    await parentPage.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 10000 });
  } catch (e) {}
  await parentPage.waitForTimeout(500);
  await parentPage.screenshot({ path: `${OUTPUT_DIR}/07-loyalty-parent.png`, fullPage: false });
  console.log('  Saved 07-loyalty-parent.png');
  
  await parentContext.close();
  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
