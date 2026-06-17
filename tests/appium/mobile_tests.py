import unittest
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy

class EcoTradeMobileE2ETests(unittest.TestCase):
    
    def setUp(self):
        # Configure Appium desired capabilities for Android mobile app
        self.caps = {
            "platformName": "Android",
            "automationName": "UiAutomator2",
            "deviceName": "Android Emulator",
            "appPackage": "com.ecotrade.app",
            "appActivity": ".MainActivity",
            "noReset": True,
            "ensureWebviewsHavePages": True,
            "nativeWebScreenshot": True,
            "newCommandTimeout": 3600
        }
        # Establish connection with Appium server
        self.driver = webdriver.Remote("http://localhost:4723/wd/hub", self.caps)
        self.driver.implicitly_wait(10)

    def tearDown(self):
        if self.driver:
            self.driver.quit()

    def test_01_app_launch_login_view(self):
        """MOB-001: Verify Android login screen elements load correctly."""
        # Find input email and password elements using Appium Android selectors
        email_input = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="email_input")
        password_input = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="password_input")
        login_button = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="login_submit")

        self.assertTrue(email_input.is_displayed())
        self.assertTrue(password_input.is_displayed())
        self.assertTrue(login_button.is_displayed())

    def test_02_keyboard_activation(self):
        """MOB-002: Verify soft keyboard opens on text field focus."""
        email_input = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="email_input")
        email_input.click()
        
        # Verify if soft keyboard is shown
        is_keyboard_shown = self.driver.is_keyboard_shown()
        self.assertTrue(is_keyboard_shown)

    def test_03_role_selector_selection(self):
        """MOB-006: Verify toggle switch shifts between Customer and Vendor."""
        signup_tab = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="signup_tab")
        signup_tab.click()

        vendor_toggle = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="role_vendor")
        vendor_toggle.click()

        # Check vendor specific forms are displayed (Company Name)
        company_input = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="company_input")
        self.assertTrue(company_input.is_displayed())

    def test_04_gps_location_request(self):
        """MOB-019: Verify location permissions and coordinates fetching."""
        # Assume user is logged in and is in the Schedule Pickup screen
        self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="schedule_btn").click()
        
        share_gps_btn = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="share_gps_button")
        share_gps_btn.click()

        # Check for permission popup if present, accept it
        try:
            allow_permission = self.driver.find_element(by=AppiumBy.XPATH, value="//com.android.permissioncontroller:id/permission_allow_foreground_only_button")
            allow_permission.click()
        except Exception:
            pass # Already allowed

        success_badge = self.driver.find_element(by=AppiumBy.ACCESSIBILITY_ID, value="gps_success_badge")
        self.assertTrue(success_badge.is_displayed())

if __name__ == "__main__":
    unittest.main()
