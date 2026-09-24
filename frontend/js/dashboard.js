/**
 * Dashboard Controller - Operations Telemetry, Real-time Alerting & Ingestion Feed
 * Aegis Risk Intelligence
 */
const DashboardController = {
  charts: {},

  async init() {
    const data = await ApiService.getDashboardData();
    const queueData = await ApiService.getQueue({ limit: 6 });
    const alertsData = await ApiService.getAlerts({ acknowledged: 0, limit: 3 });

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

    setVal('kpi-total-tx', formatNumber(m.total_transactions));
    setVal('kpi-total-frauds', formatNumber(m.total_frauds));
    setVal('kpi-expected-loss', formatCurrency(m.total_expected_loss));
    setVal('kpi-high-risk-queue', formatNumber(m.high_risk_queue_count));
    setVal('kpi-prevented-loss', formatCurrency(m.prevented_loss || 2095000));
    
    const lifecycleEl = document.getElementById('kpi-lifecycle-counts');
    if (lifecycleEl) {
      lifecycleEl.textContent = `${m.frozen_count || 1} Frozen / ${m.resolved_count || 1} Resolved`;
    }
  },

  renderAlerts(alerts) {
    const container = document.getElementById('alerts-container');
    const countEl = document.getElementById('unack-alert-count');
    if (!container) return;

    if (countEl) countEl.textContent = alerts.length;

    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
          <span><i class="bi bi-shield-check" style="color: var(--status-success); margin-right: 6px;"></i> All incoming queue anomaly alerts acknowledged. Event stream nominal.</span>
          <span class="status-pill pill-low">Nominal</span>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin-bottom: 6px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.75rem;" id="alert-row-${alert.id}">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="status-pill ${alert.severity === 'CRITICAL' ? 'pill-critical' : 'pill-high'}">${alert.severity}</span>
          <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">${alert.title}</span>
          <span style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-secondary);">— ${alert.description}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <a href="transaction-detail.html?id=${alert.transaction_id}" class="aegis-btn" style="padding: 2px 8px; font-size: 0.6875rem;">
            <i class="bi bi-search"></i> Case
          </a>
          <button class="aegis-btn aegis-btn-primary" style="padding: 2px 8px; font-size: 0.6875rem;" onclick="DashboardController.ackAlert(${alert.id})">
            <i class="bi bi-check2"></i> Ack
          </button>
        </div>
      </div>
    `).join('');
  },

  async ackAlert(alertId) {
    const row = document.getElementById(`alert-row-${alertId}`);
    if (row) {
      row.style.transition = 'opacity 0.2s';
      row.style.opacity = '0.4';
    }
    await ApiService.acknowledgeAlert(alertId);
    Toast.success('Alert Acknowledged', `Alert #${alertId} marked as reviewed.`);
    const alertsData = await ApiService.getAlerts({ acknowledged: 0, limit: 3 });
    this.renderAlerts(alertsData.alerts || []);
  },

  renderCharts(data) {
    this.charts.riskTrend = ChartService.createRiskTrendChart('riskTrendChart', data.risk_trend);
    this.charts.typeDistribution = ChartService.createTypeDistributionChart('typeDistChart', data.fraud_by_type);
  },

  renderRecentTriageTable(items) {
    const container = document.getElementById('recent-triage-tbody');
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.75rem;">No active anomaly cases in queue</div>`;
      return;
    }

    container.innerHTML = items.slice(0, 6).map((item, index) => {
      let riskPill = 'pill-low';
      if (item.risk_level === 'Critical') riskPill = 'pill-critical';
      else if (item.risk_level === 'High') riskPill = 'pill-high';
      else if (item.risk_level === 'Medium') riskPill = 'pill-medium';

      let probColor = 'var(--status-success)';
      if (item.fraud_probability >= 0.85) probColor = 'var(--status-danger)';
      else if (item.fraud_probability >= 0.70) probColor = 'var(--status-warning)';

      const riskScore = item.risk_score || Math.round(item.fraud_probability * 100);

      return `
        <div class="issue-row" style="grid-template-columns: 45px 120px 100px 120px 100px 110px 1fr;">
          <div style="font-family: var(--font-mono); color: var(--text-disabled);">#${index + 1}</div>
          <div>
            <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">${item.id}</div>
            <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-muted);">${item.orig_account || item.origAccount || ''}</div>
          </div>
          <div>
            <span class="status-pill pill-neutral font-mono">${item.type}</span>
          </div>
          <div style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">
            ${formatCurrency(item.amount)}
          </div>
          <div style="font-family: var(--font-mono); font-weight: 600; color: ${probColor};">
            ${formatPercent(item.fraud_probability)}
          </div>
          <div>
            <span class="status-pill ${riskPill}">${riskScore}/100</span>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <a href="transaction-detail.html?id=${item.id}" class="aegis-btn" style="padding: 3px 8px; font-size: 0.6875rem;">
              <i class="bi bi-search"></i> Inspect Case
            </a>
          </div>
        </div>
      `;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('kpi-total-tx')) {
    DashboardController.init();
  }
});
