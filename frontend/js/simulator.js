/**
 * Simulator Controller - Live Inference & Scenario Playground
 * Aegis Risk Intelligence - ReactBits Palette Architecture
 */
const SimulatorController = {
  presets: {
    wire_drain: {
      step: 300,
      type: 4, // TRANSFER
      amount: 850000.00,
      oldbalanceOrg: 850000.00,
      newbalanceOrig: 0.00,
      oldbalanceDest: 0.00,
      newbalanceDest: 850000.00
    },
    account_takeover: {
      step: 310,
      type: 4, // TRANSFER
      amount: 620000.00,
      oldbalanceOrg: 620000.00,
      newbalanceOrig: 0.00,
      oldbalanceDest: 500.00,
      newbalanceDest: 620500.00
    },
    cash_out: {
      step: 290,
      type: 1, // CASH_OUT
      amount: 180000.00,
      oldbalanceOrg: 185000.00,
      newbalanceOrig: 5000.00,
      oldbalanceDest: 10000.00,
      newbalanceDest: 190000.00
    },
    dest_surge: {
      step: 275,
      type: 4, // TRANSFER
      amount: 95000.00,
      oldbalanceOrg: 100000.00,
      newbalanceOrig: 5000.00,
      oldbalanceDest: 1200.00,
      newbalanceDest: 96200.00
    },
    normal_payment: {
      step: 150,
      type: 3, // PAYMENT
      amount: 320.00,
      oldbalanceOrg: 5400.00,
      newbalanceOrig: 5080.00,
      oldbalanceDest: 0.00,
      newbalanceDest: 0.00
    }
  },

  channelNames: {
    0: 'CASH_IN',
    1: 'CASH_OUT',
    2: 'DEBIT',
    3: 'PAYMENT',
    4: 'TRANSFER'
  },

  init() {
    this.attachEventListeners();
    this.loadPreset('wire_drain');
    this.runSimulation();
  },

  loadPreset(presetKey) {
    const data = this.presets[presetKey];
    if (!data) return;

    document.getElementById('sim-step').value = data.step;
    document.getElementById('sim-type').value = data.type;
    document.getElementById('sim-amount').value = data.amount;
    document.getElementById('sim-oldbalanceOrg').value = data.oldbalanceOrg;
    document.getElementById('sim-newbalanceOrig').value = data.newbalanceOrig;
    document.getElementById('sim-oldbalanceDest').value = data.oldbalanceDest;
    document.getElementById('sim-newbalanceDest').value = data.newbalanceDest;

    this.updateDerivedFeatures();
  },

  updateDerivedFeatures() {
    const amount = parseFloat(document.getElementById('sim-amount').value) || 0;
    const oldOrig = parseFloat(document.getElementById('sim-oldbalanceOrg').value) || 0;
    const newOrig = parseFloat(document.getElementById('sim-newbalanceOrig').value) || 0;
    const oldDest = parseFloat(document.getElementById('sim-oldbalanceDest').value) || 0;
    const newDest = parseFloat(document.getElementById('sim-newbalanceDest').value) || 0;

    const diffOrig = oldOrig - newOrig;
    const diffDest = newDest - oldDest;
    const emptied = newOrig === 0 && oldOrig > 0;
    const large = amount > 100000;

    const diffOrigEl = document.getElementById('derived-diff-orig');
    const diffDestEl = document.getElementById('derived-diff-dest');
    const emptiedEl = document.getElementById('derived-emptied');
    const largeEl = document.getElementById('derived-large');

    if (diffOrigEl) diffOrigEl.textContent = formatCurrency(diffOrig);
    if (diffDestEl) diffDestEl.textContent = formatCurrency(diffDest);
    
    if (emptiedEl) {
      emptiedEl.textContent = emptied ? 'TRUE (Account Emptied)' : 'FALSE (0)';
      emptiedEl.style.color = emptied ? 'var(--status-danger)' : 'var(--text-muted)';
    }

    if (largeEl) {
      largeEl.textContent = large ? 'TRUE (> $100k)' : 'FALSE (0)';
      largeEl.style.color = large ? 'var(--status-danger)' : 'var(--text-muted)';
    }
  },

  async runSimulation() {
    const btn = document.getElementById('runSimulationBtn');
    const spinner = document.getElementById('sim-spinner');

    if (btn) btn.classList.add('disabled');
    if (spinner) spinner.classList.remove('d-none');

    const typeVal = parseInt(document.getElementById('sim-type').value) || 0;
    const amountVal = parseFloat(document.getElementById('sim-amount').value) || 0;
    const oldOrgVal = parseFloat(document.getElementById('sim-oldbalanceOrg').value) || 0;
    const newOrgVal = parseFloat(document.getElementById('sim-newbalanceOrig').value) || 0;
    const oldDestVal = parseFloat(document.getElementById('sim-oldbalanceDest').value) || 0;
    const newDestVal = parseFloat(document.getElementById('sim-newbalanceDest').value) || 0;

    const payload = {
      step: parseInt(document.getElementById('sim-step').value) || 1,
      type: typeVal,
      amount: amountVal,
      oldbalanceOrg: oldOrgVal,
      newbalanceOrig: newOrgVal,
      oldbalanceDest: oldDestVal,
      newbalanceDest: newDestVal
    };

    const startTime = performance.now();
    try {
      const result = await ApiService.predictTransaction(payload);
      const latency = Math.round(performance.now() - startTime);

      this.renderResults(result, latency, payload);
    } catch (err) {
      console.error('Simulation error:', err);
      Toast.danger('Inference Failed', 'Unable to reach the prediction service.');
    } finally {
      if (btn) btn.classList.remove('disabled');
      if (spinner) spinner.classList.add('d-none');
    }
  },

  renderResults(res, latency, inputPayload) {
    const resultCard = document.getElementById('sim-result-card');
    if (resultCard) resultCard.classList.remove('d-none');

    const predBadge = document.getElementById('sim-pred-badge');
    const riskTierBadge = document.getElementById('sim-risk-tier-badge');
    const probEl = document.getElementById('sim-prob-val');
    const lossEl = document.getElementById('sim-loss-val');
    const latencyEl = document.getElementById('sim-latency');
    const reasonsContainer = document.getElementById('sim-reasons-list');
    
    const recBox = document.getElementById('sim-recommendation-box');
    const recIcon = document.getElementById('sim-rec-icon');
    const recTitle = document.getElementById('sim-rec-title');
    const recText = document.getElementById('sim-rec-text');
    const narrativeText = document.getElementById('sim-narrative-text');

    const prob = res.fraud_probability || 0;
    const isFraud = res.prediction === 'FRAUD' || prob >= 0.50;

    // Latency
    if (latencyEl) latencyEl.textContent = `${latency}ms Latency`;

    // Prediction Badge
    if (predBadge) {
      if (isFraud) {
        predBadge.className = 'status-pill pill-critical';
        predBadge.innerHTML = '<i class="bi bi-shield-slash"></i> FRAUD DETECTED';
      } else {
        predBadge.className = 'status-pill pill-low';
        predBadge.innerHTML = '<i class="bi bi-shield-check"></i> LEGITIMATE TRANSACTION';
      }
    }

    // Risk Tier Badge
    if (riskTierBadge) {
      if (prob >= 0.85) {
        riskTierBadge.className = 'status-pill pill-critical';
        riskTierBadge.textContent = 'Critical Risk';
      } else if (prob >= 0.70) {
        riskTierBadge.className = 'status-pill pill-high';
        riskTierBadge.textContent = 'High Risk';
      } else if (prob >= 0.40) {
        riskTierBadge.className = 'status-pill pill-medium';
        riskTierBadge.textContent = 'Medium Risk';
      } else {
        riskTierBadge.className = 'status-pill pill-low';
        riskTierBadge.textContent = 'Low Risk';
      }
    }

    // Probability & Loss values
    if (probEl) {
      probEl.textContent = formatPercent(prob, 2);
      probEl.style.color = isFraud ? 'var(--status-danger)' : 'var(--status-success)';
    }
    if (lossEl) {
      lossEl.textContent = formatCurrency(res.expected_loss || 0);
      lossEl.style.color = isFraud ? 'var(--status-danger)' : 'var(--status-success)';
    }

    // Influencing Attributions (SHAP Drivers)
    if (reasonsContainer) {
      const reasons = res.reasons || [];
      if (reasons.length === 0) {
        reasonsContainer.innerHTML = `
          <div style="color: var(--text-muted); font-size: 0.75rem; padding: 8px 0;">
            No abnormal risk factors detected. Feature attributions remain within standard baseline bounds.
          </div>
        `;
      } else {
        reasonsContainer.innerHTML = reasons.map(r => `
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; padding: 6px 10px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-sm);">
            <i class="bi bi-exclamation-triangle-fill" style="color: var(--status-danger);"></i>
            <span style="color: var(--text-primary);">${r}</span>
          </div>
        `).join('');
      }
    }

    // Recommendation Box Logic
    if (recBox && recTitle && recText && recIcon) {
      if (prob >= 0.85) {
        recBox.style.background = 'rgba(239, 68, 68, 0.08)';
        recBox.style.borderColor = 'rgba(239, 68, 68, 0.22)';
        recIcon.className = 'bi bi-exclamation-octagon-fill';
        recIcon.style.color = 'var(--status-danger)';
        recTitle.style.color = 'var(--status-danger)';
        recTitle.textContent = 'CRITICAL ACTION REQUIRED';
        recText.textContent = 'Immediate intervention required. Freeze origin account and halt settlement dispatch to prevent permanent wire loss. Escalate case to Senior Financial Crime Unit.';
      } else if (prob >= 0.70) {
        recBox.style.background = 'rgba(245, 158, 11, 0.08)';
        recBox.style.borderColor = 'rgba(245, 158, 11, 0.22)';
        recIcon.className = 'bi bi-shield-exclamation';
        recIcon.style.color = 'var(--status-warning)';
        recTitle.style.color = 'var(--status-warning)';
        recTitle.textContent = 'HIGH RISK - MANUAL INVESTIGATION';
        recText.textContent = 'Secondary analyst verification required. Flag transaction for manual wire confirmation and temporarily hold settlement dispatch window.';
      } else if (prob >= 0.40) {
        recBox.style.background = 'rgba(139, 92, 246, 0.08)';
        recBox.style.borderColor = 'rgba(139, 92, 246, 0.22)';
        recIcon.className = 'bi bi-shield-shaded';
        recIcon.style.color = 'var(--accent-primary)';
        recTitle.style.color = 'var(--accent-primary)';
        recTitle.textContent = 'MEDIUM RISK - STEP-UP AUTHENTICATION';
        recText.textContent = 'Trigger out-of-band MFA/OTP challenge. Monitor originator for rapid velocity spikes in subsequent clearing cycles.';
      } else {
        recBox.style.background = 'rgba(34, 197, 94, 0.08)';
        recBox.style.borderColor = 'rgba(34, 197, 94, 0.22)';
        recIcon.className = 'bi bi-check-circle-fill';
        recIcon.style.color = 'var(--status-success)';
        recTitle.style.color = 'var(--status-success)';
        recTitle.textContent = 'CLEARED FOR SETTLEMENT';
        recText.textContent = 'No action required. Transaction pattern conforms to normal consumer banking behavior and falls within expected velocity limits.';
      }
    }

    // Natural Language Case Narrative Generator
    if (narrativeText && inputPayload) {
      const channel = this.channelNames[inputPayload.type] || 'TRANSFER';
      const formattedAmt = formatCurrency(inputPayload.amount);
      const isZeroOrig = inputPayload.newbalanceOrig === 0 && inputPayload.oldbalanceOrg > 0;
      
      let narrative = `Evaluation of ${channel} request for ${formattedAmt}. `;
      if (prob >= 0.70) {
        narrative += `The XGBoost ensemble detected severe anomaly signatures with a fraud probability of ${formatPercent(prob, 1)}. `;
        if (isZeroOrig) {
          narrative += `The originator account was depleted to $0.00 from an opening balance of ${formatCurrency(inputPayload.oldbalanceOrg)}. `;
        }
        narrative += `TreeSHAP attributions indicate that transaction volume, balance deltas, and zeroing flags represent the primary risk drivers.`;
      } else if (prob >= 0.40) {
        narrative += `The transaction exhibits moderate divergence from normal volume, with an estimated fraud likelihood of ${formatPercent(prob, 1)}. Balance movements warrant automated step-up verification.`;
      } else {
        narrative += `The model classified this transaction as legitimate with nominal risk (${formatPercent(prob, 1)} probability). Account balance trajectories before and after execution remain within standard operational tolerances.`;
      }

      narrativeText.textContent = narrative;
    }
  },

  attachEventListeners() {
    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.loadPreset(presetKey);
        this.runSimulation();
      });
    });

    // Input listeners for derived updates
    ['sim-amount', 'sim-oldbalanceOrg', 'sim-newbalanceOrig', 'sim-oldbalanceDest', 'sim-newbalanceDest'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => this.updateDerivedFeatures());
      }
    });

    // Run Predict Button
    const runBtn = document.getElementById('runSimulationBtn');
    if (runBtn) {
      runBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.runSimulation();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sim-amount')) {
    SimulatorController.init();
  }
});
