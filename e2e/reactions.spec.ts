import { expect, test } from "@playwright/test";

test.describe("Best Wipe — message reactions", () => {
  test("adds, increments, and removes a reaction on a regular chat message", async ({ page }) => {
    await page.goto("/");

    const firstMsg = page.locator(".df-msg").filter({ hasText: "witaj w Best Wipe" });
    await expect(firstMsg).toBeVisible();

    await firstMsg.hover();
    const addBtn = firstMsg.getByRole("button", { name: "Dodaj reakcję" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const picker = firstMsg.getByRole("dialog", { name: "Wybierz reakcję" });
    await expect(picker).toBeVisible();
    const smile = picker.getByRole("button", { name: "smile" });
    await expect(smile).toBeVisible();
    await smile.click();

    await expect(picker).toHaveCount(0);
    const chip = firstMsg.locator(".df-react-chip", { hasText: "1" });
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute("aria-pressed", "true");

    await chip.click();
    await expect(firstMsg.locator(".df-react-chip")).toHaveCount(0);
  });

  test("does not render reactions on action_request or system messages", async ({ page }) => {
    await page.goto("/");

    const actionMsg = page.locator(".df-msg").filter({ hasText: "Daj mi liczbę userów w bazie" });
    await actionMsg.hover();
    await expect(actionMsg.getByRole("button", { name: "Dodaj reakcję" })).toHaveCount(0);

    const systemMsg = page.locator(".df-msg.system").first();
    await systemMsg.hover();
    await expect(systemMsg.getByRole("button", { name: "Dodaj reakcję" })).toHaveCount(0);
  });

  test("reactions persist when switching channels and back", async ({ page }) => {
    await page.goto("/");

    const msg = page.locator(".df-msg").filter({ hasText: "witaj w Best Wipe" });
    await msg.hover();
    await msg.getByRole("button", { name: "Dodaj reakcję" }).click();
    await msg
      .getByRole("dialog", { name: "Wybierz reakcję" })
      .getByRole("button", { name: "wink" })
      .click();

    // Navigate to another channel.
    await page.getByRole("button", { name: /general/ }).click();
    await expect(page.getByText(/Welcome do nowego pracownika/)).toBeVisible();

    // Back to lead_kuba — chip is still there.
    await page.getByRole("button", { name: /kuba-lead/ }).click();
    await expect(
      page.locator(".df-msg").filter({ hasText: "witaj w Best Wipe" }).locator(".df-react-chip"),
    ).toBeVisible();
  });
});
