import { expect, test } from "@playwright/test";

test.describe("Best Wipe — Phase 1 skeleton", () => {
  test("loads the app with title bar, sidebar, and default chat", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Best Wipe/i);

    await expect(page.getByText("BEST WIPE", { exact: true })).toBeVisible();

    await expect(page.getByText(/DAY \d{2}/)).toBeVisible();

    await expect(page.getByRole("button", { name: /general/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /data-platform/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /kuba-lead/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /pm-ola/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /fin-grazyna/ })).toBeVisible();

    await expect(page.getByText(/Daj mi liczbę userów w bazie/)).toBeVisible();
    await expect(page.getByRole("button", { name: "PRZYJMIJ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ODRZUĆ" })).toBeVisible();
  });

  test("channels group renders before direct messages in the sidebar", async ({ page }) => {
    await page.goto("/");

    const headers = await page.locator(".df-sidebar h4").allTextContents();
    const groupHeaders = headers.filter(h => h !== "TY");
    expect(groupHeaders[0]).toBe("KANAŁY");
    expect(groupHeaders[1]).toBe("DIRECT MESSAGES");
  });

  test("chat panel has no message-input box", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".df-chat-foot")).toHaveCount(0);
    await expect(page.getByPlaceholder(/Napisz wiadomość/)).toHaveCount(0);
    await expect(page.locator('input[type="text"]')).toHaveCount(0);
    await expect(page.locator(".df-chat textarea")).toHaveCount(0);
  });

  test("ACCEPT auto-replies in chat and removes the action buttons", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "PRZYJMIJ" }).click();

    await expect(page.getByText("ok, biorę")).toBeVisible();

    await expect(page.getByRole("button", { name: "PRZYJMIJ" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "ODRZUĆ" })).toHaveCount(0);
  });

  test("REJECT auto-replies with the polite refusal", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "ODRZUĆ" }).click();

    await expect(page.getByText("nie dam rady teraz")).toBeVisible();
    await expect(page.getByRole("button", { name: "PRZYJMIJ" })).toHaveCount(0);
  });

  test("work-area tabs switch panes and render Mermaid diagrams", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("BRAK ZADAŃ")).toBeVisible();

    await page.getByRole("button", { name: "Schemat" }).click();
    await expect(page.getByRole("heading", { name: /SCHEMAT · Best Wipe/ })).toBeVisible();
    await expect(page.locator(".df-schema-diagram svg")).toBeVisible();

    await page.getByRole("button", { name: "Dokumentacja" }).click();
    await expect(page.getByText(/DATA HANDBOOK/)).toBeVisible();
    await expect(page.getByText(/Active user/i)).toBeVisible();

    await page.getByRole("button", { name: "Struktura" }).click();
    await expect(page.getByRole("heading", { name: /STRUKTURA · Best Wipe/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Diagram" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".df-org-tree svg")).toBeVisible();

    await page.getByRole("tab", { name: "Tabela" }).click();
    await expect(page.getByRole("columnheader", { name: /Dział/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Imię/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Nazwisko/ })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /Rola/ })).toBeVisible();
    await expect(page.getByText(/Junior Data Analyst/)).toBeVisible();

    await page.locator(".df-structure-table .df-result-filter-input").nth(3).fill("CEO");
    await expect(page.getByText("Marek")).toBeVisible();
    await expect(page.getByText(/Junior Data Analyst/)).toHaveCount(0);
  });

  test("SQL result stays visible after switching work-area tabs", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /Uruchom/ }).click();
    await expect(page.getByText(/wierszy/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("registration_date")).toBeVisible();

    await page.getByRole("button", { name: "Schemat" }).click();
    await expect(page.getByRole("heading", { name: /SCHEMAT/ })).toBeVisible();

    await page.getByRole("button", { name: "Zadania" }).click();
    await expect(page.getByText(/wierszy/)).toBeVisible();
    await expect(page.getByText("registration_date")).toBeVisible();
  });

  test("reading a direct message clears its unread badge", async ({ page }) => {
    await page.goto("/");

    const pmChannel = page.getByRole("button", { name: /pm-ola/ });
    await expect(pmChannel.locator(".badge")).toHaveText("1");

    await pmChannel.click();
    await expect(pmChannel.locator(".badge")).toHaveCount(0);
  });

  test("scheduled accounting messages arrive as separate DM bubbles with typing feedback", async ({
    page,
  }) => {
    await page.goto("/?debugTime=12:57");

    await page.getByRole("button", { name: /fin-grazyna/ }).click();
    await expect(page.locator(".df-empty")).toBeVisible();

    await expect(page.getByText(/Grażyna is typing/)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".df-empty")).toHaveCount(0);
    await expect(page.getByText(/Masz chwilę na drobną rzecz/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Nie zgadza mi się o 30 groszy/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Podeślij mi proszę listę transakcji/)).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.locator(".df-msg").filter({ hasText: "Grażyna K." })).toHaveCount(3);
  });

  test("direct message header shows avatar plus real person name", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".df-chat-head h2")).toContainText("Kuba S.");
    await expect(page.locator(".df-chat-head h2")).not.toContainText("@ kuba-lead");
    await expect(page.locator(".df-chat-head h2 img")).toBeVisible();
  });

  test("Notes autosave persists across reloads", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Notatki" }).click();
    const textarea = page.locator(".df-notes textarea");
    await expect(textarea).toBeVisible();

    const sentinel = `pamiętaj: dedup sales · ${Date.now()}`;
    await textarea.fill(sentinel);

    await expect(page.getByText(/Zapisano/)).toBeVisible({ timeout: 5_000 });

    await page.reload();
    await page.getByRole("button", { name: "Notatki" }).click();

    await expect(page.locator(".df-notes textarea")).toHaveValue(sentinel);
  });

  test("can pause and resume the day clock from the status bar", async ({ page }) => {
    await page.goto("/");

    const pauseBtn = page.getByRole("button", { name: /PAUZA/ });
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();

    const resumeBtn = page.getByRole("button", { name: /WZNÓW/ });
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    await expect(page.getByRole("button", { name: /PAUZA/ })).toBeVisible();
  });
});
