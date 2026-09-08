import { test, expect } from "@playwright/test";
import { switchIdentity } from "./helpers";

// Default demo identity is hero Patient 04, so patient pages load directly.

test.describe("Patient 04 hero journey", () => {
  test("walks the full patient journey across every section", async ({ page }) => {
    // Dashboard
    await page.goto("/en/patient");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("عائشة");
    await expect(page.getByText("Encounters")).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible(); // ECHO insight cards

    // Alerts & Recommendations
    await page.goto("/en/patient/alerts");
    await expect(page.getByRole("heading", { name: "Alerts", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recommendations" })).toBeVisible();

    // Timeline
    await page.goto("/en/patient/timeline");
    await expect(page.locator("ol li").first()).toBeVisible();

    // Labs + HbA1c trend chart
    await page.goto("/en/patient/labs");
    await expect(page.getByText("HbA1c").first()).toBeVisible();
    await expect(page.locator(".recharts-surface").first()).toBeVisible();

    // Medications
    await page.goto("/en/patient/medications");
    await expect(page.getByText("Lisinopril")).toBeVisible();

    // Reports
    await page.goto("/en/patient/reports");
    await expect(page.locator("article").first()).toBeVisible();

    // Appointments
    await page.goto("/en/patient/appointments");
    await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();

    // Doctors / Care Team
    await page.goto("/en/patient/doctors");
    await expect(page.getByText("Al-Qahtani")).toBeVisible();
    await expect(page.getByText("Cardiology")).toBeVisible();

    // Profile
    await page.goto("/en/patient/profile");
    await expect(page.locator("dl")).toContainText("MRN-100003");

    // Clinical Threads
    await page.goto("/en/patient/threads");
    await expect(page.getByText("A change worth following")).toBeVisible();
  });

  test("sidebar navigation between sections works (no dead links)", async ({ page }) => {
    await page.goto("/en/patient");
    const nav = page.locator("aside nav");
    for (const [label, url] of [
      ["Lab Results", "/patient/labs"],
      ["Medications", "/patient/medications"],
      ["Care Threads", "/patient/threads"],
      ["Alerts", "/patient/alerts"],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(url));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("ECHO Chat returns a grounded, non-diagnosis response", async ({ page }) => {
    await page.goto("/en/patient/chat");
    await page.getByRole("button", { name: /HbA1c/ }).click();
    // Grounded: mock reply cites a real Patient-04 record id.
    const assistant = page.locator(".whitespace-pre-wrap").last();
    await expect(assistant).toContainText(/p04-/, { timeout: 20_000 });
    // Non-diagnosis disclaimer is always present.
    await expect(page.getByText(/does not diagnose/i)).toBeVisible();
  });
});

test.describe("Patient isolation", () => {
  test("switching to Patient 05 shows only their own record data", async ({ page }) => {
    await page.goto("/en/patient/profile");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("عائشة"); // p04

    await switchIdentity(page, "p05");
    await page.goto("/en/patient/profile");

    // Assertions scope to the profile CONTENT (the demo picker legitimately
    // lists every account's name/MRN — that is the switcher, not leaked data).
    await expect(page.getByRole("heading", { level: 1 })).toContainText("سعود"); // p05
    await expect(page.locator("dl")).toContainText("MRN-100004"); // p05's record
    await expect(page.locator("dl")).not.toContainText("MRN-100003"); // no p04 record
  });
});

test.describe("Clinical Threads & Alerts flows", () => {
  test("thread resolve/reopen persists across refresh", async ({ page }) => {
    await page.goto("/en/patient/threads");
    // The patient card shows a friendly headline; identify the headache thread
    // via its summary text ("Headache was recorded …").
    const card = () => page.locator("article").filter({ hasText: "Headache was recorded" });
    await expect(card()).toBeVisible();

    // Normalize to OPEN regardless of prior state.
    if (await card().getByRole("button", { name: "Reopen" }).count()) {
      await card().getByRole("button", { name: "Reopen" }).click();
      await expect(card().getByText("Open", { exact: true })).toBeVisible({ timeout: 20_000 });
    }

    // Resolve → persists across refresh → reopen (restore).
    await card().getByRole("button", { name: "Resolve" }).click();
    await expect(card().getByText("Resolved", { exact: true })).toBeVisible({ timeout: 20_000 });

    await page.reload(); // viewing/re-sync must NOT reopen it
    await expect(card().getByText("Resolved", { exact: true })).toBeVisible();

    await card().getByRole("button", { name: "Reopen" }).click();
    await expect(card().getByText("Open", { exact: true })).toBeVisible({ timeout: 20_000 });
  });

  test("alerts page shows attention + recommendations with working deep-links", async ({
    page,
  }) => {
    await page.goto("/en/patient/alerts");
    await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recommendations" })).toBeVisible();
    await expect(page.getByText("A change worth following").first()).toBeVisible(); // hero HbA1c

    await page.getByRole("link", { name: "Details" }).first().click();
    await expect(page).toHaveURL(/\/patient\/(labs|appointments|timeline)/);
  });
});
