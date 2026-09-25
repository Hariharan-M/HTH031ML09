"""
Risk Fusion Scoring Engine (0 - 100)
Aegis Intelligence Multi-Factor Risk Assessment Module
Combines:
- 70% XGBoost Machine Learning Probability
- 20% Behavioral Detection Engine (Velocity, Structuring, Recipient Burst)
- 10% Rule-Based & Recipient Reputation Signals
"""
from typing import Dict, Any, Optional

class RiskScoringEngine:
    @staticmethod
    def calculate_fused_risk(
        fraud_probability: float,
        amount: float,
        behavioral_data: Dict[str, Any],
        recipient_reputation: Optional[Dict[str, Any]] = None,
        origin_account_emptied: bool = False,
        is_transfer_or_cashout: bool = True
    ) -> Dict[str, Any]:
        """
        Executes the 70/20/10 Risk Fusion Formula:
        - 70% XGBoost ML Score
        - 20% Behavioral Detection Score
        - 10% Rule-Based & Recipient Reputation Signals
        """
        # 1. XGBoost ML Component (0 - 70 points max)
        prob = min(max(float(fraud_probability), 0.0), 1.0)
        ml_score = prob * 100.0
        ml_weighted = ml_score * 0.70

        # 2. Behavioral Detection Component (0 - 20 points max)
        # Extract individual behavioral scores
        velocity_score = float(behavioral_data.get("velocity_score", 0.0))
        structuring_score = float(behavioral_data.get("structuring_score", 0.0))
        recipient_burst_score = float(behavioral_data.get("recipient_burst_score", 0.0))
        behavioral_score = float(behavioral_data.get("behavioral_risk_score", 0.0))

        # Peak behavioral signal dominance (takes max of specialized triggers or blended)
        peak_behavioral = max(behavioral_score, velocity_score, structuring_score, recipient_burst_score)
        behavioral_weighted = (peak_behavioral * 0.6 + behavioral_score * 0.4) * 0.20

        # 3. Rule-Based & Reputation Component (0 - 10 points max)
        rule_raw = 0.0
        rep_score = float(recipient_reputation.get("reputation_score", 0.0)) if recipient_reputation else float(behavioral_data.get("recipient_reputation_score", 0.0))
        
        # Recipient reputation penalty (up to 40 pts in rule space)
        rule_raw += (rep_score / 100.0) * 40.0

        # Account liquidation penalty (up to 30 pts in rule space)
        if origin_account_emptied:
            rule_raw += 30.0

        # High-risk channel (TRANSFER/CASH_OUT) + Large Amount (>100k) (up to 30 pts in rule space)
        if is_transfer_or_cashout and amount > 100000:
            rule_raw += 30.0
        elif is_transfer_or_cashout:
            rule_raw += 15.0

        rule_raw = min(100.0, max(0.0, rule_raw))
        rule_weighted = rule_raw * 0.10

        # Composite Fused Score (0 - 100)
        final_score_float = ml_weighted + behavioral_weighted + rule_weighted
        final_risk_score = int(round(min(max(final_score_float, 0.0), 100.0)))

        # Categorical Tier & Recommended Action
        if final_risk_score >= 85:
            risk_tier = "Critical Risk"
            sla_hours = 1
            recommended_action = "FREEZE_ACCOUNT"
        elif final_risk_score >= 65:
            risk_tier = "High Risk"
            sla_hours = 4
            recommended_action = "ESCALATE_INVESTIGATION"
        elif final_risk_score >= 35:
            risk_tier = "Medium Risk"
            sla_hours = 24
            recommended_action = "STEP_UP_AUTH"
        else:
            risk_tier = "Low Risk"
            sla_hours = 72
            recommended_action = "CLEAR_TRANSACTION"

        # Fraud Category Classification
        if velocity_score >= 65.0:
            category = "VELOCITY"
        elif structuring_score >= 60.0:
            category = "STRUCTURING"
        elif rep_score >= 60.0 or recipient_burst_score >= 60.0:
            category = "RECIPIENT_RISK"
        elif prob >= 0.50:
            category = "TRADITIONAL"
        else:
            category = "NORMAL"

        expected_loss = prob * amount

        return {
            "final_risk_score": final_risk_score,
            "final_risk_tier": risk_tier,
            "category": category,
            "fraud_probability": round(prob, 4),
            "expected_loss": round(expected_loss, 2),
            "sla_hours": sla_hours,
            "recommended_action": recommended_action,
            "weights": {
                "ml_weight": 0.70,
                "behavioral_weight": 0.20,
                "rule_weight": 0.10
            },
            "sub_scores": {
                "ml_score": round(ml_score, 1),
                "ml_contribution": round(ml_weighted, 2),
                "behavioral_score": round(behavioral_score, 1),
                "behavioral_contribution": round(behavioral_weighted, 2),
                "velocity_score": round(velocity_score, 1),
                "structuring_score": round(structuring_score, 1),
                "recipient_burst_score": round(recipient_burst_score, 1),
                "recipient_reputation_score": round(rep_score, 1),
                "rule_score": round(rule_raw, 1),
                "rule_contribution": round(rule_weighted, 2)
            }
        }

    @staticmethod
    def calculate_risk_score(
        fraud_probability: float,
        expected_loss: float,
        amount: float,
        origin_account_emptied: bool = False,
        is_transfer_or_cashout: bool = True,
        destination_surge: bool = False
    ) -> Dict[str, Any]:
        """Backward-compatible helper for existing legacy callers."""
        prob_score = min(max(fraud_probability, 0.0), 1.0) * 50.0
        loss_score = min(max(expected_loss, 0.0) / 200000.0, 1.0) * 25.0
        amount_score = min(max(amount, 0.0) / 200000.0, 1.0) * 15.0
        behavior_score = 0.0
        if origin_account_emptied: behavior_score += 5.0
        if is_transfer_or_cashout: behavior_score += 3.0
        if destination_surge: behavior_score += 2.0

        raw_score = prob_score + loss_score + amount_score + behavior_score
        risk_score = int(round(min(max(raw_score, 0.0), 100.0)))
        tier = "Critical Risk" if risk_score >= 85 else ("High Risk" if risk_score >= 65 else ("Medium Risk" if risk_score >= 35 else "Low Risk"))
        
        return {
            "risk_score": risk_score,
            "risk_tier": tier,
            "sla_hours": 1 if risk_score >= 85 else (4 if risk_score >= 65 else 24),
            "recommended_action": "FREEZE_ACCOUNT" if risk_score >= 85 else "CLEAR_TRANSACTION"
        }
