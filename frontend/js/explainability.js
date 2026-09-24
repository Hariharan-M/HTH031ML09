/**
 * Explainability Controller - 3-Column Workspace Case Investigator & SHAP Decomposition
 * Aegis Risk Intelligence - ReactBits Palette Architecture
 */
const ExplainabilityController = {
  currentTransactionId: null,
  transactionData: null,
  shapChart: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    this.currentTransactionId = urlParams.get('id') || 'TX-948271';

    await this.loadTransactionDetails(this.currentTransactionId);
    this.attachEventListeners();
  },

  async loadTransactionDetails(txId) {
    this.transactionData = await ApiService.getExplanation(txId);
    this.renderHeader(this.transactionData);
    this.renderRiskMeter(this.transactionData);
    this.renderMetadata(this.transactionData);
    this.renderBalanceFlow(this.transactionData);
    this.renderCaseManagement(this.transactionData);
    this.renderShapFactors(this.transactionData);
    this.renderShapChart(this.transactionData.shap_features);
    this.renderAuditTimeline(this.transactionData.audit_logs || []);
  },

  renderHeader(data) {
    const idEl = document.getElementById('tx-header-id');
    const timeEl = document.getElementById('tx-header-timestamp');
    const scoreBadgeEl = document.getElementById('tx-header-score-badge');
    const riskBadgeEl = document.getElementById('tx-header-risk-badge');
    const statusBadgeEl = document.getElementById('tx-header-status-badge');
    const breadcrumbEl = document.getElementById('breadcrumb-tx-id');

    if (idEl) idEl.textContent = data.transaction_id;
    if (breadcrumbEl) breadcrumbEl.textContent = `${data.transaction_id} Investigation`;
    if (timeEl) timeEl.textContent = `Flagged at Step ${data.step} (${data.timestamp || 'Recent'}) • Priority: ${data.priority || 'HIGH'}`;

    const riskScore = data.risk_score || Math.round(data.fraud_probability * 100);
    if (scoreBadgeEl) {
      scoreBadgeEl.textContent = `${riskScore}/100 Risk Score`;
    }

    if (riskBadgeEl) {
      let pillClass = 'pill-low';
      if (data.risk_level === 'Critical') pillClass = 'pill-critical';
      else if (data.risk_level === 'High') pillClass = 'pill-high';
      else if (data.risk_level === 'Medium') pillClass = 'pill-medium';
      riskBadgeEl.className = `status-pill ${pillClass}`;
      riskBadgeEl.textContent = `${data.risk_level} Risk`;
    }

    if (statusBadgeEl) {
      let statusClass = 'pill-neutral';
      if (data.status === 'UNDER_REVIEW') statusClass = 'pill-medium';
      else if (data.status === 'FROZEN') statusClass = 'pill-critical';
      else if (data.status === 'RESOLVED') statusClass = 'pill-low';
      else if (data.status === 'FALSE_POSITIVE') statusClass = 'pill-high';
      statusBadgeEl.className = `status-pill ${statusClass}`;
      statusBadgeEl.textContent = data.status;
    }
  },

  renderRiskMeter(data) {
    const percentEl = document.getElementById('risk-meter-percent');
    const lossEl = document.getElementById('risk-meter-loss');
    const formulaEl = document.getElementById('risk-loss-formula');

    const prob = data.fraud_probability;
    if (percentEl) percentEl.textContent = formatPercent(prob, 1);
    if (lossEl) lossEl.textContent = formatCurrency(data.expected_loss);

    if (formulaEl) {
      formulaEl.textContent = `P(Fraud) [${prob.toFixed(4)}] × Exposure [${formatCurrency(data.amount)}]`;
    }
  },

  renderMetadata(data) {
    const map = {
      'meta-amount': formatCurrency(data.amount),
      'meta-type': data.type,
      'meta-orig': data.origAccount || data.orig_account || 'C847291039',
      'meta-dest': data.destAccount || data.dest_account || 'M928371029',
      'meta-orig-old': formatCurrency(data.oldbalanceOrg || data.oldbalance_org),
      'meta-orig-new': formatCurrency(data.newbalanceOrig || data.newbalance_orig),
      'meta-dest-old': formatCurrency(data.oldbalanceDest || data.oldbalance_dest),
      'meta-dest-new': formatCurrency(data.newbalanceDest || data.newbalance_dest),
      'meta-large-tx': (data.largeTransaction || data.large_transaction) ? 'YES (> $100k)' : 'NO (Standard)',
      'meta-emptied': (data.originAccountEmptied || data.origin_account_emptied) ? 'YES (Emptied to $0.00)' : 'NO'
    };

    for (const [id, val] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  },

  renderBalanceFlow(data) {
    const origDiff = data.balanceDiffOrig || (data.oldbalanceOrg - data.newbalanceOrig);
    const destDiff = data.balanceDiffDest || (data.newbalanceDest - data.oldbalanceDest);

    const origDiffEl = document.getElementById('flow-orig-diff');
    const destDiffEl = document.getElementById('flow-dest-diff');

    if (origDiffEl) {
      origDiffEl.textContent = `-${formatCurrency(origDiff)}`;
    }
    if (destDiffEl) {
      destDiffEl.textContent = `+${formatCurrency(destDiff)}`;
    }
  },

  renderCaseManagement(data) {
    const analystSelect = document.getElementById('case-analyst-select');
    const prioritySelect = document.getElementById('case-priority-select');

    if (analystSelect && data.assigned_analyst) {
      analystSelect.value = data.assigned_analyst;
    }
    if (prioritySelect && data.priority) {
      prioritySelect.value = data.priority;
    }
  },

  renderShapFactors(data) {
    const container = document.getElementById('shap-factors-container');
    if (!container) return;

    const features = data.shap_features || [];
    if (features.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.75rem;">No SHAP factors computed for this record.</div>`;
      return;
    }

    container.innerHTML = features.slice(0, 5).map(f => {
      let impactPill = 'pill-low';
      if (f.impact === 'High') impactPill = 'pill-critical';
      else if (f.impact === 'Medium') impactPill = 'pill-high';

      const isPositive = f.shap_value >= 0;
      const sign = isPositive ? '+' : '';
      const dirText = isPositive ? 'Accelerates Fraud Odds' : 'Mitigates Risk Toward Legitimacy';

      return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 8px; font-size: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">${f.name || f.feature}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="status-pill ${impactPill}">${f.impact} Impact</span>
              <span style="font-family: var(--font-mono); font-weight: 600; color: ${isPositive ? 'var(--status-danger)' : 'var(--status-success)'};">${sign}${f.shap_value.toFixed(2)} SHAP</span>
            </div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.6875rem; color: var(--text-secondary);">${f.description}</div>
          <div style="font-family: var(--font-mono); font-size: 0.625rem; color: var(--text-disabled); margin-top: 3px;">Direction: ${dirText}</div>
        </div>
      `;
    }).join('');
  },

  renderShapChart(shapFeatures) {
    if (this.shapChart) {
      this.shapChart.destroy();
    }
    this.shapChart = ChartService.createShapContributionChart('shapContributionChart', shapFeatures || []);
  },

  renderAuditTimeline(auditLogs = []) {
    const list = document.getElementById('audit-timeline-list');
    if (!list) return;

    if (auditLogs.length === 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      list.innerHTML = `
        <div class="audit-item">
          <div class="audit-bullet" style="background: var(--accent-primary);"></div>
          <div class="audit-time">${now} • System</div>
          <div class="audit-title">Initial XGBoost Triage Ingestion</div>
          <div class="audit-note">Flagged by model inference pipeline.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = auditLogs.map(log => {
      let dotColor = 'var(--accent-primary)';
      if (log.action === 'FREEZE_ACCOUNT') dotColor = 'var(--status-danger)';
      else if (log.action === 'RESOLVE_TRANSACTION') dotColor = 'var(--status-success)';
      else if (log.action === 'ESCALATE_CASE') dotColor = 'var(--status-warning)';

      return `
        <div class="audit-item">
          <div class="audit-bullet" style="background: ${dotColor};"></div>
          <div class="audit-time">${log.timestamp} • ${log.analyst}</div>
          <div class="audit-title">${log.action.replace(/_/g, ' ')}</div>
          ${log.notes ? `<div class="audit-note">${log.notes}</div>` : ''}
        </div>
      `;
    }).join('');
  },

  attachEventListeners() {
    const blockBtn = document.getElementById('actionBlockBtn');
    const escalateBtn = document.getElementById('actionEscalateBtn');
    const clearBtn = document.getElementById('actionClearBtn');
    const fpBtn = document.getElementById('actionFpBtn');
    const saveNoteBtn = document.getElementById('saveCaseNoteBtn');
    const analystSelect = document.getElementById('case-analyst-select');
    const prioritySelect = document.getElementById('case-priority-select');

    if (blockBtn) {
      blockBtn.addEventListener('click', async () => {
        blockBtn.classList.add('disabled');
        await ApiService.freezeTransaction(this.currentTransactionId, 'Account frozen & blocked via Case Investigator');
        blockBtn.classList.remove('disabled');

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.danger('Account Frozen', `Transaction ${this.currentTransactionId} frozen. Origin funds blocked.`);
      });
    }

    if (escalateBtn) {
      escalateBtn.addEventListener('click', async () => {
        escalateBtn.classList.add('disabled');
        await ApiService.escalateCase(this.currentTransactionId, 'TIER_3', 'Escalated to Senior FCU Lead via Case Investigator');
        escalateBtn.classList.remove('disabled');

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.warning('Case Escalated', `Transaction ${this.currentTransactionId} escalated to Senior Review Tier.`);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        clearBtn.classList.add('disabled');
        await ApiService.resolveTransaction(this.currentTransactionId, 'Cleared by investigator after secondary validation');
        clearBtn.classList.remove('disabled');

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.success('Transaction Resolved', `Transaction ${this.currentTransactionId} approved & cleared.`);
      });
    }

    if (fpBtn) {
      fpBtn.addEventListener('click', async () => {
        fpBtn.classList.add('disabled');
        await ApiService.markFalsePositive(this.currentTransactionId, 'Flagged as false positive by investigator');
        fpBtn.classList.remove('disabled');

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.info('Marked False Positive', `Recorded in retraining dataset.`);
      });
    }

    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', async () => {
        const noteInput = document.getElementById('case-new-note');
        const noteText = (noteInput?.value || '').trim();
        if (!noteText) {
          Toast.warning('Empty Note', 'Please enter notes before appending.');
          return;
        }

        saveNoteBtn.classList.add('disabled');
        await ApiService.addCaseNote(this.currentTransactionId, noteText);
        saveNoteBtn.classList.remove('disabled');
        if (noteInput) noteInput.value = '';

        await this.loadTransactionDetails(this.currentTransactionId);
        Toast.success('Note Recorded', 'Journal note committed to SQLite audit trail.');
      });
    }

    if (analystSelect) {
      analystSelect.addEventListener('change', async (e) => {
        const selected = e.target.value;
        await ApiService.assignAnalyst(this.currentTransactionId, selected, `Reassigned to ${selected}`);
        Toast.info('Analyst Reassigned', `Case assigned to ${selected}`);
        await this.loadTransactionDetails(this.currentTransactionId);
      });
    }

    if (prioritySelect) {
      prioritySelect.addEventListener('change', async (e) => {
        const selected = e.target.value;
        await ApiService.updatePriority(this.currentTransactionId, selected, `Priority updated to ${selected}`);
        Toast.info('Priority Updated', `Case SLA priority set to ${selected}`);
        await this.loadTransactionDetails(this.currentTransactionId);
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tx-header-id')) {
    ExplainabilityController.init();
  }
});
