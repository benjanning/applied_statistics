# Compare size and uncertainty, not just p-values

The explorer makes the existing PlantGrowth analysis easier to inspect. It adds no observations, removes none, and preserves the preselected Welch methods, three-pair Bonferroni adjustment and classic ANOVA sensitivity analysis. Its useful effect size is the raw difference in sample mean dried weight, expressed in the original dataset units. A standardized effect is unnecessary for understanding these three groups on the same measurement scale.

## One computation, two presentations

`analyze_plants.py` calculates the observations, group means/sample SDs, pointwise 95% t intervals and three pairwise Welch comparisons. The same in-memory objects feed the original figures and `results/explorer-data.json`. The latter contains every original row identifier and measurement, explicit comparison directions, unrounded numerical results, source hash and method/environment details. `build_explorer.py` checks the source hash again, attaches the exact Git revision, copies the source interface from `web/`, and preserves the original CSV bytes for download. Generated `docs/` is ignored in Git and rebuilt in CI.

The browser reads those saved values. Selecting a pair changes only the view, never the method or the analysis. Mean differences and adjusted intervals share a fixed axis scale across all three choices. All thirty observations and group mean intervals stay visible in the overview. Horizontal offsets separate points; only their vertical weight coordinate is a measurement. A complete accessible table preserves exact source weights as an alternative to the plot.

## Distinguish the quantities

- Sample SD describes individual variation. A confidence interval describes uncertainty about a mean under model assumptions.
- Pointwise group mean intervals are not simultaneous pairwise difference intervals, and their overlap is not a pairwise test.
- The three two-sided Welch comparisons use Bonferroni-adjusted p-values and familywise 95% Welch-approximation intervals. Each individual interval uses confidence level `1 - .05/3`.
- A difference is named explicitly: Treatment 2 minus Treatment 1 means `mean(trt2) - mean(trt1)`.
- An interval including zero does not prove equivalence. Excluding zero does not establish a useful effect or general effectiveness.

For example, the Treatment 2 minus Treatment 1 sample difference is +0.865 dataset units, with adjusted interval approximately 0.085 to 1.645 and adjusted p approximately 0.0279. That broad range is part of the result. No minimum worthwhile difference or application-specific benefit is supplied by this teaching dataset, so significance alone cannot select a practically useful treatment.

Six Python regressions preserve reproducibility, independently reconcile classic ANOVA, verify every observation and sample SD, and compare the adjusted intervals/degrees of freedom with SciPy's Welch-test confidence-interval API. Three browser journeys check all three pairs at desktop/mobile widths, original row values, exact rendered differences/intervals/p-values, native keyboard selection, overflow and result-loading failure. Genuine captures come from those verified journeys.

## Interpretation and attribution

Ten observations per group provide limited information about distributional assumptions; independence and the original design cannot be verified from this CSV. No diagnostic p-value selects a more favourable method. Welch ANOVA stays primary and classic equal-variance ANOVA stays a sensitivity analysis. No causal or general treatment recommendation is claimed. Original coursework, raw measurements and figures remain intact.

The [R PlantGrowth documentation](https://stat.ethz.ch/R-manual/R-devel/library/datasets/html/PlantGrowth.html) identifies a control and two treatment conditions measured by dried plant weight, and credits Dobson's statistical modelling text. Units are retained as dataset units. [SciPy's independent-samples test documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html) documents `equal_var=False` for Welch's test and its confidence-interval API. These references support the preserved method; the numerical findings come from the supplied CSV and reproducible source code.
