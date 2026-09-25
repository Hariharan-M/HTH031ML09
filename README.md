# Aegis Risk Intelligence — Explainable AI Fraud Triage Platform

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.4+-orange.svg)](https://xgboost.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/TreeSHAP-Explainability-brightgreen.svg)](https://shap.readthedocs.io/)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)]()

**Aegis Risk Intelligence** is an institutional-grade, explainable AI fraud detection and case triage platform designed for Financial Crime Units (FCU), risk engineering teams, and Security Operations Centers (SOC). Combining high-performance **XGBoost** classification, real-time **TreeSHAP** feature attribution, a multi-factor **0–100 Risk Scoring Engine**, and a persistent **SQLite state store**, Aegis enables rapid, accountable, and auditable triage of high-risk transactions.

---

## Key Features

- **XGBoost 2.4 Machine Learning Engine**: High-throughput gradient boosting classifier trained on massive imbalanced transaction datasets with optimized `scale_pos_weight` calibration (`ROC-AUC: 0.998`, `PR-AUC: 0.984`).
- **Real-Time TreeSHAP Explainability**: Local and global feature attribution waterfall decompositions for every transaction, explaining exactly *why* a transaction was flagged (e.g., origin balance liquidation, destination surge).
- **Multi-Factor Risk Scoring (0–100)**: Composite scoring combining raw ML fraud probability, expected loss exposure ($USD), transaction velocity, account drainage heuristics, and channel anomaly weights.
- **Enterprise Case Management & Audit Trail**: Full-lifecycle triage operations (Freeze Account, Clear/Resolve, Flag False Positive, Escalate to Tier-3, Assign Lead Analyst, Append Forensic Notes) backed by persistent SQLite transaction and audit tables.
- **Modern Minimalist Dark Interface**: Designed with a focused monochrome palette (`#09090B` canvas, `#14141C` cards, `#0D1020` sidebar, `#8B5CF6` accent), responsive grid layouts, and zero visual clutter.
- **Interactive Inference Lab**: Real-time "What-If" simulation sandbox to adjust transaction amounts, account balance deltas, and transfer channels with immediate model re-evaluation.
- **Automated Compliance & Reporting**: Instant CSV export for compliance reporting and granular single-case investigative dossiers.

---

## Application Modules & Pages

| View | Path | Description |
| :--- | :--- | :--- |
| **Executive Overview** | `/frontend/index.html` | Real-time command center featuring macro fraud rates, expected loss exposure, hourly incident trends, and channel distributions. |
| **Fraud Triage Queue** | `/frontend/queue.html` | Live transaction queue with multi-dimensional filtering, priority SLAs, risk score badges, and batch freeze/resolve actions. |
| **Case Investigator** | `/frontend/transaction-detail.html` | Forensic single-transaction deep dive with TreeSHAP waterfall charts, account balance deltas, analyst timelines, and escalation controls. |
| **Model Intelligence** | `/frontend/analytics.html` | Telemetry on model performance, ROC/PR curves, global SHAP feature importance rankings, confusion matrices, and calibration drift. |
| **Inference Lab** | `/frontend/simulator.html` | Interactive simulation sandbox for real-time payload scoring, automated risk tiering, and SHAP reason code generation. |
| **Risk Policies** | `/frontend/settings.html` | Threshold governance, multi-factor weighting calibration, SLA triggers, and automated execution gates. |

---

## Architecture Overview

```
+-------------------------------------------------------------------+
|               Frontend Client (Linear/Arc Minimalist Dark)        |
|  - Executive Overview   - Fraud Queue      - Case Investigator    |
|  - Model Intelligence   - Inference Lab    - Risk Policies        |
+---------------------------------+---------------------------------+
                                  | HTTP / JSON REST
                                  v
+-------------------------------------------------------------------+
|                        FastAPI Backend Engine                     |
|  - Rate Limiter & Security Headers Middleware (Nosniff, HSTS)     |
|  - REST Endpoints (/queue, /predict, /explanation, /freeze, etc.) |
+------------------+------------------------------+-----------------+
                   |                              |
                   v                              v
+-----------------------------+    +--------------------------------+
|     XGBoost + TreeSHAP      |    |       SQLite Persistence       |
|  - Binary Logistic Model    |    |  - transactions table          |
|  - Local Feature SHAP       |    |  - case_audit_logs table       |
|  - Global Importance Drift  |    |  - security_alerts table       |
+-----------------------------+    +--------------------------------+
```

---

## Directory Structure

```
Fraud_Detection/
├── backend/
│   ├── database.py              # SQLite schema, seed data, CRUD & audit trail logging
│   ├── fraud_triage.db          # Persistent SQLite database store
│   ├── main.py                  # FastAPI REST API, endpoints, middleware & static mounts
│   └── risk_engine.py           # Multi-factor 0-100 composite risk scoring engine
├── explainability/
│   └── shap_explainer.py        # TreeSHAP explainer initialization and utility helpers
├── frontend/
│   ├── css/
│   │   ├── main.css             # Unified design system tokens, components, grid & utilities
│   │   ├── explainability.css   # SHAP waterfall charts & feature contribution cards
│   │   └── line-sidebar.css     # Linear/Arc-style minimalist sidebar styling
│   ├── js/
│   │   ├── api.js               # REST API client & resilient fallback controllers
│   │   ├── charts.js            # Chart.js telemetry (Trends, SHAP Waterfall, ROC Curve)
│   │   ├── config.js            # API base URLs, risk thresholds & UI design tokens
│   │   ├── dashboard.js         # Executive overview metric controllers
│   │   ├── explainability.js    # Case investigator SHAP rendering & action triggers
│   │   ├── queue.js             # Live fraud queue filtering, pagination & batch actions
│   │   ├── settings.js          # Policy threshold governance & configuration state
│   │   ├── simulator.js         # What-If inference studio & dynamic scoring sandbox
│   │   └── toast.js             # Non-intrusive operational toast notification system
│   ├── analytics.html           # Model Intelligence & Global Explainability
│   ├── index.html               # Executive Overview Command Center
│   ├── queue.html               # Live Fraud Triage Queue
│   ├── settings.html            # Risk Policies & Governance
│   ├── simulator.html           # Inference Lab & Scenario Sandbox
│   └── transaction-detail.html  # Case Investigator Forensic View
├── models/
│   ├── expected_loss.py         # Financial loss exposure estimation routines
│   ├── predict_transaction.py   # CLI inference script
│   ├── train_model.py           # Model training pipeline with class weighting
│   └── xgboost_fraud.pkl        # Serialized trained XGBoost production model
├── training/
│   └── clean.py                 # Dataset cleaning and feature engineering preprocessing
├── .gitignore
├── README.md
```

---

## Quick Start & Installation

### 1. Prerequisites
- Python 3.10 or higher
- `pip` package manager

### 2. Install Dependencies
```bash
pip install fastapi uvicorn xgboost shap scikit-learn pandas numpy joblib pydantic
```

### 3. Launch the Backend Server
Run the FastAPI application from the project root directory:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Open the Web Application
Once the server is running, access the application in any modern web browser:
- **Command Center**: [http://127.0.0.1:8000/frontend/index.html](http://127.0.0.1:8000/frontend/index.html)
- **Fraud Queue**: [http://127.0.0.1:8000/frontend/queue.html](http://127.0.0.1:8000/frontend/queue.html)
- **Case Investigator**: [http://127.0.0.1:8000/frontend/transaction-detail.html?id=TX-948271](http://127.0.0.1:8000/frontend/transaction-detail.html?id=TX-948271)
- **Model Intelligence**: [http://127.0.0.1:8000/frontend/analytics.html](http://127.0.0.1:8000/frontend/analytics.html)
- **Inference Lab**: [http://127.0.0.1:8000/frontend/simulator.html](http://127.0.0.1:8000/frontend/simulator.html)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## API Reference

### System & Telemetry
- `GET /` — System health, model version, and queue summary counts.
- `GET /dashboard` — Aggregated fraud metrics, expected loss, hourly trend lines, and channel distribution.

### Queue & Case Lifecycle
- `GET /queue` — Retrieve active triage queue (`PENDING` and `UNDER_REVIEW` transactions).
- `GET /frozen` — Retrieve frozen high-risk accounts.
- `GET /resolved` — Retrieve cleared/resolved transactions.
- `GET /false-positive` — Retrieve marked false positives for retraining.

### Case Mutations & Actions
- `POST /freeze/{id}` — Freeze origin account and update status to `FROZEN`.
- `POST /resolve/{id}` — Approve and clear transaction (`RESOLVED`).
- `POST /false-positive/{id}` — Tag transaction as `FALSE_POSITIVE` for calibration.
- `POST /review/{id}` — Transition case status to `UNDER_REVIEW`.
- `POST /cases/{id}/assign` — Assign a case to an analyst.
- `POST /cases/{id}/priority` — Update priority (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- `POST /cases/{id}/notes` — Append an analyst note to the case audit trail.
- `POST /cases/{id}/escalate` — Escalate case to Senior Review / Tier-3.

### Inference & Explainability
- `POST /predict` — Run real-time inference on a transaction payload with multi-factor risk scoring.
- `GET /explanation?id={id}` — Retrieve granular TreeSHAP feature attributions, descriptions, and audit history for a transaction.
- `GET /model/intelligence` — Retrieve global feature importance, performance metrics, and confusion matrix.

### Reports & Compliance
- `GET /reports/export/csv?status=ALL` — Stream a CSV export of transactions.
- `GET /reports/case/{id}` — Generate a full case investigation dossier.

---

## Risk Scoring Methodology

Aegis calculates a composite **0–100 Risk Score** using a multi-factor risk weighting formula:

$$\text{Risk Score} = w_{\text{ML}} \cdot P(\text{Fraud}) + w_{\text{Loss}} \cdot S(\text{Loss}) + w_{\text{Drain}} \cdot I_{\text{Drain}} + w_{\text{Channel}} \cdot I_{\text{Channel}} + w_{\text{Surge}} \cdot I_{\text{Surge}}$$

- **ML Probability Weight ($w_{\text{ML}} = 45\%$)**: Raw probability output from the calibrated XGBoost ensemble.
- **Expected Loss Exposure ($w_{\text{Loss}} = 25\%$)**: Non-linear logarithmic scaling of financial loss ($P(\text{Fraud}) \times \text{Amount}$).
- **Origin Account Liquidation ($w_{\text{Drain}} = 15\%$)**: Binary indicator when sender balance is completely emptied to \$0.00.
- **High-Risk Channel Type ($w_{\text{Channel}} = 10\%$)**: Applied to `TRANSFER` and `CASH_OUT` transactions.
- **Destination Surge Delta ($w_{\text{Surge}} = 5\%$)**: Large abnormal inflow into beneficiary accounts.

### Action Tiers
- **Critical Risk (Score $\ge 85$)**: Immediate auto-freeze recommendation; 1-Hour SLA.
- **High Risk (Score $65 - 84$)**: Priority investigation required; 4-Hour SLA.
- **Medium Risk (Score $40 - 64$)**: Secondary review queue; 24-Hour SLA.
- **Low Risk (Score $< 40$)**: Automated pass / Low priority logging; 72-Hour SLA.

---

## Security & Reliability

- **Built-in Rate Limiting**: Lightweight per-IP sliding window throttle (200 requests/minute).
- **Security Headers**: Automatic enforcement of `nosniff`, `DENY` framing, `X-XSS-Protection`, and HSTS.
- **Tamper-Evident Audit Trail**: Every status transition, note, priority change, and escalation is timestamped and recorded in SQLite with analyst attribution.
- **Resilient Frontend Offline Fallback**: Frontend controllers automatically fall back to simulated test records if backend connectivity is interrupted.

---

## License

This project is proprietary and intended for institutional fraud detection and risk analytics operations.