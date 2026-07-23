const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('Vercel Production Vendor flow Test', function () {
  this.timeout(50000);
  let driver;

  before(async function () {
    let options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    let loggingPrefs = new logging.Preferences();
    loggingPrefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
    options.setLoggingPrefs(loggingPrefs);

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should test vendor signup on Vercel app', async function () {
    const signupUrl = 'https://eco-tradeapp-43u8.vercel.app/auth?mode=signup&role=vendor';
    console.log('Navigating to Vercel signup page:', signupUrl);
    await driver.get(signupUrl);

    // Wait for the signup form fields to load
    await driver.wait(until.elementLocated(By.id('full_name')), 20000);

    const email = `testvendor_${Date.now()}@example.com`;
    console.log('Using email:', email);

    await driver.findElement(By.id('full_name')).sendKeys('Vercel Vendor Agent');
    await driver.findElement(By.id('phone')).sendKeys('9123456789');
    await driver.findElement(By.id('address')).sendKeys('123 Green Avenue, Bangalore');
    await driver.findElement(By.id('company')).sendKeys('EcoRecycle Bangalore');
    await driver.findElement(By.id('vehicle')).sendKeys('Tata Ace - KA 03 EF 5678');
    await driver.findElement(By.id('email')).sendKeys(email);
    await driver.findElement(By.id('password')).sendKeys('password123');

    // Trigger form submit programmatically
    console.log('Submitting signup form...');
    await driver.executeScript(`
      const form = document.querySelector('form');
      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvent);
    `);

    console.log('Waiting for response from Vercel/Supabase...');
    await driver.sleep(8000);

    // Get browser console logs
    const logs = await driver.manage().logs().get(logging.Type.BROWSER);
    console.log('=== BROWSER CONSOLE LOGS ===');
    for (const log of logs) {
      console.log(`[${log.level.name}] ${log.message}`);
    }
    console.log('============================');

    const currentUrl = await driver.getCurrentUrl();
    console.log('Final URL:', currentUrl);

    const pageHtml = await driver.executeScript('return document.body.innerHTML;');
    console.log('=== PAGE HTML ===');
    console.log(pageHtml.substring(0, 1000));
    console.log('=================');

    if (currentUrl.includes('/vendor')) {
      console.log('SUCCESS: Redirected to /vendor dashboard!');
      assert.ok(true);
    } else if (pageHtml.includes('verify your email') || pageHtml.includes('Please verify your email') || pageHtml.includes('Verification email sent')) {
      console.log('SUCCESS: Email verification page displayed correctly on Vercel!');
      assert.ok(true);
    } else {
      assert.fail(`Signup failed. URL: ${currentUrl}`);
    }
  });
});
