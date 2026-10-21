import json
import hashlib
import itertools
import unittest
import numpy as np
import pandas as pd
from scipy import stats
from analyze_plants import ROOT, GROUPS


class ExplorerTests(unittest.TestCase):
    def setUp(self):
        self.data = pd.read_csv(ROOT / "PlantGrowth.csv")
        self.report = json.loads(
            (ROOT / "results/explorer-data.json").read_text("utf8")
        )

    def test_export_preserves_every_original_observation(self):
        self.assertEqual(
            self.report["analysis"]["dataset_sha256"],
            hashlib.sha256((ROOT / "PlantGrowth.csv").read_bytes()).hexdigest(),
        )
        self.assertEqual(
            self.report["observations"], self.data.to_dict(orient="records")
        )
        self.assertEqual(
            len({row["rownames"] for row in self.report["observations"]}), 30
        )

    def test_group_variability_and_mean_intervals_match_source(self):
        for group in self.report["groups"]:
            source = self.data.loc[self.data.group == group["group"], "weight"]
            self.assertAlmostEqual(group["mean"], source.sum() / len(source))
            self.assertAlmostEqual(group["sd"], source.std(ddof=1))
            interval = stats.t.interval(
                0.95, len(source) - 1, loc=source.mean(), scale=stats.sem(source)
            )
            np.testing.assert_allclose(
                [group["ci_low"], group["ci_high"]], interval, rtol=1e-12
            )

    def test_pairwise_intervals_reconcile_with_scipy_and_saved_figures(self):
        saved = pd.read_csv(ROOT / "results/pairwise-comparisons.csv")
        for item, (first, second), row in zip(
            self.report["comparisons"],
            itertools.combinations(GROUPS, 2),
            saved.itertuples(),
        ):
            a = self.data.loc[self.data.group == first, "weight"].to_numpy()
            b = self.data.loc[self.data.group == second, "weight"].to_numpy()
            result = stats.ttest_ind(b, a, equal_var=False)
            interval = result.confidence_interval(confidence_level=1 - 0.05 / 3)
            self.assertEqual((item["first"], item["second"]), (first, second))
            self.assertAlmostEqual(item["difference"], b.mean() - a.mean())
            self.assertAlmostEqual(item["difference"], row.difference)
            self.assertAlmostEqual(item["p_bonferroni"], min(1, result.pvalue * 3))
            np.testing.assert_allclose(
                [item["ci_low"], item["ci_high"]], interval, rtol=1e-12
            )
            self.assertAlmostEqual(item["welch_df"], result.df)


if __name__ == "__main__":
    unittest.main()
