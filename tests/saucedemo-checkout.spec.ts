// spec: tests/saucedemo-checkout.spec.ts
// seed: tests/seed.spec.ts

import { test, expect } from "@playwright/test";
test.use({ storageState: "playwright/.auth/user.json" });
test.describe("SauceDemo checkout flow", () => {
  test("logs in, adds the first two products to the cart, and completes checkout", async ({
    page,
  }) => {
    await test.step("Open authenticated inventory page", async () => {
      await page.goto("https://www.saucedemo.com/inventory.html");
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator(".title")).toHaveText("Products");
    });

    await test.step("Add the first two products to the cart", async () => {
      await page
        .locator('[data-test="add-to-cart-sauce-labs-backpack"]')
        .click();
      await page
        .locator('[data-test="add-to-cart-sauce-labs-bike-light"]')
        .click();

      await expect(
        page.locator('[data-test="shopping-cart-badge"]'),
      ).toHaveText("2");
    });

    await test.step("Open the cart and verify both items are present", async () => {
      await page.locator(".shopping_cart_link").click();

      await expect(page).toHaveURL(/cart\.html/);
      await expect(page.getByText("Your Cart", { exact: true })).toBeVisible();
      await expect(page.locator(".cart_item")).toHaveCount(2);
      await expect(page.getByText("Sauce Labs Backpack")).toBeVisible();
      await expect(page.getByText("Sauce Labs Bike Light")).toBeVisible();
    });

    await test.step("Start checkout and fill information", async () => {
      await page.getByRole("button", { name: "Checkout" }).click();

      await expect(page).toHaveURL(/checkout-step-one\.html/);
      await expect(page.locator(".title")).toHaveText(
        "Checkout: Your Information",
      );

      await page.getByPlaceholder("First Name").fill("Dummy");
      await page.getByPlaceholder("Last Name").fill("User");
      await page.getByPlaceholder("Zip/Postal Code").fill("12345");
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page).toHaveURL(/checkout-step-two\.html/);
      await expect(page.locator(".title")).toHaveText("Checkout: Overview");
    });

    await test.step("Finish the order and verify success", async () => {
      await expect(page.getByText("Sauce Labs Backpack")).toBeVisible();
      await expect(page.getByText("Sauce Labs Bike Light")).toBeVisible();

      await page.getByRole("button", { name: "Finish" }).click();

      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(
        page.getByRole("heading", { name: "Thank you for your order!" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Your order has been dispatched, and will arrive just as fast as the pony can get there!",
        ),
      ).toBeVisible();
    });
  });
  test("adds two products, removes the top cart item, verifies inventory buttons, and completes checkout", async ({
    page,
  }) => {
    await test.step("Open authenticated inventory page and add two products", async () => {
      await page.goto("https://www.saucedemo.com/inventory.html");
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator(".title")).toHaveText("Products");

      await page
        .locator('[data-test="add-to-cart-sauce-labs-backpack"]')
        .click();
      await page
        .locator('[data-test="add-to-cart-sauce-labs-bike-light"]')
        .click();

      await expect(
        page.locator('[data-test="shopping-cart-badge"]'),
      ).toHaveText("2");
    });

    await test.step("Open the cart and remove the top item", async () => {
      await page.locator(".shopping_cart_link").click();

      await expect(page).toHaveURL(/cart\.html/);
      await expect(page.getByText("Your Cart", { exact: true })).toBeVisible();
      await expect(page.locator(".cart_item")).toHaveCount(2);

      await page
        .locator(".cart_item")
        .first()
        .getByRole("button", { name: "Remove" })
        .click();

      await expect(page.locator(".cart_item")).toHaveCount(1);
      await expect(page.getByText("Sauce Labs Backpack")).not.toBeVisible();
      await expect(page.getByText("Sauce Labs Bike Light")).toBeVisible();
    });

    await test.step("Return to inventory and verify button states", async () => {
      await page.getByRole("button", { name: /Continue Shopping/ }).click();

      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator(".title")).toHaveText("Products");
      await expect(
        page.locator('[data-test="remove-sauce-labs-bike-light"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-test="add-to-cart-sauce-labs-backpack"]'),
      ).toBeVisible();
    });

    await test.step("Complete the remaining purchase", async () => {
      await page.locator('[data-test="shopping-cart-link"]').click();
      await page.getByRole("button", { name: "Checkout" }).click();

      await expect(page).toHaveURL(/checkout-step-one\.html/);
      await expect(page.locator(".title")).toHaveText(
        "Checkout: Your Information",
      );

      await page.getByPlaceholder("First Name").fill("Dummy");
      await page.getByPlaceholder("Last Name").fill("User");
      await page.getByPlaceholder("Zip/Postal Code").fill("12345");
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page).toHaveURL(/checkout-step-two\.html/);
      await expect(page.locator(".title")).toHaveText("Checkout: Overview");
      await expect(page.getByText("Sauce Labs Bike Light")).toBeVisible();
      await expect(page.getByText("Sauce Labs Backpack")).not.toBeVisible();

      await page.getByRole("button", { name: "Finish" }).click();

      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(
        page.getByText("Thank you for your order!", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Your order has been dispatched, and will arrive just as fast as the pony can get there!",
        ),
      ).toBeVisible();
    });
  });
  test("logs in, sorts items low to high, adds the first item, and completes purchase", async ({
    page,
  }) => {
    let firstProductName = "";

    await test.step("Open authenticated inventory page", async () => {
      await page.goto("https://www.saucedemo.com/inventory.html");
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(page.locator(".title")).toHaveText("Products");
    });

    await test.step("Sort products from low to high price and capture the first item", async () => {
      await page.getByRole("combobox").selectOption("lohi");

      const firstItem = page.locator(".inventory_item").first();
      const firstItemName = firstItem.locator(".inventory_item_name");
      const firstItemPrice = firstItem.locator(".inventory_item_price");

      await expect(firstItemName).toBeVisible();
      await expect(firstItemPrice).toBeVisible();
      await expect(firstItemPrice).toHaveText("$7.99");

      firstProductName = (await firstItemName.textContent())?.trim() ?? "";
      expect(firstProductName).not.toBe("");
    });

    await test.step("Add the first sorted item to the cart", async () => {
      await page
        .locator(".inventory_item")
        .first()
        .getByRole("button", { name: "Add to cart" })
        .click();

      await expect(
        page.locator('[data-test="shopping-cart-badge"]'),
      ).toHaveText("1");
    });

    await test.step("Open the cart and verify the selected item is present", async () => {
      await page.locator(".shopping_cart_link").click();

      await expect(page).toHaveURL(/cart\.html/);
      await expect(page.getByText("Your Cart", { exact: true })).toBeVisible();
      await expect(page.locator(".cart_item")).toHaveCount(1);
      await expect(page.getByText(firstProductName)).toBeVisible();
    });

    await test.step("Complete checkout", async () => {
      await page.getByRole("button", { name: "Checkout" }).click();

      await expect(page).toHaveURL(/checkout-step-one\.html/);
      await expect(page.locator(".title")).toHaveText(
        "Checkout: Your Information",
      );

      await page.getByPlaceholder("First Name").fill("Dummy");
      await page.getByPlaceholder("Last Name").fill("User");
      await page.getByPlaceholder("Zip/Postal Code").fill("12345");
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page).toHaveURL(/checkout-step-two\.html/);
      await expect(page.locator(".title")).toHaveText("Checkout: Overview");
      await expect(page.getByText(firstProductName)).toBeVisible();

      await page.getByRole("button", { name: "Finish" }).click();

      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(
        page.getByText("Thank you for your order!", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "Your order has been dispatched, and will arrive just as fast as the pony can get there!",
        ),
      ).toBeVisible();
    });
  });
});
