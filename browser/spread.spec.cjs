const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const base = process.env.EXPLORER_BASE || "http://127.0.0.1:8092/";
const rows = fs
  .readFileSync("PlantGrowth.csv", "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [index, weight, group] = line.split(",");
    return { index: Number(index), weight: Number(weight), group };
  });
const labels = { ctrl: "Control", trt1: "Treatment 1", trt2: "Treatment 2" };
const groups = Object.keys(labels).map((group) => {
  const y = rows.filter((row) => row.group === group).map((row) => row.weight);
  const mean = y.reduce((sum, n) => sum + n, 0) / y.length;
  const sd = Math.sqrt(
    y.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (y.length - 1),
  );
  // Independent t(9) two-sided 95% reference; Python also checks the SciPy interval API.
  const margin = (2.2621571628540993 * sd) / Math.sqrt(y.length);
  return { group, mean, sd, ci_low: mean - margin, ci_high: mean + margin };
});
const low = Math.floor(
  Math.min(
    ...rows.map((row) => row.weight),
    ...groups.flatMap((g) => [g.ci_low, g.mean - g.sd]),
  ),
);
const high = Math.ceil(
  Math.max(
    ...rows.map((row) => row.weight),
    ...groups.flatMap((g) => [g.ci_high, g.mean + g.sd]),
  ),
);
const y = (value) => 275 - ((value - low) / (high - low)) * 230;
for (const width of [1440, 390])
  test(`individual spread and mean uncertainty reconcile at ${width}px`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(base);
    await expect(page.locator("#results")).toBeVisible();
    const points = () =>
      page
        .locator("#observations-chart circle")
        .evaluateAll((nodes) =>
          nodes.map((node) => [
            node.getAttribute("cx"),
            node.getAttribute("cy"),
            node.textContent,
          ]),
        );
    const original = await points();
    expect(original).toHaveLength(30);
    const pairBefore = await page.locator("#difference-chart").innerHTML();
    for (const mode of ["sd", "ci"]) {
      await page
        .getByRole("radio", {
          name:
            mode === "sd"
              ? "Spread: mean ± 1 SD"
              : "Uncertainty: 95% mean interval",
          exact: true,
        })
        .check();
      await expect(page.locator("#observations-chart svg")).toHaveAttribute(
        "aria-label",
        new RegExp(
          mode === "sd" ? "one sample standard deviation" : "pointwise 95%",
        ),
      );
      for (const group of groups) {
        const lower = mode === "sd" ? group.mean - group.sd : group.ci_low;
        const upper = mode === "sd" ? group.mean + group.sd : group.ci_high;
        const bar = page.locator(`.mean-range[data-group="${group.group}"]`);
        expect(Number(await bar.getAttribute("y1"))).toBeCloseTo(y(lower), 7);
        expect(Number(await bar.getAttribute("y2"))).toBeCloseTo(y(upper), 7);
        await expect(
          page.locator(
            `.group-card[data-group="${group.group}"] .active-range`,
          ),
        ).toHaveText(
          `${mode === "sd" ? "Shown: mean ± 1 SD" : "Shown: 95% mean interval"}: ${lower.toFixed(3)} to ${upper.toFixed(3)} dataset units`,
        );
      }
      expect(await points()).toEqual(original);
      expect(await page.locator("#difference-chart").innerHTML()).toEqual(
        pairBefore,
      );
      await expect(page.locator("#bar-explanation")).toContainText(
        mode === "sd"
          ? "not confidence or prediction intervals"
          : "overlap is not a pairwise test",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      fs.mkdirSync("verification/screenshots", { recursive: true });
      await page
        .locator(".overview")
        .screenshot({
          path: `verification/screenshots/${mode === "sd" ? "spread" : "mean-interval"}-${width}.jpg`,
          type: "jpeg",
          quality: 85,
        });
    }
    await page
      .getByRole("radio", {
        name: "Uncertainty: 95% mean interval",
        exact: true,
      })
      .focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("radio", { name: "Spread: mean ± 1 SD", exact: true }),
    ).toBeChecked();
    await expect(
      page.getByRole("radio", { name: "Spread: mean ± 1 SD", exact: true }),
    ).toBeFocused();
    await page.getByLabel("Compare conditions").selectOption("2");
    await expect(page.locator("#pair-title")).toHaveText(
      "Treatment 2 minus Treatment 1",
    );
    expect(await points()).toEqual(original);
    expect(errors).toEqual([]);
  });
