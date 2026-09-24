/**
 * Dashboard Controller - Operations Telemetry, Real-time Alerting & Ingestion Feed
 */
const DashboardController = {
  charts: {},

  async init() {
    const data = await ApiService.getDashboardData();
    const queueData = await ApiService.getQueue({ limit: 6 });
    const alertsData = await ApiService.getAlerts({
      acknowledged: 0,
      limit: 3,
    });

    this.renderKPIs(data.metrics);
    this.renderAlerts(alertsData.alerts || []);
    this.renderCharts(data);
    this.renderRecentTriageTable(queueData.items);
  },

  renderKPIs(m) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal("kpi-total-tx", formatNumber(m.total_transactions));
    setVal("kpi-total-frauds", formatNumber(m.total_frauds));
    setVal("kpi-expected-loss", formatCurrency(m.total_expected_loss));
    setVal("kpi-high-risk-queue", formatNumber(m.high_risk_queue_count));
    setVal("kpi-prevented-loss", formatCurrency(m.prevented_loss || 2095000));

    const lifecycleEl = document.getElementById("kpi-lifecycle-counts");
    if (lifecycleEl) {
      lifecycleEl.textContent = `${m.frozen_count || 1} Frozen / ${m.resolved_count || 1} Resolved`;
    }
  },

  renderAlerts(alerts) {
    const container = document.getElementById("alerts-container");
    const countEl = document.getElementById("unack-alert-count");
    if (!container) return;

    if (countEl) countEl.textContent = alerts.length;

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="d-flex align-items-center justify-content-between p-2 font-mono text-muted" style="font-size: 0.75rem;">
          <span><i class="bi bi-shield-check text-success"></i> All incoming queue anomaly alerts acknowledged. Event stream nominal.</span>
          <span class="badge-ws badge-ws-low">Nominal</span>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts
      .map(
        (alert) => `
      <div class="d-flex align-items-center justify-content-between p-2 mb-1 border rounded" style="background: var(--ws-surface); font-size: 0.75rem;" id="alert-row-${alert.id}">
        <div class="d-flex align-items-center gap-2">
          <span class="badge-ws ${alert.severity === "CRITICAL" ? "badge-ws-critical" : "badge-ws-high"}">${alert.severity}</span>
          <span class="fw-bold font-mono text-primary">${alert.title}</span>
          <span class="text-secondary d-none d-md-inline font-mono" style="font-size: 0.6875rem;">— ${alert.description}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <a href="transaction-detail.html?id=${alert.transaction_id}" class="btn-ws" style="padding: 0.15rem 0.45rem; font-size: 0.6875rem;">
            <i class="bi bi-search"></i> Case
          </a>
          <button class="btn-ws btn-ws-primary" style="padding: 0.15rem 0.45rem; font-size: 0.6875rem;" onclick="DashboardController.ackAlert(${alert.id})">
            <i class="bi bi-check2"></i> Ack
          </button>
        </div>
      </div>
    `,
      )
      .join("");
  },

  async ackAlert(alertId) {
    const row = document.getElementById(`alert-row-${alertId}`);
    if (row) {
      row.style.transition = "opacity 0.2s";
      row.style.opacity = "0.4";
    }
    await ApiService.acknowledgeAlert(alertId);
    Toast.success(
      "Alert Acknowledged",
      `Alert #${alertId} marked as reviewed.`,
    );
    const alertsData = await ApiService.getAlerts({
      acknowledged: 0,
      limit: 3,
    });
    this.renderAlerts(alertsData.alerts || []);
  },

  renderCharts(data) {
    this.charts.riskTrend = ChartService.createRiskTrendChart(
      "riskTrendChart",
      data.risk_trend,
    );
    this.charts.typeDistribution = ChartService.createTypeDistributionChart(
      "typeDistChart",
      data.fraud_by_type,
    );
  },

  renderRecentTriageTable(items) {
    const tbody = document.getElementById("recent-triage-tbody");
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-3 text-muted font-mono">No active anomaly cases in queue</td></tr>`;
      return;
    }

    tbody.innerHTML = items
      .slice(0, 6)
      .map((item, index) => {
        let riskBadge = "badge-ws-low";
        if (item.risk_level === "Critical") riskBadge = "badge-ws-critical";
        else if (item.risk_level === "High") riskBadge = "badge-ws-high";
        else if (item.risk_level === "Medium") riskBadge = "badge-ws-medium";

        let probColor = "text-success";
        if (item.fraud_probability >= 0.85) probColor = "text-danger fw-bold";
        else if (item.fraud_probability >= 0.7)
          probColor = "text-warning fw-bold";

        const riskScore =
          item.risk_score || Math.round(item.fraud_probability * 100);

        return `
        <tr>
          <td><span class="font-mono text-muted">#${index + 1}</span></td>
          <td>
            <span class="fw-bold font-mono text-primary">${item.id}</span>
            <div class="text-muted font-mono" style="font-size: 0.6875rem;">${item.orig_account || item.origAccount || ""}</div>
          </td>
          <td>
            <span class="badge bg-light text-dark border font-mono" style="font-size: 0.6875rem;">${item.type}</span>
          </td>
          <td>
            <span class="font-mono fw-bold">${formatCurrency(item.amount)}</span>
          </td>
          <td>
            <span class="font-mono ${probColor}">${formatPercent(item.fraud_probability)}</span>
          </td>
          <td>
            <span class="badge-ws ${riskBadge}">${riskScore}/100 ${item.risk_level}</span>
          </td>
          <td class="text-end">
            <a href="transaction-detail.html?id=${item.id}" class="btn-ws">
              <i class="bi bi-search"></i> Inspect Case
            </a>
          </td>
        </tr>
      `;
      })
      .join("");
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("kpi-total-tx")) {
    DashboardController.init();
  }
});
