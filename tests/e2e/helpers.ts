import { expect, type Page } from "@playwright/test";

/** Enter the demo as a patient (defaults to hero Patient 04). */
export async function enterAsPatient(page: Page) {
  await page.goto("/en");
  await page.getByRole("button", { name: "Enter as Patient" }).click();
  await page.waitForURL("**/patient");
}

/** Enter the demo as the doctor authorized for Patient 04 (featured = doc-33). */
export async function enterAsDoctor(page: Page) {
  await page.goto("/en");
  await page.getByRole("button", { name: "Enter as Doctor" }).click();
  await page.waitForURL("**/doctor");
}

/** Switch the active identity via the top-bar picker and wait for the server
 * round-trip to re-render with the new selection. */
export async function switchIdentity(page: Page, value: string) {
  await page.locator("header select").selectOption(value);
  await expect(page.locator("header select")).toHaveValue(value, { timeout: 20_000 });
}
