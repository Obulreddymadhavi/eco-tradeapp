# EcoTrade — Doorstep Waste Collection & Recycling Rewards

EcoTrade is a full-stack platform that connects customers with waste collection vendors. Customers schedule waste pickups (plastic, paper, metal, e-waste, mixed, etc.) and earn Eco Points upon completion. Nearby vendors view requests, accept them, contact the customer, navigate to their address, weigh the waste, and pay the customer in cash.

---

## 🛠️ Technology Stack

### Backend & Database Layer
* **TypeScript & Node.js**: Powers server-side API routes (under `src/routes/api/`) and TanStack Start Server Functions (under `src/lib/api/`). These handle request validation, business logic, and server-side calls securely.
* **SQL & PL/pgSQL (PostgreSQL)**: Manages database schemas, table relationships, row-level security (RLS) policies, and automated triggers (like automatically generating user profile rows upon signup) on **Supabase**.
* **Python**: Used for automated E2E testing clients and reporting utilities.

### Frontend Layer
* **React, TanStack Router & Query**: Builds the user interface with state management and routing.
* **TailwindCSS**: Maximizes flexibility and styles the modern, premium UI.

---

## 🧪 E2E Test Suite Framework

The repository is equipped with a complete E2E testing framework saved in separate directories:

### 1. Web Automated Tests (Selenium)
* **Python Suite** (`tests/selenium/web_tests.py`): Uses Selenium WebDriver and Python's `unittest` library to simulate and verify web actions (landing page loads, role-routing validations).
* **JavaScript Suite** (`selenium-tests/tests/login.test.js`): Uses Selenium and Mocha to automate login checks (successful sign-ins, input element locations, invalid credentials rejection).

### 2. Mobile Automated Tests (Appium)
* **Python Suite** (`tests/appium/mobile_tests.py`): Uses Appium to interact with elements inside the Android mobile app, testing forms, date/time pickers, GPS location tracking, soft keyboard events, and settings configurations.

### 3. Test Cases Execution Matrix
* **Test Report** (`tests/test_report.xlsx`): An Excel report automatically compiled via `tests/test_report_generator.py` containing **100 test cases** (50 Web, 50 Mobile) showing step descriptions, expected behaviors, and execution status.

---

## 🚀 CI/CD Pipeline & Deployment

* **GitHub Actions** (`.github/workflows/selenium-login.yml`): Automates testing on code pushes or pull requests to `main` branch. Installs dependencies, compiles the project, starts the web server locally, and triggers the Selenium E2E test runs.
* **Static Deployment Configuration**: Ready with `homepage` properties and `gh-pages` commands in `package.json` for static asset exports.
