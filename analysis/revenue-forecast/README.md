# Revenue / usage forecast (synthetic time series)

Illustrative **monthly** **MRR** and **usage** series are **generated from assumptions** in `config.yaml` (copy from `config.example.yaml`). The pipeline fits:

- **SARIMA** (via `pmdarima.auto_arima` with seasonal period 12 when enough history exists)
- **Holt-Winters** / additive exponential smoothing (`statsmodels`)
- **Linear trend** baseline (OLS on time index)

Outputs under `out/`: CSVs and PNG plots. Metrics include **AIC** (SARIMAX: minimum over a small candidate order grid on the training sample) and **RMSE** on a holdout tail.

## Not financial advice

Synthetic data is for **methodology and scenario planning** only—not market forecasts or investment guidance. Replace the generator with real CSVs if you have actual history.

## Limits

- ARIMA-family models assume differencing can achieve approximate stationarity; overly smooth synthetic series may make baselines competitive with SARIMA—compare RMSE honestly.
- **ARR** is shown as **MRR × 12** from the last in-sample or forecast month as a simple snapshot, not audited revenue recognition.

## Run

```bash
cd analysis/revenue-forecast
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp config.example.yaml config.yaml
python run_forecast.py --config config.yaml
```

Optional: `--out ./out` (default `./out`).
