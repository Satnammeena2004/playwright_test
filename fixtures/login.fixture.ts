import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/loginPage";
import dot from "dotenv";
dot.config({ path: ".env" });

type LoginFixture = {
  login: LoginPage;
};

export const test = base.extend<LoginFixture>({
  login: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.STANDARD_USER as string,
      process.env.Password as string,
    );
    await use(loginPage);
  },
});
