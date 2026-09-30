import { chromium } from 'playwright';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const LOGIN_URL = process.env.LOGIN_URL || 'https://example.com/login';
const USERNAME = process.env.USERNAME || 'admin';
const PASSWORD = process.env.PASSWORD || 'admin';
const REDIS_KEY = process.env.REDIS_KEY || 'auth:storageState';
const TTL = parseInt(process.env.TTL || '3600', 10);

async function performLoginAndSaveState() {
  console.log('Starting authentication process...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(LOGIN_URL);

    if (await page.$('input[name="username"]')) {
      await page.fill('input[name="username"]', USERNAME);
    } else if (await page.$('input[type="email"]')) {
      await page.fill('input[type="email"]', USERNAME);
    }

    if (await page.$('input[name="password"]')) {
      await page.fill('input[name="password"]', PASSWORD);
    } else if (await page.$('input[type="password"]')) {
      await page.fill('input[type="password"]', PASSWORD);
    }

    if (await page.$('button[type="submit"]')) {
      await page.click('button[type="submit"]');
    }

    await page.waitForLoadState('networkidle');

    const storageState = await context.storageState();

    await redis.set(REDIS_KEY, JSON.stringify(storageState), 'EX', TTL);
    console.log(`Successfully saved storageState to Redis key: ${REDIS_KEY} with TTL: ${TTL}s`);
  } catch (error) {
    console.error('Error during authentication flow:', error);
  } finally {
    await browser.close();
    await redis.quit();
  }
}

performLoginAndSaveState().catch(console.error);