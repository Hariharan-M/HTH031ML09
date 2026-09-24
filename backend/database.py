"""
Database Persistence & Triage Lifecycle Management Engine
SQLite Schema with Case Management, Alerting, Audit Trail, and ML Feedback Store
"""
import sqlite3
import os
import json
import csv
import io
from datetime import datetime
from typing import Dict, List, Optional, Any

from risk_engine import RiskScoringEngine

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fraud_triage.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Transactions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            step INTEGER NOT NULL,
            type TEXT NOT NULL,
            type_code INTEGER NOT NULL,
            amount REAL NOT NULL,
            orig_account TEXT NOT NULL,
            dest_account TEXT NOT NULL,
            oldbalance_org REAL NOT NULL,
            newbalance_orig REAL NOT NULL,
            oldbalance_dest REAL NOT NULL,
            newbalance_dest REAL NOT NULL,
            balance_diff_orig REAL NOT NULL,
            balance_diff_dest REAL NOT NULL,
            origin_account_emptied INTEGER NOT NULL,
            large_transaction INTEGER NOT NULL,
            prediction TEXT NOT NULL,
            fraud_probability REAL NOT NULL,
            expected_loss REAL NOT NULL,
            risk_score INTEGER NOT NULL DEFAULT 50,
            risk_level TEXT NOT NULL,
            top_reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            priority TEXT NOT NULL DEFAULT 'HIGH',
            assigned_analyst TEXT DEFAULT 'Risk Analyst II',
            analyst_notes TEXT,
            escalation_level TEXT DEFAULT 'TIER_1',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 2. Case Management Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'OPEN',
            priority TEXT NOT NULL DEFAULT 'HIGH',
            assigned_analyst TEXT NOT NULL DEFAULT 'Risk Analyst II',
            escalation_level TEXT NOT NULL DEFAULT 'TIER_1',
            case_notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    """)

    # 3. Real-Time Alerts Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            acknowledged INTEGER NOT NULL DEFAULT 0,
            acknowledged_by TEXT,
            acknowledged_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    """)

    # 4. Immutable Audit Trail Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT NOT NULL,
            action TEXT NOT NULL,
            previous_status TEXT,
            new_status TEXT NOT NULL,
            analyst TEXT NOT NULL,
            notes TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    """)

    # 5. Frozen Accounts Ledger
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS frozen_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id TEXT NOT NULL,
            transaction_id TEXT NOT NULL,
            frozen_by TEXT NOT NULL,
            freeze_reason TEXT NOT NULL,
            amount_secured REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE_BLOCK',
            frozen_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    """)

    # 6. False Positives Retraining Dataset
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS false_positives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT NOT NULL,
            orig_account TEXT NOT NULL,
            marked_by TEXT NOT NULL,
            justification TEXT NOT NULL,
            model_version TEXT NOT NULL DEFAULT 'XGBoost v2.4',
            marked_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    """)

    conn.commit()

    # Seed initial transactions if table is empty
    cursor.execute("SELECT COUNT(*) FROM transactions")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_initial_data(cursor)
        conn.commit()

    conn.close()

def seed_initial_data(cursor):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    initial_txs = [
        {
            "id": "TX-948271",
            "step": 302,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 850000.00,
            "orig_account": "C847291039",
            "dest_account": "M928371029",
            "oldbalance_org": 850000.00,
            "newbalance_orig": 0.00,
            "oldbalance_dest": 0.00,
            "newbalance_dest": 850000.00,
            "balance_diff_orig": 850000.00,
            "balance_diff_dest": 850000.00,
            "origin_account_emptied": 1,
            "large_transaction": 1,
            "prediction": "FRAUD",
            "fraud_probability": 0.9942,
            "expected_loss": 845070.00,
            "risk_score": 98,
            "risk_level": "Critical",
            "top_reason": "Sender account emptied & massive wire transfer",
            "status": "PENDING",
            "priority": "CRITICAL",
            "assigned_analyst": "Sarah Lin (Lead FCU)",
            "analyst_notes": "Initial alert generated: Account drained to zero via offshore wire.",
            "escalation_level": "TIER_2",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948268",
            "step": 301,
            "type": "CASH_OUT",
            "type_code": 1,
            "amount": 420000.00,
            "orig_account": "C192830192",
            "dest_account": "C902817201",
            "oldbalance_org": 425000.00,
            "newbalance_orig": 5000.00,
            "oldbalance_dest": 12000.00,
            "newbalance_dest": 432000.00,
            "balance_diff_orig": 420000.00,
            "balance_diff_dest": 420000.00,
            "origin_account_emptied": 0,
            "large_transaction": 1,
            "prediction": "FRAUD",
            "fraud_probability": 0.9630,
            "expected_loss": 404460.00,
            "risk_score": 92,
            "risk_level": "Critical",
            "top_reason": "Rapid ATM/Terminal cash out after balance inflow",
            "status": "PENDING",
            "priority": "CRITICAL",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "Rapid cash out spike detected at POS terminal.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948255",
            "step": 300,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 290000.00,
            "orig_account": "C583920193",
            "dest_account": "C482910394",
            "oldbalance_org": 290000.00,
            "newbalance_orig": 0.00,
            "oldbalance_dest": 1500.00,
            "newbalance_dest": 291500.00,
            "balance_diff_orig": 290000.00,
            "balance_diff_dest": 290000.00,
            "origin_account_emptied": 1,
            "large_transaction": 1,
            "prediction": "FRAUD",
            "fraud_probability": 0.9410,
            "expected_loss": 272890.00,
            "risk_score": 88,
            "risk_level": "Critical",
            "top_reason": "Total balance depletion via transfer",
            "status": "UNDER_REVIEW",
            "priority": "HIGH",
            "assigned_analyst": "Elena Rostova",
            "analyst_notes": "Out-of-band verification challenge dispatched to account holder.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948240",
            "step": 298,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 175000.00,
            "orig_account": "C392817294",
            "dest_account": "C993820192",
            "oldbalance_org": 180000.00,
            "newbalance_orig": 5000.00,
            "oldbalance_dest": 500.00,
            "newbalance_dest": 175500.00,
            "balance_diff_orig": 175000.00,
            "balance_diff_dest": 175000.00,
            "origin_account_emptied": 0,
            "large_transaction": 1,
            "prediction": "FRAUD",
            "fraud_probability": 0.8870,
            "expected_loss": 155225.00,
            "risk_score": 82,
            "risk_level": "High",
            "top_reason": "High velocity transfer exceeding customer 90-day baseline",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "New beneficiary account added 12 minutes before transfer.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948231",
            "step": 295,
            "type": "CASH_OUT",
            "type_code": 1,
            "amount": 120000.00,
            "orig_account": "C284910294",
            "dest_account": "M847291049",
            "oldbalance_org": 120000.00,
            "newbalance_orig": 0.00,
            "oldbalance_dest": 0.00,
            "newbalance_dest": 120000.00,
            "balance_diff_orig": 120000.00,
            "balance_diff_dest": 120000.00,
            "origin_account_emptied": 1,
            "large_transaction": 1,
            "prediction": "FRAUD",
            "fraud_probability": 0.8540,
            "expected_loss": 102480.00,
            "risk_score": 79,
            "risk_level": "High",
            "top_reason": "Zero-balance cash liquidation",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_analyst": "Sarah Lin (Lead FCU)",
            "analyst_notes": "Suspicious ATM withdrawal series.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948219",
            "step": 292,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 68000.00,
            "orig_account": "C102938475",
            "dest_account": "C992817263",
            "oldbalance_org": 75000.00,
            "newbalance_orig": 7000.00,
            "oldbalance_dest": 4000.00,
            "newbalance_dest": 72000.00,
            "balance_diff_orig": 68000.00,
            "balance_diff_dest": 68000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.7290,
            "expected_loss": 49572.00,
            "risk_score": 67,
            "risk_level": "High",
            "top_reason": "Destination account balance surge anomaly",
            "status": "PENDING",
            "priority": "MEDIUM",
            "assigned_analyst": "Elena Rostova",
            "analyst_notes": "Secondary analyst review pending.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948205",
            "step": 290,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 42000.00,
            "orig_account": "C482910492",
            "dest_account": "C192837465",
            "oldbalance_org": 45000.00,
            "newbalance_orig": 3000.00,
            "oldbalance_dest": 10000.00,
            "newbalance_dest": 52000.00,
            "balance_diff_orig": 42000.00,
            "balance_diff_dest": 42000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.5840,
            "expected_loss": 24528.00,
            "risk_score": 52,
            "risk_level": "Medium",
            "top_reason": "Unusual origin transfer volume spike",
            "status": "UNDER_REVIEW",
            "priority": "MEDIUM",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "Step-up OTP challenge requested.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": "TX-948190",
            "step": 288,
            "type": "PAYMENT",
            "type_code": 3,
            "amount": 18500.00,
            "orig_account": "C738291048",
            "dest_account": "M928374651",
            "oldbalance_org": 20000.00,
            "newbalance_orig": 1500.00,
            "oldbalance_dest": 0.00,
            "newbalance_dest": 0.00,
            "balance_diff_orig": 18500.00,
            "balance_diff_dest": 0.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.4420,
            "expected_loss": 8177.00,
            "risk_score": 41,
            "risk_level": "Medium",
            "top_reason": "Merchant payment exceeding typical account profile",
            "status": "PENDING",
            "priority": "LOW",
            "assigned_analyst": "Elena Rostova",
            "analyst_notes": "Low velocity profile.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        # Frozen cases
        {
            "id": "TX-948150",
            "step": 280,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 620000.00,
            "orig_account": "C998877665",
            "dest_account": "M112233445",
            "oldbalance_org": 620000.00,
            "newbalance_orig": 0.00,
            "oldbalance_dest": 0.00,
            "newbalance_dest": 620000.00,
            "balance_diff_orig": 620000.00,
            "balance_diff_dest": 620000.00,
            "origin_account_emptied": 1,
            "large_transaction": 1,
            "prediction": "FRAUD",
            "fraud_probability": 0.9981,
            "expected_loss": 618822.00,
            "risk_score": 99,
            "risk_level": "Critical",
            "top_reason": "Confirmed Account Takeover & liquidation",
            "status": "FROZEN",
            "priority": "CRITICAL",
            "assigned_analyst": "Sarah Lin (Lead FCU)",
            "analyst_notes": "Account frozen immediately. Funds held in escrow.",
            "escalation_level": "TIER_3",
            "created_at": now,
            "updated_at": now
        },
        # Resolved cases
        {
            "id": "TX-948110",
            "step": 275,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 95000.00,
            "orig_account": "C445566778",
            "dest_account": "C889900112",
            "oldbalance_org": 100000.00,
            "newbalance_orig": 5000.00,
            "oldbalance_dest": 2000.00,
            "newbalance_dest": 97000.00,
            "balance_diff_orig": 95000.00,
            "balance_diff_dest": 95000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.6120,
            "expected_loss": 58140.00,
            "risk_score": 58,
            "risk_level": "Medium",
            "top_reason": "Escrow real estate closing wire",
            "status": "RESOLVED",
            "priority": "MEDIUM",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "Customer verified wire via voice biometric challenge. Case resolved.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        },
        # False Positives
        {
            "id": "TX-948080",
            "step": 270,
            "type": "CASH_OUT",
            "type_code": 1,
            "amount": 80000.00,
            "orig_account": "C123456789",
            "dest_account": "C987654321",
            "oldbalance_org": 82000.00,
            "newbalance_orig": 2000.00,
            "oldbalance_dest": 5000.00,
            "newbalance_dest": 85000.00,
            "balance_diff_orig": 80000.00,
            "balance_diff_dest": 80000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.5400,
            "expected_loss": 43200.00,
            "risk_score": 49,
            "risk_level": "Medium",
            "top_reason": "Vehicle purchase cash-out",
            "status": "FALSE_POSITIVE",
            "priority": "LOW",
            "assigned_analyst": "Elena Rostova",
            "analyst_notes": "Verified business equipment purchase invoice. Labeled as False Positive.",
            "escalation_level": "TIER_1",
            "created_at": now,
            "updated_at": now
        }
    ]

    for tx in initial_txs:
        cursor.execute("""
            INSERT OR REPLACE INTO transactions (
                id, step, type, type_code, amount, orig_account, dest_account,
                oldbalance_org, newbalance_orig, oldbalance_dest, newbalance_dest,
                balance_diff_orig, balance_diff_dest, origin_account_emptied, large_transaction,
                prediction, fraud_probability, expected_loss, risk_score, risk_level, top_reason,
                status, priority, assigned_analyst, analyst_notes, escalation_level, created_at, updated_at
            ) VALUES (
                :id, :step, :type, :type_code, :amount, :orig_account, :dest_account,
                :oldbalance_org, :newbalance_orig, :oldbalance_dest, :newbalance_dest,
                :balance_diff_orig, :balance_diff_dest, :origin_account_emptied, :large_transaction,
                :prediction, :fraud_probability, :expected_loss, :risk_score, :risk_level, :top_reason,
                :status, :priority, :assigned_analyst, :analyst_notes, :escalation_level, :created_at, :updated_at
            )
        """, tx)

        # Create corresponding Case
        cursor.execute("""
            INSERT OR REPLACE INTO cases (
                case_id, transaction_id, status, priority, assigned_analyst, escalation_level, case_notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"CASE-{tx['id'].replace('TX-', '')}",
            tx["id"],
            "OPEN" if tx["status"] in ["PENDING", "UNDER_REVIEW"] else "CLOSED",
            tx["priority"],
            tx["assigned_analyst"],
            tx["escalation_level"],
            tx["analyst_notes"],
            now,
            now
        ))

        # Create corresponding Audit Log
        cursor.execute("""
            INSERT INTO audit_logs (
                transaction_id, action, previous_status, new_status, analyst, notes, timestamp
            ) VALUES (?, 'INGESTION', NULL, ?, 'XGBoost Risk Pipeline', ?, ?)
        """, (tx["id"], tx["status"], tx["analyst_notes"], now))

        # If Critical or High, generate an Alert
        if tx["risk_score"] >= 80:
            cursor.execute("""
                INSERT INTO alerts (
                    transaction_id, alert_type, severity, title, description, acknowledged, created_at
                ) VALUES (?, 'CRITICAL_RISK_SURGE', 'CRITICAL', ?, ?, 0, ?)
            """, (
                tx["id"],
                f"Critical Risk: {tx['type']} of ${tx['amount']:,.2f} ({tx['orig_account']})",
                f"Fraud probability is {tx['fraud_probability']*100:.1f}%. Expected financial loss is ${tx['expected_loss']:,.2f}. {tx['top_reason']}",
                now
            ))
        elif tx["risk_score"] >= 60:
            cursor.execute("""
                INSERT INTO alerts (
                    transaction_id, alert_type, severity, title, description, acknowledged, created_at
                ) VALUES (?, 'HIGH_EXPOSURE_ALERT', 'HIGH', ?, ?, 0, ?)
            """, (
                tx["id"],
                f"High Financial Exposure: ${tx['amount']:,.2f}",
                f"Transaction flagged with risk score {tx['risk_score']}/100. Requires analyst review.",
                now
            ))

        # If Frozen, record in frozen_accounts
        if tx["status"] == "FROZEN":
            cursor.execute("""
                INSERT INTO frozen_accounts (
                    account_id, transaction_id, frozen_by, freeze_reason, amount_secured, status, frozen_at
                ) VALUES (?, ?, ?, ?, ?, 'ACTIVE_BLOCK', ?)
            """, (tx["orig_account"], tx["id"], tx["assigned_analyst"], tx["top_reason"], tx["amount"], now))

        # If False Positive, record in false_positives
        if tx["status"] == "FALSE_POSITIVE":
            cursor.execute("""
                INSERT INTO false_positives (
                    transaction_id, orig_account, marked_by, justification, model_version, marked_at
                ) VALUES (?, ?, ?, ?, 'XGBoost v2.4', ?)
            """, (tx["id"], tx["orig_account"], tx["assigned_analyst"], tx["analyst_notes"], now))

