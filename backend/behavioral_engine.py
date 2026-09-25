"""
Aegis Risk Intelligence - Behavioral Fraud Detection Engine
Comprehensive Temporal, Velocity, Structuring, Recipient Burst, and Reputation Analysis Pipeline
"""
import math
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

class BehavioralEngine:
    """
    Maintains real-time account-level transaction windows and computes
    temporal, frequency, structuring, and network dispersion heuristics.
    """

    def __init__(self):
        # In-memory account state stores:
        # sender_history: { orig_account: [ {step, amount, dest, timestamp}, ... ] }
        self.sender_history: Dict[str, List[Dict[str, Any]]] = {}
        # recipient_history: { dest_account: [ {step, amount, orig, timestamp}, ... ] }
        self.recipient_history: Dict[str, List[Dict[str, Any]]] = {}

    def record_transaction(self, orig_account: str, dest_account: str, amount: float, step: int, timestamp: Optional[float] = None) -> None:
        """Records a transaction into the temporal window for sender and recipient."""
        if not orig_account or not dest_account:
            return
        
        now = timestamp if timestamp is not None else time.time()
        record = {
            "orig_account": orig_account,
            "dest_account": dest_account,
            "amount": float(amount),
            "step": int(step),
            "timestamp": now
        }

        if orig_account not in self.sender_history:
            self.sender_history[orig_account] = []
        self.sender_history[orig_account].append(record)

        # Keep sender window limited to last 100 transactions to prevent memory leaks
        if len(self.sender_history[orig_account]) > 100:
            self.sender_history[orig_account] = self.sender_history[orig_account][-100:]

        if dest_account not in self.recipient_history:
            self.recipient_history[dest_account] = []
        self.recipient_history[dest_account].append(record)
        if len(self.recipient_history[dest_account]) > 100:
            self.recipient_history[dest_account] = self.recipient_history[dest_account][-100:]

    def get_sender_window(self, orig_account: str, current_step: int, window_steps: int = 1) -> List[Dict[str, Any]]:
        """Retrieves transactions for a sender within window_steps (1 step = 1 hour)."""
        history = self.sender_history.get(orig_account, [])
        return [tx for tx in history if current_step - window_steps < tx["step"] <= current_step]

    def compute_behavioral_features(
        self,
        orig_account: str,
        dest_account: str,
        amount: float,
        step: int,
        recipient_reputation_score: float = 0.0,
        historical_records: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Computes the complete suite of 13 behavioral features for an incoming transaction.
        """
        amount = float(amount)
        step = int(step)

        # Use passed historical records if provided (e.g. for batch simulation/testing)
        sender_txs = historical_records if historical_records is not None else self.sender_history.get(orig_account, [])
        
        # 1. Filter hour (same step) and day (last 24 steps)
        # Note: including the incoming transaction
        last_hour_txs = [tx for tx in sender_txs if tx["step"] == step]
        last_day_txs = [tx for tx in sender_txs if max(1, step - 24) <= tx["step"] <= step]

        # Ensure current transaction is accounted for
        tx_amounts_hour = [tx["amount"] for tx in last_hour_txs] + [amount]
        tx_dests_hour = [tx["dest_account"] for tx in last_hour_txs] + [dest_account]

        tx_amounts_day = [tx["amount"] for tx in last_day_txs] + [amount]
        tx_dests_day = [tx["dest_account"] for tx in last_day_txs] + [dest_account]

        # Feature 1: transactions_last_hour
        transactions_last_hour = len(tx_amounts_hour)
        # Feature 2: transactions_last_day
        transactions_last_day = len(tx_amounts_day)

        # Feature 3: total_amount_last_hour
        total_amount_last_hour = sum(tx_amounts_hour)
        # Feature 4: total_amount_last_day
        total_amount_last_day = sum(tx_amounts_day)

        # Feature 5: unique_recipients_last_hour
        unique_recipients_last_hour = len(set(tx_dests_hour))
        # Feature 6: unique_recipients_last_day
        unique_recipients_last_day = len(set(tx_dests_day))

        # Feature 7: average_amount_last_hour
        average_amount_last_hour = total_amount_last_hour / transactions_last_hour if transactions_last_hour > 0 else amount
        # Feature 8: average_amount_last_day
        average_amount_last_day = total_amount_last_day / transactions_last_day if transactions_last_day > 0 else amount

        # -------------------------------------------------------------
        # Feature 9: Velocity Score (0 - 100)
        # Evaluates rapid bursts (e.g. 5+ tx/hr, 15+ tx/day, amount surges)
        # -------------------------------------------------------------
        velocity_score = self._calculate_velocity_score(
            transactions_last_hour,
            transactions_last_day,
            total_amount_last_hour,
            average_amount_last_hour
        )

        # Feature 10: transaction_frequency_score (0 - 100)
        freq_ratio = transactions_last_hour / 1.0  # normalized baseline is 1 tx/hr
        transaction_frequency_score = min(100.0, max(0.0, (freq_ratio - 1.0) * 20.0 + (transactions_last_day / 24.0) * 15.0))

        # Feature 11: recipient_diversity_score (0 - 100)
        diversity_ratio = unique_recipients_last_hour / max(1, transactions_last_hour)
        recipient_diversity_score = min(100.0, max(0.0, (unique_recipients_last_hour - 1) * 25.0 * diversity_ratio))

        # -------------------------------------------------------------
        # Feature 12: Structuring Score (0 - 100)
        # Detects smurfing: multiple sub-threshold transactions forming a large total
        # -------------------------------------------------------------
        structuring_score = self._calculate_structuring_score(
            tx_amounts_hour,
            total_amount_last_hour,
            transactions_last_hour
        )

        # -------------------------------------------------------------
        # Recipient Burst Score (0 - 100)
        # Detects 1 sender dispersing funds to multiple accounts rapidly
        # -------------------------------------------------------------
        recipient_burst_score = self._calculate_recipient_burst_score(
            unique_recipients_last_hour,
            transactions_last_hour,
            total_amount_last_hour
        )

        # Feature 13: recipient_reputation_score (0 - 100)
        recipient_reputation_score = min(100.0, max(0.0, float(recipient_reputation_score)))

        # Composite Behavioral Risk Score (0 - 100)
        # Weighted aggregate of the 4 behavioral dimensions
        behavioral_risk_score = min(100.0, max(0.0, (
            velocity_score * 0.35 +
            structuring_score * 0.30 +
            recipient_burst_score * 0.20 +
            recipient_reputation_score * 0.15
        )))

        return {
            "transactions_last_hour": transactions_last_hour,
            "transactions_last_day": transactions_last_day,
            "total_amount_last_hour": round(total_amount_last_hour, 2),
            "total_amount_last_day": round(total_amount_last_day, 2),
            "unique_recipients_last_hour": unique_recipients_last_hour,
            "unique_recipients_last_day": unique_recipients_last_day,
            "average_amount_last_hour": round(average_amount_last_hour, 2),
            "average_amount_last_day": round(average_amount_last_day, 2),
            "velocity_score": round(velocity_score, 1),
            "transaction_frequency_score": round(transaction_frequency_score, 1),
            "recipient_diversity_score": round(recipient_diversity_score, 1),
            "structuring_score": round(structuring_score, 1),
            "recipient_burst_score": round(recipient_burst_score, 1),
            "recipient_reputation_score": round(recipient_reputation_score, 1),
            "behavioral_risk_score": round(behavioral_risk_score, 1),
            "is_velocity_burst": velocity_score >= 65.0,
            "is_structuring": structuring_score >= 60.0,
            "is_recipient_burst": recipient_burst_score >= 60.0,
            "is_high_risk_recipient": recipient_reputation_score >= 60.0
        }

    def _calculate_velocity_score(
        self,
        tx_last_hour: int,
        tx_last_day: int,
        amount_last_hour: float,
        avg_amount_last_hour: float
    ) -> float:
        """
        Calculates a 0-100 velocity score.
        Spikes heavily if:
        - tx_last_hour >= 5 (e.g. 25 in 30 mins -> score 95+)
        - total amount in 1 hour exceeds normal baseline
        """
        score = 0.0

        # Frequency component (up to 55 points)
        if tx_last_hour >= 20:
            score += 55.0
        elif tx_last_hour >= 12:
            score += 45.0
        elif tx_last_hour >= 7:
            score += 35.0
        elif tx_last_hour >= 4:
            score += 22.0
        elif tx_last_hour >= 2:
            score += 10.0

        # Daily frequency surge (up to 25 points)
        if tx_last_day >= 30:
            score += 25.0
        elif tx_last_day >= 18:
            score += 18.0
        elif tx_last_day >= 8:
            score += 10.0

        # Volume velocity (up to 20 points)
        if amount_last_hour > 200000:
            score += 20.0
        elif amount_last_hour > 75000:
            score += 14.0
        elif amount_last_hour > 25000:
            score += 8.0

        return min(100.0, max(0.0, score))

    def _calculate_structuring_score(
        self,
        tx_amounts: List[float],
        total_amount: float,
        count: int
    ) -> float:
        """
        Calculates a 0-100 structuring (smurfing) score.
        Detects repetitive sub-threshold transactions (e.g., 5x ₹1,200 or 8x ₹9,500)
        that aggregate to a significant sum.
        """
        if count < 3:
            return 0.0

        score = 0.0

        # 1. Multiple transactions in the hour (3+ transactions)
        if count >= 6:
            score += 35.0
        elif count >= 4:
            score += 25.0
        else:
            score += 15.0

        # 2. Cumulative volume is substantial (> ₹5,000 or > ₹50,000)
        if total_amount >= 100000:
            score += 30.0
        elif total_amount >= 25000:
            score += 22.0
        elif total_amount >= 5000:
            score += 15.0

        # 3. Low variance among individual transaction amounts (classic smurfing signature)
        mean_amt = total_amount / count
        if mean_amt > 0:
            variance = sum((x - mean_amt) ** 2 for x in tx_amounts) / count
            std_dev = math.sqrt(variance)
            cv = std_dev / mean_amt  # coefficient of variation
            
            # Low CV (< 0.35) indicates uniform structured amounts
            if cv < 0.20:
                score += 35.0
            elif cv < 0.35:
                score += 25.0
            elif cv < 0.50:
                score += 15.0

        return min(100.0, max(0.0, score))

    def _calculate_recipient_burst_score(
        self,
        unique_recipients: int,
        total_tx: int,
        total_amount: float
    ) -> float:
        """
        Calculates a 0-100 recipient burst (fan-out) score.
        Detects 1 sender transferring money to many distinct recipients in a short window.
        """
        if unique_recipients < 2:
            return 0.0

        score = 0.0

        # Number of unique recipients in the hour
        if unique_recipients >= 8:
            score += 55.0
        elif unique_recipients >= 5:
            score += 42.0
        elif unique_recipients >= 3:
            score += 28.0
        elif unique_recipients >= 2:
            score += 15.0

        # High recipient-to-transaction ratio (fan-out dispersion)
        ratio = unique_recipients / max(1, total_tx)
        if ratio >= 0.8:
            score += 25.0
        elif ratio >= 0.6:
            score += 15.0

        # Volume factor
        if total_amount > 50000:
            score += 20.0
        elif total_amount > 10000:
            score += 10.0

        return min(100.0, max(0.0, score))

    def detect_structuring(self, amounts: List[float]) -> Dict[str, Any]:
        """Public interface for structuring/smurfing analysis on a batch of amounts."""
        clean_amounts = [float(a) for a in amounts if a > 0]
        count = len(clean_amounts)
        total = sum(clean_amounts)
        score = self._calculate_structuring_score(clean_amounts, total, count)
        return {
            "structuring_flag": score >= 60.0,
            "structuring_score": round(score, 1),
            "batch_count": count,
            "cumulative_amount": round(total, 2),
            "risk_classification": "High Structuring" if score >= 80 else ("Moderate Structuring" if score >= 50 else "Normal")
        }

    def detect_velocity_spike(self, tx_hour: int, tx_day: int, total_amount_hour: float = 0.0) -> Dict[str, Any]:
        """Public interface for transaction velocity analysis."""
        score = self._calculate_velocity_score(tx_hour, tx_day, total_amount_hour, total_amount_hour / max(1, tx_hour))
        return {
            "velocity_flag": score >= 65.0,
            "velocity_score": round(score, 1),
            "tx_hour": tx_hour,
            "tx_day": tx_day,
            "risk_classification": "High Velocity Alert" if score >= 80 else ("Elevated Activity" if score >= 50 else "Normal Baseline")
        }

    def detect_recipient_burst(self, unique_recipients: int, total_tx: int, total_amount: float = 0.0) -> Dict[str, Any]:
        """Public interface for recipient fan-out burst analysis."""
        score = self._calculate_recipient_burst_score(unique_recipients, total_tx, total_amount)
        return {
            "recipient_burst_flag": score >= 60.0,
            "recipient_burst_score": round(score, 1),
            "unique_recipients": unique_recipients,
            "risk_classification": "High Dispersion Fan-Out" if score >= 80 else ("Moderate Dispersion" if score >= 50 else "Normal")
        }

# Global Singleton Instance
behavioral_engine = BehavioralEngine()
