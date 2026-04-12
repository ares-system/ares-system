"""Generate monthly synthetic MRR and usage series from YAML config."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import yaml


@dataclass
class SeriesConfig:
    history_months: int
    holdout_months: int
    forecast_months: int
    random_seed: int
    mrr: dict[str, Any]
    usage: dict[str, Any]


def load_config(path: str | Path) -> SeriesConfig:
    p = Path(path)
    with p.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    return SeriesConfig(
        history_months=int(raw["history_months"]),
        holdout_months=int(raw["holdout_months"]),
        forecast_months=int(raw["forecast_months"]),
        random_seed=int(raw["random_seed"]),
        mrr=raw["mrr"],
        usage=raw["usage"],
    )


def _normalize_seasonal(factors: list[float]) -> np.ndarray:
    arr = np.asarray(factors, dtype=float)
    if arr.size != 12:
        raise ValueError("seasonal_factors must have length 12 (Jan–Dec)")
    return arr / arr.mean()


def _build_monthly_index(n_months: int) -> pd.DatetimeIndex:
    start = pd.Timestamp("2020-01-01")
    return pd.date_range(start, periods=n_months, freq="MS")


def synthetic_mrr_series(cfg: SeriesConfig) -> pd.Series:
    rng = np.random.default_rng(cfg.random_seed)
    n = cfg.history_months
    g = float(cfg.mrr["monthly_growth_rate"])
    start = float(cfg.mrr["start_usd"])
    noise_std = float(cfg.mrr["noise_std_usd"])
    seasonal = _normalize_seasonal(cfg.mrr["seasonal_factors"])

    idx = _build_monthly_index(n)
    t = np.arange(n, dtype=float)
    core = start * (1.0 + g) ** t
    cal_month = idx.month.values - 1
    y = core * seasonal[cal_month] + rng.normal(0.0, noise_std, size=n)
    y = np.maximum(y, 0.0)
    return pd.Series(y, index=idx, name="mrr_usd")


def synthetic_usage_series(cfg: SeriesConfig) -> pd.Series:
    rng = np.random.default_rng(cfg.random_seed + 1337)
    n = cfg.history_months
    g = float(cfg.usage["monthly_growth_rate"])
    start = float(cfg.usage["start_runs"])
    noise_std = float(cfg.usage["noise_std_runs"])
    seasonal = _normalize_seasonal(cfg.usage["seasonal_factors"])

    idx = _build_monthly_index(n)
    t = np.arange(n, dtype=float)
    core = start * (1.0 + g) ** t
    cal_month = idx.month.values - 1
    y = core * seasonal[cal_month] + rng.normal(0.0, noise_std, size=n)
    y = np.maximum(y, 0.0)
    return pd.Series(y, index=idx, name="usage_runs")
