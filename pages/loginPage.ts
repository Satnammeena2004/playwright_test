import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly login_Button: Locator;
  errorMessage: Locator | null;
  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByPlaceholder("Username");
    this.passwordInput = page.getByPlaceholder("Password");
    this.login_Button = page.getByRole("button", {
      name: "Login",
      exact: true,
    });
    this.errorMessage = null;
  }
  async fillUsername(username: string) {
    await this.usernameInput.fill(username);
  }
  async fillPassword(password: string) {
    await this.usernameInput.fill(password);
  }
  async clickLogin() {
    await this.login_Button.click();
  }

  async assertForErrorMessage(message: string) {
    this.errorMessage = this.page.getByText(message);
    await expect(this.errorMessage).toBeVisible();
  }

  async login(username: string, password: string) {
    if (username && password) {
      await this.goto();
      await this.fillUsername(username);
      await this.fillPassword(password);
      await this.clickLogin();
      await this.waitForPageLoad();
    } else {
      throw new Error("Variables not undefined or empty");
    }
  }
}
