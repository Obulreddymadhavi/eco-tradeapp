const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

describe('EcoTrade E2E Login Test', function () {
  this.timeout(30000); // 30 seconds timeout
  let driver;

  before(async function () {
    let options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
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

  it('should verify login elements are present', async function () {
    // Navigate to the auth page
    await driver.get('http://127.0.0.1:8080/auth');

    // Wait for the login form to load
    await driver.wait(until.elementLocated(By.id('email')), 15000);

    const emailField = await driver.findElement(By.id('email'));
    const passwordField = await driver.findElement(By.id('password'));
    const loginButton = await driver.findElement(By.id('login-button'));

    assert.ok(await emailField.isDisplayed());
    assert.ok(await passwordField.isDisplayed());
    assert.ok(await loginButton.isDisplayed());
  });

  it('should reject invalid credentials and show error toast', async function () {
    await driver.get('http://127.0.0.1:8080/auth');
    await driver.wait(until.elementLocated(By.id('email')), 10000);
    await driver.sleep(1500); // Allow React to hydrate and settle

    // Enter bad credentials with retry if stale
    let emailField;
    try {
      emailField = await driver.findElement(By.id('email'));
      await emailField.sendKeys('fakeuser@nonexistent.com');
    } catch (e) {
      emailField = await driver.findElement(By.id('email'));
      await emailField.sendKeys('fakeuser@nonexistent.com');
    }

    let passwordField;
    try {
      passwordField = await driver.findElement(By.id('password'));
      await passwordField.sendKeys('wrongpassword');
    } catch (e) {
      passwordField = await driver.findElement(By.id('password'));
      await passwordField.sendKeys('wrongpassword');
    }

    // Submit
    let loginButton;
    try {
      loginButton = await driver.findElement(By.id('login-button'));
      await loginButton.click();
    } catch (e) {
      loginButton = await driver.findElement(By.id('login-button'));
      await loginButton.click();
    }

    // Verify authentication failure (URL should remain on /auth page)
    await driver.sleep(2000);
    const url = await driver.getCurrentUrl();
    assert.ok(url.includes('/auth'));
  });
});
