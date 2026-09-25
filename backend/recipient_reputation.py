"""
Aegis Risk Intelligence - Recipient Reputation & Customer Safety System
Persistent Recipient Risk Database with Prior Fraud Association & Pre-Transfer Safety Checks
"""
import sqlite3
import time
from typing import Dict, List, Optional, Any

class RecipientReputationManager:
    """
    Manages recipient account reputation history, fraud flags, and safety advisory warnings.
    """

    def __init__(self, db_getter):
        self.get_db = db_getter

    def init_schema(self, conn: sqlite3.Connection):
        """Initializes the recipient_reputation SQLite table and seeds initial accounts."""
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recipient_reputation (
                account_id TEXT PRIMARY KEY,
                account_holder TEXT DEFAULT 'External Account',
                account_type TEXT DEFAULT 'MERCHANT_OR_INDIVIDUAL',
                confirmed_fraud_count INTEGER NOT NULL DEFAULT 0,
                high_risk_cases_count INTEGER NOT NULL DEFAULT 0,
                escalated_cases_count INTEGER NOT NULL DEFAULT 0,
                is_frozen INTEGER NOT NULL DEFAULT 0,
                reputation_score REAL NOT NULL DEFAULT 0.0,
                risk_level TEXT NOT NULL DEFAULT 'CLEAN',
                warning_message TEXT,
                tags TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.commit()

    def get_recipient_reputation(self, account_id: str) -> Dict[str, Any]:
        """
        Retrieves the reputation record for a recipient account.
        If unknown, returns default clean status.
        """
        if not account_id:
            return self._default_clean("UNKNOWN")

        conn = self.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recipient_reputation WHERE account_id = ?", (account_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return dict(row)
        
        # Heuristic check for common known test accounts or merchant prefix
        # M-prefixed accounts are merchants (often lower baseline fraud unless compromised)
        # C-prefixed accounts are customer accounts
        return self._default_clean(account_id)

    def _default_clean(self, account_id: str) -> Dict[str, Any]:
        return {
            "account_id": account_id,
            "account_holder": f"Account {account_id}",
            "account_type": "MERCHANT" if account_id.startswith("M") else "INDIVIDUAL",
            "confirmed_fraud_count": 0,
            "high_risk_cases_count": 0,
            "escalated_cases_count": 0,
            "is_frozen": 0,
            "reputation_score": 5.0,
            "risk_level": "CLEAN",
            "warning_message": None,
            "tags": "Verified History",
            "created_at": "2026-01-01 00:00:00",
            "updated_at": "2026-09-25 00:00:00"
        }

    def check_customer_safety(self, account_id: str, amount: float = 0.0) -> Dict[str, Any]:
        """
        Pre-transfer Customer Safety Check.
        Evaluates recipient reputation and returns advisory warning if linked to prior fraud.
        """
        rep = self.get_recipient_reputation(account_id)
        
        is_risky = (
            rep.get("confirmed_fraud_count", 0) > 0 or
            rep.get("reputation_score", 0.0) >= 60.0 or
            rep.get("is_frozen", 0) == 1 or
            rep.get("risk_level") in ["HIGH_RISK", "CRITICAL_FRAUD"]
        )

        warning_text = None
        if is_risky:
            warning_text = (
                "Warning: This recipient account has previously been linked to suspicious or "
                "fraudulent activity. Proceed with caution."
            )

        return {
            "account_id": account_id,
            "account_holder": rep.get("account_holder", f"Account {account_id}"),
            "reputation_score": rep.get("reputation_score", 0.0),
            "risk_level": rep.get("risk_level", "CLEAN"),
            "has_prior_fraud": rep.get("confirmed_fraud_count", 0) > 0,
            "is_frozen": bool(rep.get("is_frozen", 0)),
            "is_safe": not is_risky,
            "warning_required": is_risky,
            "warning_message": warning_text,
            "tags": rep.get("tags", ""),
            "safety_action": "CONFIRMATION_REQUIRED" if is_risky else "SAFE_TO_TRANSFER"
        }

    def update_reputation_on_case_action(self, account_id: str, action: str, notes: str = "") -> None:
        """
        Dynamically updates recipient reputation when an analyst takes action (e.g. FROZEN, RESOLVED, FALSE_POSITIVE).
        """
        if not account_id:
            return

        conn = self.get_db()
        cursor = conn.cursor()
        
        # Check if exists
        cursor.execute("SELECT * FROM recipient_reputation WHERE account_id = ?", (account_id,))
        row = cursor.fetchone()

        now_str = time.strftime("%Y-%m-%d %H:%M:%S")

        if not row:
            # Insert initial
            if action == "FREEZE":
                cursor.execute("""
                    INSERT INTO recipient_reputation 
                    (account_id, confirmed_fraud_count, is_frozen, reputation_score, risk_level, warning_message, tags, created_at, updated_at)
                    VALUES (?, 1, 1, 95.0, 'CRITICAL_FRAUD', 'Account frozen due to confirmed fraud investigation', 'Frozen,Mule Network', ?, ?)
                """, (account_id, now_str, now_str))
            elif action == "ESCALATE":
                cursor.execute("""
                    INSERT INTO recipient_reputation 
                    (account_id, high_risk_cases_count, escalated_cases_count, is_frozen, reputation_score, risk_level, warning_message, tags, created_at, updated_at)
                    VALUES (?, 1, 1, 0, 75.0, 'HIGH_RISK', 'Account involved in escalated high-risk fraud triage', 'Escalated Tier 2', ?, ?)
                """, (account_id, now_str, now_str))
        else:
            rec = dict(row)
            if action == "FREEZE":
                new_fraud = rec["confirmed_fraud_count"] + 1
                new_score = min(100.0, rec["reputation_score"] + 35.0)
                cursor.execute("""
                    UPDATE recipient_reputation 
                    SET confirmed_fraud_count = ?, is_frozen = 1, reputation_score = ?, risk_level = 'CRITICAL_FRAUD',
                        warning_message = 'Account frozen due to confirmed fraud investigation', updated_at = ?
                    WHERE account_id = ?
                """, (new_fraud, new_score, now_str, account_id))
            elif action == "ESCALATE":
                new_esc = rec["escalated_cases_count"] + 1
                new_score = min(100.0, rec["reputation_score"] + 15.0)
                cursor.execute("""
                    UPDATE recipient_reputation 
                    SET escalated_cases_count = ?, reputation_score = ?, risk_level = 'HIGH_RISK', updated_at = ?
                    WHERE account_id = ?
                """, (new_esc, new_score, now_str, account_id))
            elif action == "FALSE_POSITIVE":
                new_score = max(0.0, rec["reputation_score"] - 25.0)
                new_level = "CLEAN" if new_score < 30 else "LOW_RISK"
                cursor.execute("""
                    UPDATE recipient_reputation 
                    SET reputation_score = ?, risk_level = ?, is_frozen = 0, updated_at = ?
                    WHERE account_id = ?
                """, (new_score, new_level, now_str, account_id))

        conn.commit()
        conn.close()
