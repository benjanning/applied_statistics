"""Reproducible PlantGrowth analysis alongside the preserved coursework notebook."""

from pathlib import Path
import json, hashlib, platform, itertools
import numpy as np, pandas as pd, scipy
from scipy import stats
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
GROUPS = ["ctrl", "trt1", "trt2"]
LABELS = ["Control", "Treatment 1", "Treatment 2"]
COLORS = ["#c0d4bd", "#ddc695", "#78a184"]


def analyze(output=None, figures=True):
    source = ROOT / "PlantGrowth.csv"
    data = pd.read_csv(source)
    if (
        not data.rownames.is_unique
        or set(data.group) != set(GROUPS)
        or not np.isfinite(data.weight).all()
        or data.groupby("group").size().to_dict() != dict.fromkeys(GROUPS, 10)
    ):
        raise ValueError("Expected 30 finite observations in three groups of ten")
    out = Path(output) if output else ROOT / "results"
    out.mkdir(parents=True, exist_ok=True)
    values = [data.loc[data.group == g, "weight"].to_numpy() for g in GROUPS]
    summaries = []
    for group, y in zip(GROUPS, values):
        mean = float(np.mean(y))
        sd = float(np.std(y, ddof=1))
        margin = float(stats.t.ppf(0.975, len(y) - 1) * sd / np.sqrt(len(y)))
        summaries.append(
            dict(
                group=group,
                n=len(y),
                mean=mean,
                sd=sd,
                ci_low=mean - margin,
                ci_high=mean + margin,
            )
        )
    summary = pd.DataFrame(summaries)
    summary.to_csv(out / "group-summary.csv", index=False)
    welch = stats.f_oneway(*values, equal_var=False)
    classic = stats.f_oneway(*values)
    pairs = []
    for i, j in itertools.combinations(range(3), 2):
        a, b = values[i], values[j]
        va = np.var(a, ddof=1) / len(a)
        vb = np.var(b, ddof=1) / len(b)
        se = np.sqrt(va + vb)
        df = (va + vb) ** 2 / (va**2 / (len(a) - 1) + vb**2 / (len(b) - 1))
        difference = float(np.mean(b) - np.mean(a))
        margin = float(stats.t.ppf(1 - 0.05 / (2 * 3), df) * se)
        test = stats.ttest_ind(b, a, equal_var=False)
        pairs.append(
            dict(
                comparison=LABELS[j] + " minus " + LABELS[i],
                difference=difference,
                ci_low=difference - margin,
                ci_high=difference + margin,
                p_raw=float(test.pvalue),
                p_bonferroni=min(1.0, float(test.pvalue) * 3),
                welch_df=float(df),
            )
        )
    pairs = pd.DataFrame(pairs)
    pairs.to_csv(out / "pairwise-comparisons.csv", index=False)
    evidence = dict(
        rows=len(data),
        groups=GROUPS,
        primary="Welch one-way ANOVA",
        welch_F=float(welch.statistic),
        welch_p=float(welch.pvalue),
        classic_F=float(classic.statistic),
        classic_p=float(classic.pvalue),
        pairwise="Three two-sided Welch comparisons; Bonferroni family adjustment, alpha .05",
        mean_intervals="Pointwise 95% t intervals, not simultaneous",
        difference_intervals="Bonferroni-adjusted familywise 95% Welch-approximation intervals",
        dataset_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        python=platform.python_version(),
        numpy=np.__version__,
        pandas=pd.__version__,
        scipy=scipy.__version__,
    )
    (out / "analysis.json").write_text(
        json.dumps(evidence, indent=2) + "\n", encoding="utf-8"
    )
    # The interface and static figures share these exact computed objects.
    report = dict(
        schema_version=1,
        analysis=evidence,
        observations=data.to_dict(orient="records"),
        groups=[
            dict(row, label=LABELS[i])
            for i, row in enumerate(summary.to_dict(orient="records"))
        ],
        comparisons=[
            dict(row, first=GROUPS[i], second=GROUPS[j])
            for row, (i, j) in zip(
                pairs.to_dict(orient="records"), itertools.combinations(range(3), 2)
            )
        ],
    )
    (out / "explorer-data.json").write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )
    example = pairs.iloc[2]
    text = f"Thirty source observations, ten per group. Sample means: control {summary.iloc[0]['mean']:.3f}, treatment 1 {summary.iloc[1]['mean']:.3f}, treatment 2 {summary.iloc[2]['mean']:.3f} (dataset units). Primary Welch omnibus p={welch.pvalue:.4f}; classic ANOVA p={classic.pvalue:.4f} is a sensitivity analysis. All three Welch comparisons use Bonferroni adjustment. Treatment 2 minus Treatment 1: {example.difference:+.3f} dataset units, adjusted 95% interval {example.ci_low:.3f} to {example.ci_high:.3f}, adjusted p={example.p_bonferroni:.4f}. The explorer preserves all measurements and methods. No practical-benefit threshold or general treatment effectiveness is established."
    (out / "portfolio-summary.txt").write_text(text + "\n", encoding="utf-8")
    if figures:
        plot(values, summary, pairs, out)
    return evidence