# ==============================================================================
# MUTATION & CASE MANAGEMENT FUNCTIONS
# ==============================================================================

def update_transaction_status(transaction_id: str, new_status: str, action_name: str, analyst: str = "Risk Analyst II", notes: str = "") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    prev_status = row["status"]
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE transactions
        SET status = ?, analyst_notes = COALESCE(?, analyst_notes), updated_at = ?
        WHERE id = ?
    """, (new_status, notes if notes else None, now, transaction_id))

    cursor.execute("""
        UPDATE cases
        SET status = ?, case_notes = COALESCE(?, case_notes), updated_at = ?
        WHERE transaction_id = ?
    """, ("OPEN" if new_status in ["PENDING", "UNDER_REVIEW"] else "CLOSED", notes if notes else None, now, transaction_id))

    cursor.execute("""
        INSERT INTO audit_logs (
            transaction_id, action, previous_status, new_status, analyst, notes, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (transaction_id, action_name, prev_status, new_status, analyst, notes, now))

    # If action is Freeze, record in frozen_accounts
    if new_status == "FROZEN":
        cursor.execute("""
            INSERT INTO frozen_accounts (
                account_id, transaction_id, frozen_by, freeze_reason, amount_secured, status, frozen_at
            ) VALUES (?, ?, ?, ?, ?, 'ACTIVE_BLOCK', ?)
        """, (row["orig_account"], transaction_id, analyst, notes or "Account frozen via triage queue", row["amount"], now))

    # If action is False Positive, record in false_positives
    if new_status == "FALSE_POSITIVE":
        cursor.execute("""
            INSERT INTO false_positives (
                transaction_id, orig_account, marked_by, justification, model_version, marked_at
            ) VALUES (?, ?, ?, ?, 'XGBoost v2.4', ?)
        """, (transaction_id, row["orig_account"], analyst, notes or "Marked as False Positive by analyst", now))

    conn.commit()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    updated_row = dict(cursor.fetchone())
    conn.close()
    return updated_row

