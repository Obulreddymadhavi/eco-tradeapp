import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class EcoTradeWebE2ETests(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Set up headless Chrome options for automated environments
        options = webdriver.ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        cls.driver = webdriver.Chrome(options=options)
        cls.driver.implicitly_wait(10)
        cls.base_url = "http://127.0.0.1:8080"

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def test_01_landing_page_title(self):
        """WEB-017: Verify landing page loads and title displays correctly."""
        self.driver.get(self.base_url)
        self.assertIn("EcoTrade", self.driver.title)
        
    def test_02_navigation_to_auth(self):
        """WEB-003: Navigate to sign in / authentication page."""
        self.driver.get(self.base_url)
        # Find customer link on landing page and click it
        customer_link = self.driver.find_element(By.XPATH, "//a[contains(text(), \"I'm a Customer\")]")
        customer_link.click()
        
        # Verify page URL contains auth
        self.assertIn("/auth", self.driver.current_url)

    def test_03_login_validation_elements(self):
        """WEB-006: Verify login page validation elements exist."""
        self.driver.get(f"{self.base_url}/auth")
        
        # Locate input fields and sign in button
        email_field = self.driver.find_element(By.ID, "email")
        password_field = self.driver.find_element(By.ID, "password")
        signin_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Sign in') or contains(text(), 'Create')]")
        
        self.assertTrue(email_field.is_displayed())
        self.assertTrue(password_field.is_displayed())
        self.assertTrue(signin_btn.is_displayed())

    def test_04_signup_role_switching(self):
        """WEB-002: Verify customer/vendor signup fields toggling."""
        self.driver.get(f"{self.base_url}/auth?mode=signup")
        
        # Select Vendor role button
        vendor_role_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Vendor')]")
        vendor_role_btn.click()
        
        # Verify that Company name and Vehicle info inputs appear
        company_input = WebDriverWait(self.driver, 5).until(
            EC.presence_of_element_located((By.ID, "company"))
        )
        vehicle_input = self.driver.find_element(By.ID, "vehicle")
        
        self.assertTrue(company_input.is_displayed())
        self.assertTrue(vehicle_input.is_displayed())

    def test_05_profile_settings_navigation(self):
        """WEB-011: Verify profile settings section requires auth."""
        # Unauthenticated access to /profile should redirect
        self.driver.get(f"{self.base_url}/profile")
        # Assert user is redirected away to auth
        self.assertTrue("/auth" in self.driver.current_url or self.driver.find_element(By.ID, "email"))

if __name__ == "__main__":
    unittest.main()
