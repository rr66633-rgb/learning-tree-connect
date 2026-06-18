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
  const page = await authContext.newPage();
  
  console.log('Capturing messages with opened conversation...');
  await page.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Click a conversation button - target buttons that contain "محادثة"
  try {
    const convButton = page.locator('button:has-text("محادثة")').first();
    const count = await page.locator('button:has-text("محادثة")').count();
    console.log(`  Found ${count} conversation buttons`);
    if (count > 0) {
      await convButton.click();
      await page.waitForTimeout(3000);
    }
  } catch (e) {
    console.log('  Error clicking:', e.message);
  }
  await page.screenshot({ path: `${OUTPUT_DIR}/05-messages-open.png`, fullPage: false });
  console.log('  Saved 05-messages-open.png');
  
  await authContext.close();
  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
