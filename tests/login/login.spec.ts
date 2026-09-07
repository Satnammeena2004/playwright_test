import { test } from "@/fixtures/login.fixture";
import { LoginPage } from "@/pages/loginPage";
import dot from "dotenv";
dot.config({ path: ".env" });

test.describe("Login flow", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    console.log("==== LOGIN TEST STARTED  =====");
    loginPage = new LoginPage(page);
    loginPage.goto()
  });

  test.skip("Positive login | correct email and password should login", async ({page}) => {
    test.step("Fill the  username and password", async () => {
      await loginPage.fillUsername(process.env.STANDARD_USER as string);
      await loginPage.fillPassword(process.env.PASSWORD as string);
    });

    test.step("user successfully login", async () => {
      loginPage.waitForPageLoad();
    });
  });
});
