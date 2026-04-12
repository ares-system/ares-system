"""ARIMA/SARIMA, exponential smoothing, and linear-trend baselines with metrics."""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX


@dataclass
class ModelResult:
    name: str
    fitted_insample: np.ndarray
    forecast_oos: np.ndarray
    aic: float | None
    rmse_holdout: float
    order_info: str = ""


@dataclass
class ForecastBundle:
    series_name: str
    train: pd.Series
    holdout: pd.Series
    horizon: int
    results: list[ModelResult] = field(default_factory=list)


def _rmse(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.sqrt(np.mean((a - b) ** 2)))


def fit_linear_trend(train: pd.Series, holdout: pd.Series, horizon: int) -> ModelResult:
    y = train.values.astype(float)
    n = len(y)
    x = np.arange(n, dtype=float)
    slope, intercept = np.polyfit(x, y, 1)
    insample = slope * x + intercept
    h = len(holdout)
    pred_hold = slope * np.arange(n, n + h, dtype=float) + intercept
    fc = slope * np.arange(n + h, n + h + horizon, dtype=float) + intercept
    return ModelResult(
        name="linear_trend",
        fitted_insample=insample,
        forecast_oos=np.concatenate([pred_hold, fc]),
        aic=None,
        rmse_holdout=_rmse(holdout.values, pred_hold),
        order_info="OLS degree-1 on time index",
    )


def _sarimax_grid_orders(seasonal: bool) -> list[tuple[tuple[int, int, int], tuple[int, int, int, int]]]:
    """Small grids: AIC pick among common SARIMA / ARIMA shapes."""
    base_orders = [
        (0, 1, 1),
        (1, 1, 0),
        (1, 1, 1),
        (2, 1, 2),
        (1, 0, 0),
        (0, 1, 0),
    ]
    out: list[tuple[tuple[int, int, int], tuple[int, int, int, int]]] = []
    if not seasonal:
        for o in base_orders:
            out.append((o, (0, 0, 0, 0)))
        return out
    seasonal_orders = [
        (0, 0, 0, 12),
        (1, 0, 1, 12),
        (0, 1, 1, 12),
        (1, 0, 0, 12),
    ]
    for o in base_orders:
        for so in seasonal_orders:
            out.append((o, so))
    return out


def fit_auto_sarima(train: pd.Series, holdout: pd.Series, horizon: int) -> ModelResult:
    """Pick SARIMAX order by minimum AIC on training data (statsmodels only)."""
    y = train.values.astype(float)
    n = len(y)
    seasonal = n >= 24
    h = len(holdout)
    best_res = None
    best_aic = np.inf
    best_label = ""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for order, seasonal_order in _sarimax_grid_orders(seasonal):
            try:
                mod = SARIMAX(
                    y,
                    order=order,
                    seasonal_order=seasonal_order,
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                res = mod.fit(disp=False, maxiter=100)
                if res.aic < best_aic:
                    best_aic = res.aic
                    best_res = res
                    best_label = f"order={order}, seasonal_order={seasonal_order}"
            except Exception:
                continue
        if best_res is None:
            mod = SARIMAX(
                y,
                order=(0, 1, 1),
                seasonal_order=(0, 0, 0, 0),
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            best_res = mod.fit(disp=False, maxiter=100)
            best_aic = float(best_res.aic)
            best_label = "fallback order=(0,1,1)"
    insample = np.asarray(best_res.fittedvalues, dtype=float)
    if insample.size != n:
        insample = insample[-n:]
    fc_all = np.asarray(
        best_res.get_forecast(steps=h + horizon).predicted_mean, dtype=float
    )
    pred_hold = fc_all[:h]
    return ModelResult(
        name="sarima" if seasonal else "arima",
        fitted_insample=insample,
        forecast_oos=fc_all,
        aic=float(best_aic),
        rmse_holdout=_rmse(holdout.values, pred_hold),
        order_info=best_label,
    )


def fit_holt_winters(train: pd.Series, holdout: pd.Series, horizon: int) -> ModelResult:
    y = train.values.astype(float)
    n = len(y)
    h = len(holdout)
    seasonal_periods = 12 if n >= 24 else None
    try:
        if seasonal_periods:
            es = ExponentialSmoothing(
                y,
                trend="add",
                seasonal="add",
                seasonal_periods=seasonal_periods,
                initialization_method="estimated",
            ).fit(optimized=True)
        else:
            es = ExponentialSmoothing(
                y,
                trend="add",
                seasonal=None,
                initialization_method="estimated",
            ).fit(optimized=True)
    except Exception:
        es = ExponentialSmoothing(
            y, trend="add", seasonal=None, initialization_method="estimated"
        ).fit(optimized=True)
    insample = es.fittedvalues
    steps = h + horizon
    fc_all = np.asarray(es.forecast(steps), dtype=float)
    pred_hold = fc_all[:h]
    aic = float(es.aic) if hasattr(es, "aic") else None
    return ModelResult(
        name="holt_winters" if seasonal_periods else "exp_smooth_trend",
        fitted_insample=np.asarray(insample, dtype=float),
        forecast_oos=fc_all,
        aic=aic,
        rmse_holdout=_rmse(holdout.values, pred_hold),
        order_info="additive ETS",
    )


def run_all_models(
    full: pd.Series,
    holdout_months: int,
    forecast_months: int,
    series_label: str,
) -> ForecastBundle:
    full = full.sort_index()
    if holdout_months <= 0 or holdout_months >= len(full):
        raise ValueError("holdout_months must be positive and smaller than series length")
    split = len(full) - holdout_months
    train = full.iloc[:split]
    holdout = full.iloc[split:]
    bundle = ForecastBundle(
        series_name=series_label,
        train=train,
        holdout=holdout,
        horizon=forecast_months,
    )
    bundle.results.append(fit_auto_sarima(train, holdout, forecast_months))
    bundle.results.append(fit_holt_winters(train, holdout, forecast_months))
    bundle.results.append(fit_linear_trend(train, holdout, forecast_months))
    return bundle