def assign_case_analyst(transaction_id: str, analyst_name: str, notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE transactions
        SET assigned_analyst = ?, updated_at = ?
        WHERE id = ?
    """, (analyst_name, now, transaction_id))

    cursor.execute("""
        UPDATE cases
        SET assigned_analyst = ?, updated_at = ?
        WHERE transaction_id = ?
    """, (analyst_name, now, transaction_id))

    cursor.execute("""
        INSERT INTO audit_logs (
            transaction_id, action, previous_status, new_status, analyst, notes, timestamp
        ) VALUES (?, 'REASSIGN_ANALYST', NULL, 'ASSIGNED', ?, ?, ?)
    """, (transaction_id, analyst_name, notes or f"Case assigned to {analyst_name}", now))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_case_priority(transaction_id: str, priority: str, analyst: str = "Risk Analyst II", notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE transactions
        SET priority = ?, updated_at = ?
        WHERE id = ?
    """, (priority.upper(), now, transaction_id))

    cursor.execute("""
        UPDATE cases
        SET priority = ?, updated_at = ?
        WHERE transaction_id = ?
    """, (priority.upper(), now, transaction_id))

    cursor.execute("""
        INSERT INTO audit_logs (
            transaction_id, action, previous_status, new_status, analyst, notes, timestamp
        ) VALUES (?, 'UPDATE_PRIORITY', NULL, ?, ?, ?, ?)
    """, (transaction_id, priority.upper(), analyst, notes or f"Priority updated to {priority.upper()}", now))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_case_note(transaction_id: str, note: str, analyst: str = "Risk Analyst II") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT analyst_notes FROM transactions WHERE id = ?", (transaction_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    existing_notes = row["analyst_notes"] or ""
    new_notes = f"{existing_notes}\n[{now} - {analyst}]: {note}".strip()

    cursor.execute("""
        UPDATE transactions
        SET analyst_notes = ?, updated_at = ?
        WHERE id = ?
    """, (new_notes, now, transaction_id))

    cursor.execute("""
        UPDATE cases
        SET case_notes = ?, updated_at = ?
        WHERE transaction_id = ?
    """, (new_notes, now, transaction_id))

    cursor.execute("""
        INSERT INTO audit_logs (
            transaction_id, action, previous_status, new_status, analyst, notes, timestamp
        ) VALUES (?, 'ADD_NOTE', NULL, 'NOTE_ADDED', ?, ?, ?)
    """, (transaction_id, analyst, note, now))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    updated = cursor.fetchone()
    conn.close()
    return dict(updated) if updated else None

