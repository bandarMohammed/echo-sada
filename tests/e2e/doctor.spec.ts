import { test, expect } from "@playwright/test";
import { enterAsDoctor, switchIdentity } from "./helpers";

test.describe("Doctor hero journey", () => {
  test("caseload → Patient 04 → overview, threads, labs, pre-visit ECHO", async ({ page }) => {
    await enterAsDoctor(page); // doc-33, authorized for Patient 04
    await expect(page).toHaveURL(/\/doctor$/);

    // Patient 04 appears in the authorized caseload.
    const p04Card = page.getByRole("link").filter({ hasText: "عائشة المطيري" });
    await expect(p04Card).toBeVisible();
    await p04Card.click();
    await page.waitForURL("**/doctor/patients/p04");

    // Overview + name
    await expect(page.getByRole("heading", { level: 1 })).toContainText("عائشة");

    // Clinical Threads + hero thread + evidence
    await expect(page.getByRole("heading", { name: "Clinical Threads" })).toBeVisible();
    const hba1cThread = page.locator("article").filter({ hasText: "HbA1c increased" });
    await expect(hba1cThread.getByRole("heading", { name: "HbA1c increased", exact: true })).toBeVisible();
    await expect(hba1cThread.getByText("LabResult").first()).toBeVisible();

    // Attention (freshness) + Labs trend
    await expect(page.getByText("Labs & trends")).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();

    // Timeline
    await expect(page.getByText("Clinical timeline")).toBeVisible();

    // Doctor ECHO pre-visit briefing (mock → deterministic, renders quickly)
    await expect(page.getByText("ECHO Pre-Visit Briefing")).toBeVisible();
    await expect(page.getByText("Journey summary")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Doctor authorization / zero leak", () => {
  test("an unauthorized doctor is blocked and no Patient 04 data leaks", async ({ page }) => {
    await enterAsDoctor(page); // start authorized (doc-33)
    await switchIdentity(page, "doc-01"); // unrelated to Patient 04

    await page.goto("/en/doctor/patients/p04");
    await expect(page.getByText(/not authorized/i)).toBeVisible();

    const body = (await page.locator("main").innerText()).toLowerCase();
    expect(body).not.toContain("hba1c");
    expect(body).not.toContain("8.3");
    expect(body).not.toContain("عائشة");
    expect(body).not.toContain("clinical threads");
    expect(body).not.toContain("labresult");
  });
});