def plot(values, summary, pairs, out):
    plt.rcParams.update(
        {
            "figure.facecolor": "#f5f5ed",
            "axes.facecolor": "#f5f5ed",
            "font.family": "DejaVu Sans",
            "font.size": 11,
            "axes.spines.right": False,
            "axes.spines.top": False,
            "text.color": "#214b3b",
            "axes.labelcolor": "#214b3b",
            "xtick.color": "#536c5b",
            "ytick.color": "#536c5b",
        }
    )

    def save(fig, name):
        fig.savefig(out / name, dpi=160, bbox_inches="tight")
        plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 6))
    boxes = ax.boxplot(
        values,
        patch_artist=True,
        tick_labels=LABELS,
        widths=0.4,
        showfliers=False,
        medianprops=dict(color="#214b3b", linewidth=2),
    )
    rng = np.random.default_rng(40)
    for i, (y, color, box) in enumerate(zip(values, COLORS, boxes["boxes"]), 1):
        box.set_facecolor(color)
        ax.scatter(
            rng.normal(i, 0.045, len(y)),
            y,
            color="#366345",
            s=48,
            edgecolor="white",
            linewidth=0.7,
            zorder=3,
        )
    ax.set(
        ylabel="Dried weight (dataset units)",
        title="Three conditions. Thirty individual observations.",
    )
    fig.text(
        0.13,
        0.015,
        "Every point is a source observation (n=10 per group). Jitter only separates overlapping points; boxes show median and quartiles.",
        fontsize=8,
        color="#6a7566",
    )
    fig.tight_layout(rect=(0, 0.05, 1, 1))
    save(fig, "observations.png")
    fig, ax = plt.subplots(figsize=(10, 5.7))
    positions = np.arange(3)
    ax.errorbar(
        summary["mean"],
        positions,
        xerr=[summary["mean"] - summary.ci_low, summary.ci_high - summary["mean"]],
        fmt="o",
        color="#3b7150",
        capsize=7,
        markersize=11,
        linewidth=2,
    )
    for i, row in summary.iterrows():
        ax.text(
            row.ci_high + 0.08,
            i,
            f'{row["mean"]:.3f} · n={int(row.n)}',
            va="center",
            fontsize=10,
            color="#63755d",
        )
    ax.set(
        yticks=positions,
        yticklabels=LABELS,
        xlabel="Mean dried weight (dataset units)",
        xlim=(3.6, 6.7),
        title="Compare the means. Show the uncertainty.",
    )
    ax.invert_yaxis()
    fig.text(
        0.16,
        0.015,
        "Pointwise 95% t intervals assume independent observations and approximate normality. Interval overlap is not a pairwise test.",
        fontsize=8,
        color="#6a7566",
    )
    fig.tight_layout(rect=(0, 0.05, 1, 1))
    save(fig, "group-means.png")
    fig, ax = plt.subplots(figsize=(10.5, 5.7))
    positions = np.arange(3)
    ax.axvline(0, color="#b0bca8", linestyle="--")
    ax.errorbar(
        pairs.difference,
        positions,
        xerr=[pairs.difference - pairs.ci_low, pairs.ci_high - pairs.difference],
        fmt="o",
        color="#8e794b",
        capsize=7,
        markersize=10,
        linewidth=2,
    )
    for i, row in pairs.iterrows():
        ax.text(
            row.ci_high + 0.05,
            i,
            f"adjusted p={row.p_bonferroni:.3f}",
            va="center",
            fontsize=9,
            color="#687464",
        )
    ax.set(
        yticks=positions,
        yticklabels=pairs.comparison,
        xlabel="Difference in mean dried weight (dataset units)",
        xlim=(-1.65, 2),
        title="Which differences remain plausible?",
    )
    ax.invert_yaxis()
    fig.text(
        0.2,
        0.015,
        "Three Welch comparisons. Bonferroni-adjusted familywise 95% intervals and p-values; small-sample approximations apply.",
        fontsize=8,
        color="#6a7566",
    )
    fig.tight_layout(rect=(0, 0.05, 1, 1))
    save(fig, "pairwise-differences.png")


if __name__ == "__main__":
    print(json.dumps(analyze(), indent=2))
