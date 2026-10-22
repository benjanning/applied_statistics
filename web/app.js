"use strict";
const $ = (id) => document.getElementById(id);
const ns = "http://www.w3.org/2000/svg";
const number = (n) => n.toFixed(3);
function svgElement(name, attrs = {}, text = "") {
  const el = document.createElementNS(ns, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  if (text) el.textContent = text;
  return el;
}
function svg(label, height) {
  return svgElement("svg", {
    viewBox: `0 0 480 ${height}`,
    role: "img",
    "aria-label": label,
  });
}
function text(x, y, value, attrs = {}) {
  return svgElement("text", { x, y, ...attrs }, value);
}
function line(x1, y1, x2, y2, attrs = {}) {
  return svgElement("line", { x1, y1, x2, y2, stroke: "#647666", ...attrs });
}
function observationChart(data, mode) {
  const spread = mode === "sd";
  const chart = svg(
    `All 30 original dried-weight observations by condition, with means and ${spread ? "one sample standard deviation on either side" : "pointwise 95% t intervals"}. Exact values and bar endpoints are available in the group summaries and observation table.`,
    350,
  );
  const weights = data.observations.map((row) => row.weight),
    low = Math.floor(
      Math.min(
        ...weights,
        ...data.groups.flatMap((g) => [g.ci_low, g.mean - g.sd]),
      ),
    ),
    high = Math.ceil(
      Math.max(
        ...weights,
        ...data.groups.flatMap((g) => [g.ci_high, g.mean + g.sd]),
      ),
    );
  const y = (value) => 275 - ((value - low) / (high - low)) * 230;
  for (let tick = low; tick <= high; tick++) {
    chart.append(
      line(45, y(tick), 465, y(tick), { stroke: "#d4d9cb" }),
      text(35, y(tick) + 5, String(tick), { "text-anchor": "end" }),
    );
  }
  chart.append(text(45, 20, "Dried weight (dataset units)"));
  data.groups.forEach((group, i) => {
    const x = 115 + i * 140,
      observations = data.observations.filter(
        (row) => row.group === group.group,
      );
    observations.forEach((row, j) => {
      const point = svgElement("circle", {
        cx: x + (j - 4.5) * 4,
        cy: y(row.weight),
        r: 4.5,
        fill: ["#48725b", "#9b713d", "#266b69"][i],
      });
      point.append(
        svgElement(
          "title",
          {},
          `Row ${row.rownames}: ${group.label}, ${row.weight}`,
        ),
      );
      chart.append(point);
    });
    const lower = spread ? group.mean - group.sd : group.ci_low;
    const upper = spread ? group.mean + group.sd : group.ci_high;
    const range = line(x + 32, y(lower), x + 32, y(upper), {
      "stroke-width": 2,
      class: "mean-range",
      "data-group": group.group,
    });
    range.append(
      svgElement(
        "title",
        {},
        `${group.label}: ${spread ? "mean minus/plus one sample SD" : "pointwise 95% mean interval"}, ${number(lower)} to ${number(upper)}`,
      ),
    );
    chart.append(
      range,
      line(x + 26, y(lower), x + 38, y(lower)),
      line(x + 26, y(upper), x + 38, y(upper)),
    );
    chart.append(
      svgElement("path", {
        d: `M${x + 32},${y(group.mean) - 6} l6,6 l-6,6 l-6,-6 Z`,
        fill: "#243e32",
      }),
    );
    chart.append(
      text(x, 310, group.label, { "text-anchor": "middle" }),
      text(x, 332, `n = ${group.n}`, { "text-anchor": "middle" }),
    );
  });
  return chart;
}
function differenceChart(pair, all) {
  const lower = Math.floor(Math.min(0, ...all.map((p) => p.ci_low)) * 2) / 2,
    upper = Math.ceil(Math.max(0, ...all.map((p) => p.ci_high)) * 2) / 2;
  const x = (value) => 45 + ((value - lower) / (upper - lower)) * 390,
    chart = svg(
      `${pair.comparison}: difference ${number(pair.difference)}, adjusted interval ${number(pair.ci_low)} to ${number(pair.ci_high)} dataset units.`,
      230,
    );
  chart.append(
    line(x(0), 30, x(0), 160, { "stroke-dasharray": "5 5" }),
    line(45, 160, 435, 160),
  );
  for (let tick = lower; tick <= upper + 0.001; tick += 0.5)
    chart.append(
      line(x(tick), 160, x(tick), 166),
      text(x(tick), 187, tick.toFixed(1), { "text-anchor": "middle" }),
    );
  chart.append(
    line(x(pair.ci_low), 95, x(pair.ci_high), 95, { "stroke-width": 3 }),
    line(x(pair.ci_low), 85, x(pair.ci_low), 105, { "stroke-width": 2 }),
    line(x(pair.ci_high), 85, x(pair.ci_high), 105, { "stroke-width": 2 }),
    svgElement("circle", {
      cx: x(pair.difference),
      cy: 95,
      r: 7,
      fill: "#9b633b",
    }),
    text(240, 220, "Difference in mean dried weight (dataset units)", {
      "text-anchor": "middle",
    }),
  );
  return chart;
}
async function start() {
  const response = await fetch("data.json");
  if (!response.ok) throw Error("Analysis unavailable");
  const data = await response.json();
  if (
    data.schema_version !== 1 ||
    data.observations.length !== 30 ||
    data.comparisons.length !== 3
  )
    throw Error("Unexpected analysis");

  for (const group of data.groups) {
    const card = document.createElement("div");
    card.className = "group-card";
    card.dataset.group = group.group;
    const title = document.createElement("h4");
    title.textContent = group.label;
    const stats = document.createElement("p");
    stats.textContent = `n = ${group.n} · mean ${number(group.mean)} · SD ${number(group.sd)}`;
    const interval = document.createElement("p");
    interval.className = "fine";
    interval.textContent = `Pointwise 95% mean interval: ${number(group.ci_low)} to ${number(group.ci_high)}`;
    const active = document.createElement("p");
    active.className = "active-range";
    card.append(title, stats, interval, active);
    $("group-cards").append(card);
  }
  function renderObservations() {
    const mode = document.querySelector('input[name="bars"]:checked').value;
    const spread = mode === "sd";
    $("observations-chart").replaceChildren(observationChart(data, mode));
    $("bar-explanation").textContent = spread
      ? "These bars span one sample standard deviation either side of each mean. They describe individual variation; they are not confidence or prediction intervals and do not promise a fixed share of observations."
      : "These pointwise 95% t intervals describe uncertainty in each group mean under independence and approximate normality. They are not ranges for individual observations; their overlap is not a pairwise test.";
    for (const group of data.groups) {
      const lower = spread ? group.mean - group.sd : group.ci_low;
      const upper = spread ? group.mean + group.sd : group.ci_high;
      document.querySelector(
        `.group-card[data-group="${group.group}"] .active-range`,
      ).textContent =
        `${spread ? "Shown: mean ± 1 SD" : "Shown: 95% mean interval"}: ${number(lower)} to ${number(upper)} dataset units`;
    }
  }
  for (const radio of document.querySelectorAll('input[name="bars"]'))
    radio.addEventListener("change", renderObservations);
  renderObservations();
  for (const [i, pair] of data.comparisons.entries()) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = pair.comparison;
    $("pair").append(option);
    const row = document.createElement("tr");
    row.dataset.pair = i;
    [
      pair.comparison,
      number(pair.difference),
      `${number(pair.ci_low)} to ${number(pair.ci_high)}`,
      pair.p_bonferroni.toFixed(4),
    ].forEach((value, j) => {
      const cell = document.createElement(j === 0 ? "th" : "td");
      if (j === 0) cell.scope = "row";
      cell.textContent = value;
      row.append(cell);
    });
    $("pair-table").append(row);
  }
  for (const observation of data.observations) {
    const row = document.createElement("tr");
    [
      observation.rownames,
      data.groups.find((group) => group.group === observation.group).label,
      observation.weight.toFixed(2),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    $("observations-table").append(row);
  }
  $("omnibus").textContent =
    `The preselected primary omnibus comparison is Welch one-way ANOVA (p = ${data.analysis.welch_p.toFixed(4)}). Classic equal-variance ANOVA is a sensitivity analysis (p = ${data.analysis.classic_p.toFixed(4)}). An omnibus result does not imply every pair differs.`;
  $("receipt").textContent =
    `Source revision: ${data.source_revision}. Original dataset SHA-256: ${data.analysis.dataset_sha256}. All charts and summaries use the same exported computation.`;
  function render() {
    const index = Number($("pair").value),
      pair = data.comparisons[index];
    $("pair-title").textContent = pair.comparison;
    $("difference").textContent =
      (pair.difference > 0 ? "+" : "") + number(pair.difference);
    $("interval").textContent =
      `Adjusted 95% difference interval: ${number(pair.ci_low)} to ${number(pair.ci_high)} dataset units.`;
    $("adjusted-p").textContent =
      `Bonferroni-adjusted p = ${pair.p_bonferroni.toFixed(4)} (three comparisons).`;
    $("pair-story").textContent =
      pair.ci_low <= 0 && pair.ci_high >= 0
        ? "The adjusted interval includes zero. These data remain compatible with differences in either direction under the model; this does not establish that the conditions are equivalent."
        : "The adjusted interval excludes zero under this model. Its width still matters: statistical evidence of a difference does not establish practical usefulness or general effectiveness.";
    $("difference-chart").replaceChildren(
      differenceChart(pair, data.comparisons),
    );
    for (const row of $("pair-table").rows)
      row.classList.toggle("selected", Number(row.dataset.pair) === index);
    $("selection-status").textContent =
      `${pair.comparison}. Difference ${number(pair.difference)}. Adjusted interval ${number(pair.ci_low)} to ${number(pair.ci_high)}. Adjusted p ${pair.p_bonferroni.toFixed(4)}.`;
  }
  $("pair").addEventListener("change", render);
  render();
  $("results").hidden = false;
}
start().catch(() => {
  $("failure").hidden = false;
});
