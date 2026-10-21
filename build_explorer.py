"""Package the already computed PlantGrowth analysis as a static explorer."""

from pathlib import Path
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent

if __name__ == "__main__":
    report = json.loads((ROOT / "results/explorer-data.json").read_text("utf8"))
    source = ROOT / "PlantGrowth.csv"
    if (
        hashlib.sha256(source.read_bytes()).hexdigest()
        != report["analysis"]["dataset_sha256"]
    ):
        raise ValueError("Source bytes differ from the analyzed dataset")
    report["source_revision"] = subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
    ).strip()
    destination = ROOT / "docs"
    destination.mkdir(exist_ok=True)
    for path in (ROOT / "web").iterdir():
        shutil.copyfile(path, destination / path.name)
    shutil.copyfile(source, destination / "observations.csv")
    (destination / "data.json").write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf8"
    )
    print("Packaged 30 original observations and three precomputed Welch comparisons.")
