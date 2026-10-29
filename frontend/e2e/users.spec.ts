import { test, expect } from "@playwright/test";

const apiUrl = process.env.E2E_API_BASE_URL;
if (!apiUrl) throw new Error("E2E_API_BASE_URL must be set by the Playwright configuration.");

test("overview and API reference work on desktop and mobile", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to Foundation" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: testInfo.outputPath("overview.png"),
    fullPage: true,
    style: "nextjs-portal { display: none; }",
  });
  await page.getByRole("link", { name: "View API reference", exact: true }).click();
  await page.getByRole("button", { name: "Check connection" }).click();
  await expect(page.getByRole("status")).toContainText("API is running.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("create, duplicate validation, reload, edit, search, and delete", async ({
  page,
  request,
}, testInfo) => {
  const marker = `${Date.now()}-${testInfo.project.name}`;
  const email = `junior-${marker}@example.com`;
  const name = `Junior ${marker}`;
  let userId: string | undefined;
  try {
    await page.goto("/users");
    await expect(page.getByRole("heading", { name: "All users" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^View / }).first()).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath("users.png"),
      fullPage: true,
      style: "nextjs-portal { display: none; }",
    });
    await page.getByRole("link", { name: "Add user", exact: true }).click();
    await page.getByLabel("Display name", { exact: true }).fill(name);
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Create user", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("The user was created.");
    userId = new URL(page.url()).pathname.split("/")[2];
    expect(userId).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();

    await page.goto("/users/new");
    await page.getByLabel("Display name", { exact: true }).fill("Duplicate example");
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Create user", exact: true }).click();
    await expect(page.getByText("This email is already in use.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue("Duplicate example");

    await page.goto(`/users/${userId}/edit`);
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(name);
    await page.getByLabel("Display name", { exact: true }).fill(`${name} edited`);
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("The user was updated.");
    await page.reload();
    await expect(page.getByRole("heading", { name: `${name} edited`, exact: true })).toBeVisible();

    await page.goto("/users");
    await page.getByLabel("Search users", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.getByRole("link", { name: `${name} edited`, exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.getByRole("link", { name: `${name} edited`, exact: true }).click();
    await page.getByRole("button", { name: "Delete user", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Keep user", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await page.getByRole("button", { name: "Delete user", exact: true }).click();
    await page.getByRole("button", { name: "Confirm deletion", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("The user was deleted.");
    const deleted = await request.get(`${apiUrl}/users/${userId}`);
    expect(deleted.status()).toBe(404);
    userId = undefined;
  } finally {
    // Delete only the record this test created; never clear the shared database.
    if (userId) await request.delete(`${apiUrl}/users/${userId}`);
  }
});
