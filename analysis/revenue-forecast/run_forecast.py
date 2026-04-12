#!/usr/bin/env python3
"""CLI: generate synthetic series, fit models, export CSV + PNG."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_PKG = Path(__file__).resolve().parent
if str(_PKG) not in sys.path:
    sys.path.insert(0, str(_PKG))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from forecast_models import ForecastBundle, run_all_models
from synthetic_series import load_config, synthetic_mrr_series, synthetic_usage_series


def _future_index(last_ts: pd.Timestamp, n: int) -> pd.DatetimeIndex:
    return pd.date_range(last_ts + pd.offsets.MonthBegin(1), periods=n, freq="MS")


def metrics_rows(bundle: ForecastBundle) -> list[dict]:
    rows = []
    for r in bundle.results:
        rows.append(
            {
                "series": bundle.series_name,
                "model": r.name,
                "aic": r.aic,
                "rmse_holdout": r.rmse_holdout,
                "order_info": r.order_info,
            }
        )
    return rows


def forecast_table(
    full: pd.Series,
    bundle: ForecastBundle,
) -> pd.DataFrame:
    """Long table: one row per model with columns for train fit, holdout pred, future pred."""
    holdout = bundle.holdout
    train = bundle.train
    h = len(holdout)
    horizon = bundle.horizon
    future_idx = _future_index(full.index[-1], horizon)

    parts = []
    for r in bundle.results:
        fit_len = len(train)
        if len(r.fitted_insample) != fit_len:
            ins = np.asarray(r.fitted_insample, dtype=float)
            ins = ins[-fit_len:] if len(ins) > fit_len else ins
        else:
            ins = np.asarray(r.fitted_insample, dtype=float)

        fc = np.asarray(r.forecast_oos, dtype=float)
        pred_h = fc[:h]
        fut = fc[h : h + horizon]

        df_fit = pd.DataFrame(
            {
                "model": r.name,
                "phase": "train",
                "date": train.index,
                "actual": train.values,
                "fitted": ins,
            }
        )
        df_hold = pd.DataFrame(
            {
                "model": r.name,
                "phase": "holdout",
                "date": holdout.index,
                "actual": holdout.values,
                "fitted": pred_h,
            }
        )
        df_future = pd.DataFrame(
            {
                "model": r.name,
                "phase": "future",
                "date": future_idx,
                "actual": np.nan,
                "fitted": fut,
            }
        )
        parts.extend([df_fit, df_hold, df_future])
    return pd.concat(parts, ignore_index=True)


def plot_bundle(full: pd.Series, bundle: ForecastBundle, out_png: Path) -> None:
    holdout = bundle.holdout
    train = bundle.train
    h = len(holdout)
    horizon = bundle.horizon
    future_idx = _future_index(full.index[-1], horizon)

    n_models = len(bundle.results)
    fig, axes = plt.subplots(n_models, 1, figsize=(10, 3.2 * n_models), sharex=True)
    if n_models == 1:
        axes = [axes]

    for ax, r in zip(axes, bundle.results):
        ax.plot(full.index, full.values, color="0.35", linewidth=1.0, label="actual (full)")
        ins = np.asarray(r.fitted_insample, dtype=float)
        if len(ins) != len(train):
            ins = ins[-len(train) :]
        ax.plot(train.index, ins, color="C0", linewidth=1.2, label="fitted (train)")

        fc = np.asarray(r.forecast_oos, dtype=float)
        pred_h = fc[:h]
        fut = fc[h : h + horizon]
        ax.plot(holdout.index, pred_h, color="C1", linestyle="--", label="pred (holdout)")
        ax.plot(future_idx, fut, color="C2", linewidth=1.2, label="forecast")
        ax.set_title(f"{bundle.series_name} — {r.name} (RMSE holdout={r.rmse_holdout:.2f})")
        ax.legend(loc="upper left", fontsize=8)
        ax.grid(True, alpha=0.3)

    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(out_png, dpi=150)
    plt.close(fig)


def arr_snapshot(mrr_future_last: float) -> dict:
    return {"mrr_usd": mrr_future_last, "arr_usd_approx": mrr_future_last * 12.0}


def main() -> None:
    ap = argparse.ArgumentParser(description="Synthetic MRR/usage forecast pipeline")
    ap.add_argument(
        "--config",
        default="config.example.yaml",
        help="Path to YAML config (default: config.example.yaml)",
    )
    ap.add_argument("--out", default="out", help="Output directory (default: ./out)")
    args = ap.parse_args()

    cfg_path = Path(args.config)
    if not cfg_path.is_file():
        raise SystemExit(f"Config not found: {cfg_path}")

    cfg = load_config(cfg_path)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    mrr = synthetic_mrr_series(cfg)
    usage = synthetic_usage_series(cfg)
    mrr.to_csv(out / "synthetic_mrr.csv", header=True)
    usage.to_csv(out / "synthetic_usage.csv", header=True)

    holdout_m = cfg.holdout_months
    fc_m = cfg.forecast_months

    bundles: list[ForecastBundle] = []
    for series, label in ((mrr, "mrr"), (usage, "usage")):
        b = run_all_models(series, holdout_m, fc_m, label)
        bundles.append(b)
        tbl = forecast_table(series, b)
        tbl.to_csv(out / f"forecast_{label}.csv", index=False)
        plot_bundle(series, b, out / f"forecast_{label}.png")

    metrics = []
    for b in bundles:
        metrics.extend(metrics_rows(b))
    pd.DataFrame(metrics).to_csv(out / "metrics_summary.csv", index=False)

    # ARR snapshot from best RMSE model on MRR (by holdout RMSE)
    mrr_bundle = bundles[0]
    best = min(mrr_bundle.results, key=lambda r: r.rmse_holdout)
    last_mrr_fc = float(best.forecast_oos[len(mrr_bundle.holdout) + fc_m - 1])
    snap = arr_snapshot(last_mrr_fc)
    pd.DataFrame([snap]).to_csv(out / "arr_snapshot.csv", index=False)

    print(f"Wrote outputs to {out.resolve()}")
    print(f"Best MRR model by holdout RMSE: {best.name}, ARR snapshot ≈ ${snap['arr_usd_approx']:,.0f}")


if __name__ == "__main__":
    main()
