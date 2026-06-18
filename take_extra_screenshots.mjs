import { chromium } from 'playwright';

const TOKEN = process.argv[2];
const BASE_URL = 'http://localhost:3000';
const COOKIE_NAME = 'app_session_id';
const OUTPUT_DIR = '/home/ubuntu/screenshots_final';

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // First: Login page (no auth cookie)
  console.log('Capturing login page...');
  const loginContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await loginPage.waitForTimeout(2000);
  await loginPage.screenshot({ path: `${OUTPUT_DIR}/00-login.png`, fullPage: false });
  console.log('  Saved 00-login.png');
  await loginContext.close();
  
  // Second: Messages with opened conversation (authenticated)
  console.log('Capturing messages with opened conversation...');
  const authContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });
  await authContext.addCookies([{
    name: COOKIE_NAME,
    value: TOKEN,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  const msgPage = await authContext.newPage();
  await msgPage.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle', timeout: 30000 });
  await msgPage.waitForTimeout(2000);
  
  // Wait for conversations to load
  try {
    await msgPage.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 10000 });
  } catch (e) {}
  await msgPage.waitForTimeout(500);
  
  // Click the first conversation
  try {
    const firstConv = await msgPage.locator('[class*="cursor-pointer"]').first();
    await firstConv.click();
    await msgPage.waitForTimeout(2000);
    await msgPage.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 10000 });
  } catch (e) {
    console.log('  Could not click conversation:', e.message);
  }
  await msgPage.waitForTimeout(500);
  await msgPage.screenshot({ path: `${OUTPUT_DIR}/05-messages-open.png`, fullPage: false });
  console.log('  Saved 05-messages-open.png');
  
  // Third: Parent portal view (use a parent token)
  // For now, let's capture the loyalty page with a parent's perspective
  // Actually, the admin sees all data - let's capture the loyalty page showing transactions
  console.log('Capturing loyalty with transactions visible...');
  await msgPage.goto(`${BASE_URL}/loyalty`, { waitUntil: 'networkidle', timeout: 30000 });
  await msgPage.waitForTimeout(2000);
  try {
    await msgPage.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 10000 });
  } catch (e) {}
  await msgPage.waitForTimeout(500);
  // Scroll down to see transactions
  await msgPage.evaluate(() => window.scrollBy(0, 400));
  await msgPage.waitForTimeout(500);
  await msgPage.screenshot({ path: `${OUTPUT_DIR}/07-loyalty-transactions.png`, fullPage: false });
  console.log('  Saved 07-loyalty-transactions.png');
  
  await authContext.close();
  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
