import unittest,tempfile,json
from pathlib import Path
import numpy as np,pandas as pd
from analyze_plants import analyze,ROOT,GROUPS
class PlantAnalysisTests(unittest.TestCase):
    def test_classic_anova_reconciles_with_sums_of_squares(self):
        data=pd.read_csv(ROOT/'PlantGrowth.csv');groups=[data[data.group==g].weight.to_numpy() for g in GROUPS];grand=data.weight.mean();between=sum(len(g)*(g.mean()-grand)**2 for g in groups);within=sum(((g-g.mean())**2).sum() for g in groups);manual=(between/2)/(within/27);result=json.loads((ROOT/'results/analysis.json').read_text())
        self.assertAlmostEqual(result['classic_F'],manual,places=10)
    def test_group_summaries_and_adjusted_comparisons(self):
        data=pd.read_csv(ROOT/'PlantGrowth.csv');summary=pd.read_csv(ROOT/'results/group-summary.csv');pairs=pd.read_csv(ROOT/'results/pairwise-comparisons.csv')
        self.assertEqual(summary.n.sum(),30);self.assertEqual(len(pairs),3)
        for row in summary.itertuples():self.assertAlmostEqual(row.mean,data[data.group==row.group].weight.sum()/10)
        self.assertTrue(np.allclose(pairs.p_bonferroni,np.minimum(pairs.p_raw*3,1)))
        self.assertTrue((pairs.ci_low<pairs.difference).all());self.assertTrue((pairs.ci_high>pairs.difference).all())
    def test_computation_is_reproducible(self):
        with tempfile.TemporaryDirectory() as d:
            analyze(d,figures=False)
            for name in ['analysis.json','group-summary.csv','pairwise-comparisons.csv','portfolio-summary.txt','explorer-data.json']:self.assertEqual((Path(d)/name).read_bytes(),(ROOT/'results'/name).read_bytes())
if __name__=='__main__':unittest.main()
