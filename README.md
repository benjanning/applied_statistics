# Plant growth & statistics

Thirty observations, three growing conditions, and a careful look at differences and uncertainty.

![Verified PlantGrowth comparison lab](https://raw.githubusercontent.com/benjanning/applied_statistics/portfolio-published/portfolio/export/assets/explorer.png)

**Python · pandas · SciPy · Matplotlib · JavaScript**

[Explore the comparisons](https://benjanning.github.io/applied_statistics/) · [Visual case study](https://benjanning.github.io/projects/projects/applied-statistics/) · [Portfolio](https://benjanning.github.io/projects/)

## Explore size and uncertainty

The comparison lab shows all thirty original measurements, sample means, SDs and pointwise mean intervals. Select a pair to inspect its raw mean difference, familywise adjusted interval and adjusted p-value on the same axis scale. Controls read saved results; they do not change the statistical method.

The original row identifiers and weights remain available in an accessible table and unchanged CSV download. The interface distinguishes individual variability from uncertainty, and statistical evidence from practical importance. No minimum worthwhile difference is invented.

[Export architecture, metric interpretation and test coverage](COMPARISON-LAB.md)

## What the analysis shows

The sample contains ten dried-weight measurements for each of a control and two treatment conditions. Every observation is visible. The treatment means differ in this sample, but statistical evidence does not establish general effectiveness or say that every pair differs.

![Group means and pointwise uncertainty](results/group-means.png)

The mean plot uses pointwise 95% t intervals. Their overlap is not a pairwise significance test. Welch one-way ANOVA is the primary omnibus comparison; the classic equal-variance result is shown separately as sensitivity analysis, rather than selecting whichever gives a smaller p-value.

![Adjusted pairwise differences](results/pairwise-differences.png)

Three two-sided Welch comparisons use a Bonferroni adjustment. The plotted difference intervals are familywise 95% Welch approximations; they are distinct from the pointwise mean intervals above. A p-value measures compatibility with a model, not the chance that a hypothesis is true, practical importance or a causal treatment effect.

## Reproduce and inspect

```bash
python -m pip install -r requirements.txt
python analyze_plants.py
python -m unittest discover -p "test_*.py" -v
python build_explorer.py
python -m http.server 8092 --bind 127.0.0.1 --directory docs
```

Source UI is in `web/`; generated `docs/` uses `results/explorer-data.json`. For browser verification run `npm ci`, `npx playwright install chromium` and `npm run test:browser` (it starts its own temporary local server).

Six Python regressions reconcile classic ANOVA independently, preserve every source row, check sample SD and adjusted intervals against SciPy, and reproduce numeric outputs exactly. Three browser journeys verify every pair, exact displayed values, original observation table, keyboard selection, mobile layout and loading failure. Inspect [analysis.json](results/analysis.json), [group-summary.csv](results/group-summary.csv) and [pairwise-comparisons.csv](results/pairwise-comparisons.csv). The source hash and environment versions are recorded.

## Context and limits

The preserved [PlantGrowth.csv](PlantGrowth.csv) is the R teaching dataset documented by [R's datasets manual](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/PlantGrowth.html), which identifies Dobson's statistical modelling text as its source. Weight units are left as dataset units; grams are not invented. The original design and independence cannot be verified from this CSV, n=10 per group is small, and normality/variance assumptions matter. Methods were selected for educational analysis, not preregistered confirmation.

The original `project.ipynb` and its other statistical exercises remain intact. The new script complements that coursework with a compact reproducible presentation. The single source workflow verifies calculations and browser journeys, deploys the generated static explorer to Pages, and exports matching commit-identified visuals and a computed result summary to the existing central portfolio review-PR process.

[Original coursework and references](COURSEWORK.md) · [Visual provenance](assets/PROVENANCE.md)
