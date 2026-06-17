# Selenium E2E Test Structure & Runner

This directory contains the automated End-to-End (E2E) web testing suite for the EcoTrade application, powered by **Node.js**, **Mocha**, and **Selenium WebDriver**.

---

## 📁 Directory Structure

```text
selenium-tests/
├── tests/
│   └── login.test.js    # Mocha test suite executing E2E Selenium browser flows
├── package.json         # Package configuration with dependencies (mocha, selenium-webdriver)
└── README.md            # Testing documentation (this file)
```

---

## ⚙️ Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **Google Chrome** browser installed locally
3. **ChromeDriver** (automatically managed by Selenium WebDriver v4+)

---

## 🚀 Getting Started

### 1. Install Dependencies
Navigate to this directory and install the required NPM packages:

```bash
cd selenium-tests
npm install
```

### 2. Configure Environment URL
The test scripts default to testing the web server at:
`http://localhost:8080`

Ensure your local application server is running on port **8080** before starting the tests.

---

## 🧪 Running the Tests

### Local Execution (Headed Mode)
To run the E2E login test suite:

```bash
npm run login
```

This will trigger the Mocha runner, launch a Google Chrome instance, perform element validation on the login forms, test invalid credential handling, and output the pass/fail assertions directly in your terminal.

---

## 🤖 CI/CD Integration
These tests are automatically executed on every push or pull request to the `main` branch via GitHub Actions (`.github/workflows/selenium-login.yml`). 

The pipeline runs in a headless environment:
* Boots up a clean Node environment
* Starts the web application server
* Waits for port `8080` to be responsive
* Executes the Selenium E2E suite
