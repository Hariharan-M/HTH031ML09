"""
Risk Scoring Engine (0 - 100)
Aegis Intelligence Multi-Factor Risk Assessment Module
Combines XGBoost Fraud Probability, Expected Loss, Transaction Size, and Account Behavioral Heuristics.
"""

from typing import Dict, Any

class RiskScoringEngine:
    @staticmethod
    def calculate_risk_score(
        fraud_probability: float,
        expected_loss: float,
        amount: float,
        origin_account_emptied: bool = False,
        is_transfer_or_cashout: bool = True,
        destination_surge: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates a composite 0-100 risk score and categorical tier.
        
        Formula Weights:
        - Fraud Probability Factor (50% max): prob * 50
        - Expected Loss Factor (25% max): min(expected_loss / 200,000, 1.0) * 25
        - Transaction Velocity / Size Factor (15% max): min(amount / 200,000, 1.0) * 15
        - Behavioral Anomaly Factor (10% max):
            + Origin Emptied: +5 pts
            + High Risk Channel (TRANSFER/CASH_OUT): +3 pts
            + Destination Balance Surge: +2 pts
        """
        # Component 1: Probability component (0 - 50 pts)
        prob_score = min(max(fraud_probability, 0.0), 1.0) * 50.0

        # Component 2: Financial exposure component (0 - 25 pts)
        loss_score = min(max(expected_loss, 0.0) / 200000.0, 1.0) * 25.0

        # Component 3: Gross transaction amount component (0 - 15 pts)
        amount_score = min(max(amount, 0.0) / 200000.0, 1.0) * 15.0

        # Component 4: Behavioral heuristics (0 - 10 pts)
        behavior_score = 0.0
        if origin_account_emptied:
            behavior_score += 5.0
        if is_transfer_or_cashout:
            behavior_score += 3.0
        if destination_surge:
            behavior_score += 2.0
        behavior_score = min(behavior_score, 10.0)

        raw_score = prob_score + loss_score + amount_score + behavior_score
        risk_score = int(round(min(max(raw_score, 0.0), 100.0)))

        # Categorical Tier Mapping
        if risk_score >= 86:
            risk_tier = "Critical"
            sla_hours = 1
            recommended_action = "FREEZE_ACCOUNT"
        elif risk_score >= 61:
            risk_tier = "High"
            sla_hours = 4
            recommended_action = "ESCALATE_INVESTIGATION"
        elif risk_score >= 31:
            risk_tier = "Medium"
            sla_hours = 24
            recommended_action = "STEP_UP_AUTH"
        else:
            risk_tier = "Low"
            sla_hours = 72
            recommended_action = "CLEAR_TRANSACTION"

        return {
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "sla_hours": sla_hours,
            "recommended_action": recommended_action,
            "breakdown": {
                "probability_component": round(prob_score, 2),
                "expected_loss_component": round(loss_score, 2),
                "transaction_size_component": round(amount_score, 2),
                "behavioral_penalty": round(behavior_score, 2)
            }
        }
