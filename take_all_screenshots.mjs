import { chromium } from 'playwright';

const ADMIN_TOKEN = process.argv[2];
const PARENT_TOKEN = process.argv[3];
const BASE_URL = 'http://localhost:3000';
const COOKIE_NAME = 'app_session_id';
const OUTPUT_DIR = '/home/ubuntu/screenshots_final';

async function waitForData(page) {
  await page.waitForTimeout(2000);
  try {
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      return skeletons.length === 0;
    }, { timeout: 15000 });
  } catch (e) {
    console.log('    Warning: some skeletons still visible');
  }
  await page.waitForTimeout(1000);
}

async function main() {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  // Admin context
  const adminContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });
  await adminContext.addCookies([{
    name: COOKIE_NAME,
    value: ADMIN_TOKEN,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  
  const page = await adminContext.newPage();
  
  // 1. Dashboard
  console.log('1. Dashboard...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/01-dashboard.png` });
  console.log('   Done');
  
  // 2. Children
  console.log('2. Children...');
  await page.goto(`${BASE_URL}/children`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/02-children.png` });
  console.log('   Done');
  
  // 3. Attendance
  console.log('3. Attendance...');
  await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/03-attendance.png` });
  console.log('   Done');
  
  // 4. Daily Reports
  console.log('4. Daily Reports...');
  await page.goto(`${BASE_URL}/daily-reports`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/04-daily-reports.png` });
  console.log('   Done');
  
  // 5. Messages
  console.log('5. Messages...');
  await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  // Click first conversation
  try {
    const convBtn = page.locator('main button').first();
    await convBtn.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('    Could not click conversation');
  }
  await page.screenshot({ path: `${OUTPUT_DIR}/05-messages.png` });
  console.log('   Done');
  
  // 6. Finance
  console.log('6. Finance...');
  await page.goto(`${BASE_URL}/finance`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/06-finance.png` });
  console.log('   Done');
  
  // 7. Loyalty (admin)
  console.log('7. Loyalty (admin)...');
  await page.goto(`${BASE_URL}/loyalty`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/07-loyalty.png` });
  console.log('   Done');
  
  // 8. Notifications
  console.log('8. Notifications...');
  await page.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(page);
  await page.screenshot({ path: `${OUTPUT_DIR}/08-notifications.png` });
  console.log('   Done');
  
  await adminContext.close();
  
  // Parent context for parent portal
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
  
  // 9. Parent Dashboard
  console.log('9. Parent Dashboard...');
  await parentPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(parentPage);
  await parentPage.screenshot({ path: `${OUTPUT_DIR}/09-parent-dashboard.png` });
  console.log('   Done');
  
  // 10. Parent Loyalty
  console.log('10. Parent Loyalty...');
  await parentPage.goto(`${BASE_URL}/loyalty`, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForData(parentPage);
  await parentPage.screenshot({ path: `${OUTPUT_DIR}/10-parent-loyalty.png` });
  console.log('   Done');
  
  await parentContext.close();
  
  // Login page (no auth)
  const loginContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-SA',
  });
  const loginPage = await loginContext.newPage();
  
  console.log('11. Login page...');
  await loginPage.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await loginPage.waitForTimeout(3000);
  await loginPage.screenshot({ path: `${OUTPUT_DIR}/00-login.png` });
  console.log('   Done');
  
  await loginContext.close();
  await browser.close();
  console.log('\nAll screenshots captured!');
}

main().catch(console.error);
