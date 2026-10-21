const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const data = require("../docs/data.json");
const base = process.env.EXPLORER_BASE || "http://127.0.0.1:8092/";
for (const width of [1440, 390])
  test(`observations, adjusted comparisons and accessible layout at ${width}px`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(base);
    await expect(page.locator("#results")).toBeVisible();
    await expect(page.locator("#observations-chart circle")).toHaveCount(30);
    await expect(page.locator("#group-cards .group-card")).toHaveCount(3);
    for (const [index, pair] of data.comparisons.entries()) {
      await page.getByLabel("Compare conditions").selectOption(String(index));
      await expect(page.locator("#pair-title")).toHaveText(pair.comparison);
      await expect(page.locator("#difference")).toHaveText(
        (pair.difference > 0 ? "+" : "") + pair.difference.toFixed(3),
      );
      await expect(page.locator("#interval")).toContainText(
        `${pair.ci_low.toFixed(3)} to ${pair.ci_high.toFixed(3)}`,
      );
      await expect(page.locator("#adjusted-p")).toContainText(
        pair.p_bonferroni.toFixed(4),
      );
      await expect(page.locator("#difference-chart svg")).toHaveAttribute(
        "aria-label",
        new RegExp(pair.comparison),
      );
      await expect(page.locator("#pair-table .selected th")).toHaveText(
        pair.comparison,
      );
      await expect(page.locator("#pair-story")).toContainText(
        pair.ci_low <= 0 && pair.ci_high >= 0
          ? "includes zero"
          : "excludes zero",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page
      .getByText("Inspect all 30 source observations", { exact: true })
      .click();
    await expect(page.locator("#observations-table tr")).toHaveCount(30);
    for (const [index, row] of data.observations.entries())
      await expect(
        page.locator("#observations-table tr").nth(index).locator("td").nth(2),
      ).toHaveText(row.weight.toFixed(2));
    await page
      .getByText("Inspect all 30 source observations", { exact: true })
      .click();
    await page.getByLabel("Compare conditions").focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Tab");
    await expect(page.locator("#pair-title")).toHaveText(
      data.comparisons[1].comparison,
    );
    fs.mkdirSync("verification/screenshots", { recursive: true });
    await page.screenshot({
      path: `verification/screenshots/explorer-${width}.jpg`,
      type: "jpeg",
      quality: 85,
      fullPage: true,
    });
    if (width === 1440) {
      await page
        .locator(".overview")
        .evaluate((el) =>
          el.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      await page.screenshot({ path: "verification/screenshots/explorer.png" });
      await page.getByLabel("Compare conditions").selectOption("2");
      await page
        .locator(".comparison")
        .evaluate((el) =>
          el.scrollIntoView({ block: "start", behavior: "instant" }),
        );
      await page.screenshot({
        path: "verification/screenshots/comparison-detail.png",
      });
    }
    expect(errors).toEqual([]);
  });
test("failed result loading has a recovery state", async ({ page }) => {
  await page.route("**/data.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto(base);
  await expect(page.getByRole("alert")).toContainText("Please reload");
  await expect(page.locator("#results")).toBeHidden();
});
