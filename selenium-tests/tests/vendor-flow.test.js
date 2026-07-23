const { Builder, By, until, logging } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('Vendor Signup and Redirection Test', function () {
  this.timeout(40000);
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

  it('should sign up as vendor and redirect to /vendor or show email verification page', async function () {
    const signupUrl = 'http://localhost:8080/auth?mode=signup&role=vendor';
    console.log('Navigating to:', signupUrl);
    await driver.get(signupUrl);

    await driver.wait(until.elementLocated(By.id('full_name')), 15000);

    const email = `testvendor_${Date.now()}@example.com`;
    console.log('Using email:', email);

    await driver.findElement(By.id('full_name')).sendKeys('Test Vendor Agent');
    await driver.findElement(By.id('phone')).sendKeys('9123456789');
    await driver.findElement(By.id('address')).sendKeys('123 Green Avenue, Bangalore');
    await driver.findElement(By.id('company')).sendKeys('EcoRecycle Bangalore');
    await driver.findElement(By.id('vehicle')).sendKeys('Tata Ace - KA 03 EF 5678');
    await driver.findElement(By.id('email')).sendKeys(email);
    await driver.findElement(By.id('password')).sendKeys('password123');

    // Trigger form submit programmatically
    console.log('Dispatching submit event programmatically...');
    await driver.executeScript(`
      const form = document.querySelector('form');
      const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
      form.dispatchEvent(submitEvent);
    `);

    console.log('Waiting for response...');
    await driver.sleep(6000);

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
    fs.writeFileSync(path.join(__dirname, 'page_dump.html'), pageHtml);
    console.log('Saved page_dump.html');

    if (currentUrl.includes('/vendor')) {
      console.log('SUCCESS: Redirected to /vendor dashboard!');
      assert.ok(true);
    } else if (pageHtml.includes('verify your email') || pageHtml.includes('Please verify your email') || pageHtml.includes('Verification email sent')) {
      console.log('SUCCESS: Email verification page displayed!');
      assert.ok(true);
    } else {
      assert.fail(`Signup failed. URL: ${currentUrl}`);
    }
  });
});
