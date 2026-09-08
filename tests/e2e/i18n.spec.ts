import { test, expect } from "@playwright/test";
import { enterAsDoctor } from "./helpers";

test.describe("Localization / RTL / LTR", () => {
  test("Arabic patient dashboard is RTL with Arabic navigation", async ({ page }) => {
    await page.goto("/ar/patient");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("عائشة");
    await expect(page.locator("aside nav").getByText("الرئيسية")).toBeVisible();
    await expect(page.locator("aside nav").getByText("المسارات الصحية")).toBeVisible();
  });

  test("English patient dashboard is LTR with English navigation", async ({ page }) => {
    await page.goto("/en/patient");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("aside nav").getByText("Dashboard")).toBeVisible();
  });

  test("Arabic doctor patient view is RTL with Arabic labels", async ({ page }) => {
    await enterAsDoctor(page);
    await page.goto("/ar/doctor/patients/p04");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByText("المسارات السريرية")).toBeVisible(); // Clinical Threads (doctor)
    await expect(
      page.getByRole("heading", { name: "HbA1c increased", exact: true }),
    ).toBeVisible(); // data consistency
  });
});
