import { test as base, expect, Page } from "@playwright/test";
// import { LoginPage } from "../pages/loginPage";
import dot from "dotenv";
import path from "node:path";
dot.config({ path: ".env" });
import fs from "fs";
interface MyTestLoginFixture {
  page: Page;
}

interface MyWorkerFixture {
  workerStateStorage: string;
  authRole: string;
}

async function authenticateAndSaveStateStorage(page: Page, path: string) {
  await page.goto("https://www.saucedemo.com/");
  await page.getByPlaceholder("Username").fill("standard_user");
  await page.getByPlaceholder("Password").fill("secret_sauce");
  await page.getByRole("button", { name: "Login" }).click();
  console.log("workerStateStorage run :", path);

  await expect(page).toHaveURL(/inventory\.html/);
  await expect(page.locator(".title")).toHaveText("Products");
  const cookies = await page.context().cookies()
  console.log("Cookies",cookies)
  await page.context().storageState({ path });
}

export const test = base.extend<MyTestLoginFixture, MyWorkerFixture>({
  authRole: ["STANDARD_USER", { scope: "worker", option: true }],
  workerStateStorage: [
    async ({ authRole, browser }, use, testInfo) => {
      const context = await browser.newContext();
      const stateStoragePath = `playwright/.auth/${authRole + testInfo.workerIndex}.json`;
      const page = await context.newPage();
      const dir = path.join(path.resolve(), stateStoragePath);
      console.log(dir);
      if (!fs.existsSync(dir)) {
        console.log("Creating the session...");
        await authenticateAndSaveStateStorage(page, stateStoragePath);
      }
      else{
        console.log("Re-using the exists sessions...");

      }
      await use(stateStoragePath);
      await context.close();
    },
    { scope: "worker" },
  ],

  storageState: async ({ workerStateStorage }, use) => {
    await use(workerStateStorage);
  },

  page: async ({ browser, storageState }, use, testInfo) => {
    console.log("PAGE  FIXTURE ");
    const context = await browser.newContext({
      storageState,
    });
    console.log("PAGE LEVEL FIXTURE ", testInfo.workerIndex);
    const page = await context.newPage();
    //  await page.context().storageState({ path: "playwright/.auth/user.json" });
    await use(page);
    await context.close();
  },
});

export { expect };
