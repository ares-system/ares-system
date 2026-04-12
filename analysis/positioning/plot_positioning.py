#!/usr/bin/env python3
"""
Illustrative positioning scores (0–5) derived from internal COMPETITORS.md notes.
Not Colosseum API metrics — for strategy visualization only. Re-score when product changes.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib
import pandas as pd

matplotlib.use("Agg")

ROOT = Path(__file__).resolve().parent
CSV = ROOT / "positioning_scores.csv"
OUT_HEAT = ROOT / "positioning_heatmap.png"
OUT_SCATTER = ROOT / "positioning_scatter.png"

COLORS = [
    "#0173B2",
    "#DE8F05",
    "#029E73",
    "#D55E00",
    "#CC78BC",
    "#CA9161",
    "#949494",
    "#56B4E9",
]

plt.rcParams.update(
    {
        "figure.dpi": 100,
        "savefig.dpi": 300,
        "font.size": 10,
        "axes.titlesize": 13,
        "figure.constrained_layout.use": True,
    }
)


def main() -> None:
    df = pd.read_csv(CSV)
    dim_cols = [
        "commit_manifest",
        "sarif_merge",
        "agent_orchestration",
        "sandbox_cli",
        "runtime_monitoring",
        "user_wallet_security",
    ]
    labels = dict(
        zip(
            dim_cols,
            [
                "Commit-bound manifest",
                "SARIF / static merge",
                "Agent orchestration",
                "Sandboxed CLI / repro",
                "Runtime monitoring",
                "User / wallet security",
            ],
        )
    )

    # --- Heatmap (rows: projects, cols: dimensions)
    plot_df = df.set_index("label")[dim_cols].rename(columns=labels)
    plot_df = plot_df.sort_index()
    data = plot_df.values.astype(float)
    fig, ax = plt.subplots(figsize=(11, max(6, len(plot_df) * 0.35)))
    im = ax.imshow(data, aspect="auto", cmap="Blues", vmin=0, vmax=5)
    ax.set_xticks(range(len(plot_df.columns)))
    ax.set_xticklabels(plot_df.columns, rotation=35, ha="right")
    ax.set_yticks(range(len(plot_df.index)))
    ax.set_yticklabels(plot_df.index)
    for y in range(data.shape[0]):
        for x in range(data.shape[1]):
            ax.text(x, y, f"{data[y, x]:.0f}", ha="center", va="center", color="#111", fontsize=8)
    fig.colorbar(im, ax=ax, label="Illustrative score (0–5)")
    ax.set_title(
        "ASST vs Copilot-surfaced competitors — capability heatmap\n"
        "(qualitative scores from COMPETITORS.md; not API data)",
        fontweight="bold",
    )
    plt.savefig(OUT_HEAT, dpi=300, bbox_inches="tight", facecolor="white", edgecolor="none")
    plt.close()

    # --- Scatter: dev evidence vs runtime/user
    d = df.copy()
    d["dev_pipeline_evidence"] = d[
        ["commit_manifest", "sarif_merge", "sandbox_cli"]
    ].mean(axis=1)
    d["ops_user_surface"] = d[["runtime_monitoring", "user_wallet_security"]].mean(axis=1)

    fig, ax = plt.subplots(figsize=(9, 7))
    for i, row in d.iterrows():
        is_asst = row["slug"] == "ASST"
        ax.scatter(
            row["dev_pipeline_evidence"],
            row["ops_user_surface"],
            s=180 if is_asst else 90,
            c=COLORS[0] if is_asst else COLORS[1 + (i % (len(COLORS) - 1))],
            edgecolors="black",
            linewidths=1.2 if is_asst else 0.6,
            zorder=10 if is_asst else 5,
            alpha=1.0 if is_asst else 0.85,
            label=row["label"] if is_asst else None,
        )
        if not is_asst:
            ax.annotate(
                row["slug"][:18] + ("…" if len(row["slug"]) > 18 else ""),
                (row["dev_pipeline_evidence"], row["ops_user_surface"]),
                textcoords="offset points",
                xytext=(4, 4),
                fontsize=7,
                alpha=0.9,
            )
    ax.set_xlabel(
        "Dev pipeline & evidence (mean: commit + SARIF merge + sandbox CLI)",
        fontweight="bold",
    )
    ax.set_ylabel(
        "Runtime / user security (mean: monitoring + wallet)",
        fontweight="bold",
    )
    ax.set_xlim(-0.1, 5.5)
    ax.set_ylim(-0.1, 5.5)
    ax.axhline(2.5, color="gray", linestyle="--", alpha=0.35)
    ax.axvline(2.5, color="gray", linestyle="--", alpha=0.35)
    ax.text(
        4.0,
        0.4,
        "ARES / ASST target:\nhigh dev evidence,\nlow wallet-only focus",
        fontsize=9,
        style="italic",
        color="#333",
    )
    ax.set_title(
        "Positioning map (illustrative)\nColosseum corpus — 2026-04-12 scan slice",
        fontweight="bold",
    )
    ax.grid(True, alpha=0.3, linestyle="--")
    ax.legend(loc="upper left")
    plt.savefig(OUT_SCATTER, dpi=300, bbox_inches="tight", facecolor="white", edgecolor="none")
    plt.close()

    print(f"Wrote {OUT_HEAT}\nWrote {OUT_SCATTER}")


if __name__ == "__main__":
    main()