def escalate_case(transaction_id: str, escalation_tier: str = "TIER_3", analyst: str = "Risk Analyst II", notes: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE transactions
        SET escalation_level = ?, status = 'UNDER_REVIEW', updated_at = ?
        WHERE id = ?
    """, (escalation_tier, now, transaction_id))

    cursor.execute("""
        UPDATE cases
        SET escalation_level = ?, status = 'ESCALATED', updated_at = ?
        WHERE transaction_id = ?
    """, (escalation_tier, now, transaction_id))

    cursor.execute("""
        INSERT INTO audit_logs (
            transaction_id, action, previous_status, new_status, analyst, notes, timestamp
        ) VALUES (?, 'ESCALATE_CASE', 'UNDER_REVIEW', ?, ?, ?, ?)
    """, (transaction_id, escalation_tier, analyst, notes or f"Case escalated to {escalation_tier}", now))

    # Add high priority alert
    cursor.execute("""
        INSERT INTO alerts (
            transaction_id, alert_type, severity, title, description, acknowledged, created_at
        ) VALUES (?, 'CASE_ESCALATED', 'CRITICAL', ?, ?, 0, ?)
    """, (
        transaction_id,
        f"Case Escalated to {escalation_tier}: {transaction_id}",
        notes or f"Case escalated by {analyst} for senior review.",
        now
    ))

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# ==============================================================================
# QUERY FUNCTIONS
# ==============================================================================

def get_transactions_by_status(
    statuses: List[str],
    limit: int = 100,
    search: Optional[str] = None,
    risk: Optional[str] = None,
    tx_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    placeholders = ",".join(["?"] * len(statuses))
    query = f"SELECT * FROM transactions WHERE status IN ({placeholders})"
    params: List[Any] = list(statuses)

    if search:
        query += " AND (id LIKE ? OR orig_account LIKE ? OR dest_account LIKE ? OR top_reason LIKE ? OR assigned_analyst LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term, term])

    if risk and risk.upper() != "ALL":
        query += " AND UPPER(risk_level) = ?"
        params.append(risk.upper())

    if tx_type and tx_type.upper() != "ALL":
        query += " AND UPPER(type) = ?"
        params.append(tx_type.upper())

    query += " ORDER BY risk_score DESC, fraud_probability DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_transaction_by_id(transaction_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (transaction_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_audit_logs(transaction_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE transaction_id = ? ORDER BY id DESC", (transaction_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_all_alerts(acknowledged: Optional[int] = None, severity: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alerts WHERE 1=1"
    params: List[Any] = []

    if acknowledged is not None:
        query += " AND acknowledged = ?"
        params.append(acknowledged)
    if severity and severity.upper() != "ALL":
        query += " AND UPPER(severity) = ?"
        params.append(severity.upper())

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def acknowledge_alert(alert_id: int, analyst: str = "Risk Analyst II") -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        UPDATE alerts
        SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
        WHERE id = ?
    """, (analyst, now, alert_id))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def get_dashboard_stats() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status IN ('PENDING', 'UNDER_REVIEW')")
    active_queue_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'FROZEN'")
    frozen_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'RESOLVED'")
    resolved_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'FALSE_POSITIVE'")
    fp_count = cursor.fetchone()[0]

    cursor.execute("SELECT COALESCE(SUM(expected_loss), 0) FROM transactions WHERE status IN ('PENDING', 'UNDER_REVIEW', 'FROZEN')")
    total_loss_exposure = cursor.fetchone()[0]

    cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'FROZEN'")
    prevented_loss = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM alerts WHERE acknowledged = 0")
    unacknowledged_alerts = cursor.fetchone()[0]

    conn.close()

    return {
        "active_queue_count": active_queue_count,
        "frozen_count": frozen_count,
        "resolved_count": resolved_count,
        "false_positive_count": fp_count,
        "total_loss_exposure": round(total_loss_exposure, 2),
        "prevented_loss": round(prevented_loss, 2),
        "unacknowledged_alerts": unacknowledged_alerts
    }

def export_transactions_csv(status: str = "ALL") -> str:
    """
    Generates a CSV string representation of transaction data for regulatory or compliance audit export.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if status.upper() == "ALL":
        cursor.execute("SELECT * FROM transactions ORDER BY created_at DESC")
    elif status.upper() == "ACTIVE":
        cursor.execute("SELECT * FROM transactions WHERE status IN ('PENDING', 'UNDER_REVIEW') ORDER BY risk_score DESC")
    else:
        cursor.execute("SELECT * FROM transactions WHERE UPPER(status) = ? ORDER BY updated_at DESC", (status.upper(),))

    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return "id,step,type,amount,orig_account,dest_account,prediction,fraud_probability,expected_loss,risk_score,risk_level,status\n"

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([key for key in rows[0].keys()])
    for row in rows:
        writer.writerow([row[k] for k in row.keys()])

    return output.getvalue()
