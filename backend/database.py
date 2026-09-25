"""
Database Persistence & Triage Lifecycle Management Engine
SQLite Schema with Case Management, Alerting, Audit Trail, Recipient Reputation, and Behavioral Intelligence
"""
import sqlite3
import os
import json
import csv
import io
from datetime import datetime
from typing import Dict, List, Optional, Any

from risk_engine import RiskScoringEngine
from recipient_reputation import RecipientReputationManager

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fraud_triage.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

reputation_mgr = RecipientReputationManager(get_connection)

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Transactions Table (Upgraded with Behavioral Dimensions)
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
            transactions_last_hour INTEGER DEFAULT 1,
            transactions_last_day INTEGER DEFAULT 1,
            total_amount_last_hour REAL DEFAULT 0.0,
            total_amount_last_day REAL DEFAULT 0.0,
            unique_recipients_last_hour INTEGER DEFAULT 1,
            unique_recipients_last_day INTEGER DEFAULT 1,
            velocity_score REAL DEFAULT 0.0,
            structuring_score REAL DEFAULT 0.0,
            recipient_risk_score REAL DEFAULT 0.0,
            behavioral_risk_score REAL DEFAULT 0.0,
            final_risk_score INTEGER DEFAULT 50,
            fraud_category TEXT DEFAULT 'TRADITIONAL',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # Check and add any missing columns in existing SQLite database
    cursor.execute("PRAGMA table_info(transactions)")
    existing_cols = {row["name"] for row in cursor.fetchall()}
    
    missing_cols = {
        "transactions_last_hour": "INTEGER DEFAULT 1",
        "transactions_last_day": "INTEGER DEFAULT 1",
        "total_amount_last_hour": "REAL DEFAULT 0.0",
        "total_amount_last_day": "REAL DEFAULT 0.0",
        "unique_recipients_last_hour": "INTEGER DEFAULT 1",
        "unique_recipients_last_day": "INTEGER DEFAULT 1",
        "velocity_score": "REAL DEFAULT 0.0",
        "structuring_score": "REAL DEFAULT 0.0",
        "recipient_risk_score": "REAL DEFAULT 0.0",
        "behavioral_risk_score": "REAL DEFAULT 0.0",
        "final_risk_score": "INTEGER DEFAULT 50",
        "fraud_category": "TEXT DEFAULT 'TRADITIONAL'"
    }

    for col, col_type in missing_cols.items():
        if col not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE transactions ADD COLUMN {col} {col_type}")
            except Exception as e:
                pass

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
            model_version TEXT NOT NULL DEFAULT 'XGBoost v2.4-Behavioral',
            marked_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id)
        )
    """)

    # 7. Recipient Reputation Table
    reputation_mgr.init_schema(conn)

    conn.commit()

    # Seed initial transactions & reputation database
    cursor.execute("SELECT COUNT(*) FROM transactions")
    count = cursor.fetchone()[0]
    if count == 0 or count < 10:
        seed_initial_data(cursor)
        conn.commit()

    seed_initial_reputations(cursor)
    conn.commit()

    conn.close()

def seed_initial_reputations(cursor):
    """Seeds recipient reputation database with high-risk mule accounts and clean merchants."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    reps = [
        ("M928371029", "Offshore Wire Beneficiary Ltd", "MERCHANT", 3, 4, 2, 1, 96.0, "CRITICAL_FRAUD", "Account frozen due to confirmed mule network linkage", "Mule Account,Frozen,Shell Entity", now, now),
        ("C994821049", "David R. Mule Holder", "INDIVIDUAL", 2, 3, 1, 0, 88.0, "HIGH_RISK", "Multiple rapid inbound disbursements from drained sender accounts", "Dispersal Mule,High Velocity Inflow", now, now),
        ("C112233445", "QuickPay Virtual Wallet #41", "INDIVIDUAL", 1, 2, 1, 1, 92.0, "CRITICAL_FRAUD", "Pre-identified crypto on-ramp laundering endpoint", "Crypto Ramp,Frozen", now, now),
        ("M556677889", "Apex Gaming Global Services", "MERCHANT", 1, 1, 0, 0, 72.0, "HIGH_RISK", "High volume micro-structuring aggregation endpoint", "Structuring Endpoint,Gaming", now, now),
        ("C778899001", "Alex Chen (Unverified Tier 1)", "INDIVIDUAL", 1, 2, 0, 0, 68.0, "HIGH_RISK", "Linked to multi-sender burst dispersal campaign", "Fan-Out Target", now, now),
        ("M182165910", "Amazon Web Services Inc", "MERCHANT", 0, 0, 0, 0, 2.0, "CLEAN", None, "Enterprise Merchant,Tier 1 Verified", now, now),
        ("M348934600", "Apple Services Store", "MERCHANT", 0, 0, 0, 0, 1.5, "CLEAN", None, "Tier 1 Merchant", now, now),
        ("M667788990", "Stripe Corporate Gateway", "MERCHANT", 0, 0, 0, 0, 3.0, "CLEAN", None, "Verified Payment Facilitator", now, now)
    ]

    for r in reps:
        cursor.execute("""
            INSERT OR REPLACE INTO recipient_reputation 
            (account_id, account_holder, account_type, confirmed_fraud_count, high_risk_cases_count, escalated_cases_count, is_frozen, reputation_score, risk_level, warning_message, tags, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, r)

def seed_initial_data(cursor):
    """Seeds initial transaction queue with all 4 fraud typologies + clean records."""
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    
    initial_txs = [
        # 1. Traditional Account Liquidation
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
            "analyst_notes": "Initial alert: Account drained to $0.00 via offshore wire.",
            "escalation_level": "TIER_2",
            "transactions_last_hour": 1,
            "transactions_last_day": 1,
            "total_amount_last_hour": 850000.00,
            "total_amount_last_day": 850000.00,
            "unique_recipients_last_hour": 1,
            "unique_recipients_last_day": 1,
            "velocity_score": 35.0,
            "structuring_score": 10.0,
            "recipient_risk_score": 96.0,
            "behavioral_risk_score": 52.0,
            "final_risk_score": 98,
            "fraud_category": "TRADITIONAL",
            "created_at": now,
            "updated_at": now
        },
        # 2. Velocity Burst Attack (25 tx in 30 mins)
        {
            "id": "TX-VEL-8491",
            "step": 302,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 48500.00,
            "orig_account": "C583920194",
            "dest_account": "C994821049",
            "oldbalance_org": 240000.00,
            "newbalance_orig": 191500.00,
            "oldbalance_dest": 1200.00,
            "newbalance_dest": 49700.00,
            "balance_diff_orig": 48500.00,
            "balance_diff_dest": 48500.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.9480,
            "expected_loss": 45978.00,
            "risk_score": 95,
            "risk_level": "Critical",
            "top_reason": "High Transaction Velocity: 25 rapid transfers within 30 minutes",
            "status": "PENDING",
            "priority": "CRITICAL",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "Extreme transaction burst velocity detected by behavioral telemetry.",
            "escalation_level": "TIER_2",
            "transactions_last_hour": 25,
            "transactions_last_day": 28,
            "total_amount_last_hour": 340000.00,
            "total_amount_last_day": 365000.00,
            "unique_recipients_last_hour": 4,
            "unique_recipients_last_day": 6,
            "velocity_score": 96.0,
            "structuring_score": 48.0,
            "recipient_risk_score": 88.0,
            "behavioral_risk_score": 86.5,
            "final_risk_score": 95,
            "fraud_category": "VELOCITY",
            "created_at": now,
            "updated_at": now
        },
        # 3. Structuring / Smurfing Pattern (Multiple Sub-Threshold Wire Transfers)
        {
            "id": "TX-STR-4921",
            "step": 301,
            "type": "CASH_OUT",
            "type_code": 1,
            "amount": 1400.00,
            "orig_account": "C392817295",
            "dest_account": "M556677889",
            "oldbalance_org": 6000.00,
            "newbalance_orig": 4600.00,
            "oldbalance_dest": 8400.00,
            "newbalance_dest": 9800.00,
            "balance_diff_orig": 1400.00,
            "balance_diff_dest": 1400.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.8920,
            "expected_loss": 1248.80,
            "risk_score": 91,
            "risk_level": "Critical",
            "top_reason": "Structuring Pattern Detected: 6x micro-transfers (₹900-₹1500) aggregating to ₹6,000",
            "status": "PENDING",
            "priority": "CRITICAL",
            "assigned_analyst": "Elena Rostova",
            "analyst_notes": "Smurfing behavior detected just below mandatory SAR compliance reporting threshold.",
            "escalation_level": "TIER_1",
            "transactions_last_hour": 6,
            "transactions_last_day": 8,
            "total_amount_last_hour": 6000.00,
            "total_amount_last_day": 7800.00,
            "unique_recipients_last_hour": 1,
            "unique_recipients_last_day": 2,
            "velocity_score": 62.0,
            "structuring_score": 94.0,
            "recipient_risk_score": 72.0,
            "behavioral_risk_score": 88.0,
            "final_risk_score": 91,
            "fraud_category": "STRUCTURING",
            "created_at": now,
            "updated_at": now
        },
        # 4. Recipient Burst / Fan-Out Dispersal
        {
            "id": "TX-REC-7712",
            "step": 300,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 35000.00,
            "orig_account": "C774411223",
            "dest_account": "C778899001",
            "oldbalance_org": 280000.00,
            "newbalance_orig": 245000.00,
            "oldbalance_dest": 500.00,
            "newbalance_dest": 35500.00,
            "balance_diff_orig": 35000.00,
            "balance_diff_dest": 35000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.8840,
            "expected_loss": 30940.00,
            "risk_score": 89,
            "risk_level": "Critical",
            "top_reason": "Recipient Burst Fan-Out: 1 sender transferring to 8 distinct unverified accounts",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_analyst": "Sarah Lin (Lead FCU)",
            "analyst_notes": "Money mule recruitment & fund dispersal campaign detected.",
            "escalation_level": "TIER_1",
            "transactions_last_hour": 8,
            "transactions_last_day": 10,
            "total_amount_last_hour": 180000.00,
            "total_amount_last_day": 215000.00,
            "unique_recipients_last_hour": 8,
            "unique_recipients_last_day": 10,
            "velocity_score": 68.0,
            "structuring_score": 42.0,
            "recipient_burst_score": 95.0,
            "recipient_risk_score": 85.0,
            "behavioral_risk_score": 84.0,
            "final_risk_score": 89,
            "fraud_category": "RECIPIENT_RISK",
            "created_at": now,
            "updated_at": now
        },
        # 5. Traditional High-Value Cash-Out
        {
            "id": "TX-948268",
            "step": 300,
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
            "transactions_last_hour": 2,
            "transactions_last_day": 3,
            "total_amount_last_hour": 420000.00,
            "total_amount_last_day": 435000.00,
            "unique_recipients_last_hour": 1,
            "unique_recipients_last_day": 2,
            "velocity_score": 45.0,
            "structuring_score": 15.0,
            "recipient_risk_score": 40.0,
            "behavioral_risk_score": 38.0,
            "final_risk_score": 92,
            "fraud_category": "TRADITIONAL",
            "created_at": now,
            "updated_at": now
        },
        # 6. Structuring Runner
        {
            "id": "TX-STR-4922",
            "step": 298,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 4800.00,
            "orig_account": "C284910294",
            "dest_account": "C112233445",
            "oldbalance_org": 25000.00,
            "newbalance_orig": 20200.00,
            "oldbalance_dest": 0.00,
            "newbalance_dest": 4800.00,
            "balance_diff_orig": 4800.00,
            "balance_diff_dest": 4800.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.8650,
            "expected_loss": 4152.00,
            "risk_score": 86,
            "risk_level": "Critical",
            "top_reason": "Structuring Smurfing: 5th sub-5k wire sent to blacklisted crypto mule",
            "status": "UNDER_REVIEW",
            "priority": "HIGH",
            "assigned_analyst": "Elena Rostova",
            "analyst_notes": "Pattern matches high-risk laundering playbook.",
            "escalation_level": "TIER_2",
            "transactions_last_hour": 5,
            "transactions_last_day": 7,
            "total_amount_last_hour": 24000.00,
            "total_amount_last_day": 32000.00,
            "unique_recipients_last_hour": 1,
            "unique_recipients_last_day": 2,
            "velocity_score": 58.0,
            "structuring_score": 91.0,
            "recipient_risk_score": 92.0,
            "behavioral_risk_score": 85.0,
            "final_risk_score": 86,
            "fraud_category": "STRUCTURING",
            "created_at": now,
            "updated_at": now
        },
        # 7. Velocity Spike
        {
            "id": "TX-VEL-8492",
            "step": 295,
            "type": "CASH_OUT",
            "type_code": 1,
            "amount": 18000.00,
            "orig_account": "C102938475",
            "dest_account": "M847291049",
            "oldbalance_org": 90000.00,
            "newbalance_orig": 72000.00,
            "oldbalance_dest": 0.00,
            "newbalance_dest": 18000.00,
            "balance_diff_orig": 18000.00,
            "balance_diff_dest": 18000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "FRAUD",
            "fraud_probability": 0.8120,
            "expected_loss": 14616.00,
            "risk_score": 78,
            "risk_level": "High",
            "top_reason": "Velocity surge: 14 withdrawals in 45 minutes",
            "status": "PENDING",
            "priority": "HIGH",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "Card skimming clone suspected.",
            "escalation_level": "TIER_1",
            "transactions_last_hour": 14,
            "transactions_last_day": 16,
            "total_amount_last_hour": 125000.00,
            "total_amount_last_day": 140000.00,
            "unique_recipients_last_hour": 2,
            "unique_recipients_last_day": 3,
            "velocity_score": 88.0,
            "structuring_score": 38.0,
            "recipient_risk_score": 45.0,
            "behavioral_risk_score": 72.0,
            "final_risk_score": 78,
            "fraud_category": "VELOCITY",
            "created_at": now,
            "updated_at": now
        },
        # 8. Frozen Case (Confirmed Mule)
        {
            "id": "TX-948150",
            "step": 280,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 620000.00,
            "orig_account": "C998877665",
            "dest_account": "M928371029",
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
            "transactions_last_hour": 1,
            "transactions_last_day": 1,
            "total_amount_last_hour": 620000.00,
            "total_amount_last_day": 620000.00,
            "unique_recipients_last_hour": 1,
            "unique_recipients_last_day": 1,
            "velocity_score": 30.0,
            "structuring_score": 10.0,
            "recipient_risk_score": 96.0,
            "behavioral_risk_score": 45.0,
            "final_risk_score": 99,
            "fraud_category": "TRADITIONAL",
            "created_at": now,
            "updated_at": now
        },
        # 9. Resolved Legitimate Case
        {
            "id": "TX-948110",
            "step": 275,
            "type": "TRANSFER",
            "type_code": 4,
            "amount": 95000.00,
            "orig_account": "C445566778",
            "dest_account": "M182165910",
            "oldbalance_org": 100000.00,
            "newbalance_orig": 5000.00,
            "oldbalance_dest": 2000.00,
            "newbalance_dest": 97000.00,
            "balance_diff_orig": 95000.00,
            "balance_diff_dest": 95000.00,
            "origin_account_emptied": 0,
            "large_transaction": 0,
            "prediction": "LEGIT",
            "fraud_probability": 0.0820,
            "expected_loss": 7790.00,
            "risk_score": 24,
            "risk_level": "Low",
            "top_reason": "Verified corporate escrow supplier wire",
            "status": "RESOLVED",
            "priority": "LOW",
            "assigned_analyst": "Marcus Vance",
            "analyst_notes": "Customer verified wire via voice challenge. Case resolved.",
            "escalation_level": "TIER_1",
            "transactions_last_hour": 1,
            "transactions_last_day": 2,
            "total_amount_last_hour": 95000.00,
            "total_amount_last_day": 105000.00,
            "unique_recipients_last_hour": 1,
            "unique_recipients_last_day": 2,
            "velocity_score": 15.0,
            "structuring_score": 5.0,
            "recipient_risk_score": 2.0,
            "behavioral_risk_score": 12.0,
            "final_risk_score": 24,
            "fraud_category": "NORMAL",
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
                prediction, fraud_probability, expected_loss, risk_score, risk_level,
                top_reason, status, priority, assigned_analyst, analyst_notes, escalation_level,
                transactions_last_hour, transactions_last_day, total_amount_last_hour, total_amount_last_day,
                unique_recipients_last_hour, unique_recipients_last_day, velocity_score, structuring_score,
                recipient_risk_score, behavioral_risk_score, final_risk_score, fraud_category,
                created_at, updated_at
            ) VALUES (
                :id, :step, :type, :type_code, :amount, :orig_account, :dest_account,
                :oldbalance_org, :newbalance_orig, :oldbalance_dest, :newbalance_dest,
                :balance_diff_orig, :balance_diff_dest, :origin_account_emptied, :large_transaction,
                :prediction, :fraud_probability, :expected_loss, :risk_score, :risk_level,
                :top_reason, :status, :priority, :assigned_analyst, :analyst_notes, :escalation_level,
                :transactions_last_hour, :transactions_last_day, :total_amount_last_hour, :total_amount_last_day,
                :unique_recipients_last_hour, :unique_recipients_last_day, :velocity_score, :structuring_score,
                :recipient_risk_score, :behavioral_risk_score, :final_risk_score, :fraud_category,
                :created_at, :updated_at
            )
        """, tx)

        # Initial Case
        cursor.execute("""
            INSERT OR REPLACE INTO cases (
                case_id, transaction_id, status, priority, assigned_analyst, escalation_level, case_notes, created_at, updated_at
            ) VALUES (
                ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?
            )
        """, (f"CASE-{tx['id']}", tx['id'], tx['priority'], tx['assigned_analyst'], tx['escalation_level'], tx['analyst_notes'], now, now))

        # Initial Alert if High/Critical
        if tx["risk_level"] in ["Critical", "High"]:
            cursor.execute("""
                INSERT INTO alerts (transaction_id, alert_type, severity, title, description, created_at)
                VALUES (?, 'ANOMALY_TRIGGER', ?, ?, ?, ?)
            """, (tx['id'], tx['priority'], f"Anomaly: {tx['top_reason']}", f"Transaction {tx['id']} flagged with risk score {tx['final_risk_score']}/100", now))

def get_transactions_by_status(
    statuses: List[str],
    category: Optional[str] = None,
    limit: int = 100,
    search: Optional[str] = None,
    risk: Optional[str] = None,
    tx_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Fetches transactions filtered by lifecycle status, fraud category, risk, and search term."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM transactions WHERE status IN ({})".format(
        ",".join(["?"] * len(statuses))
    )
    params = list(statuses)

    if category and category.upper() != "ALL":
        query += " AND fraud_category = ?"
        params.append(category.upper())

    if search:
        query += " AND (id LIKE ? OR orig_account LIKE ? OR dest_account LIKE ? OR top_reason LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if risk and risk != "ALL":
        query += " AND risk_level = ?"
        params.append(risk)

    if tx_type and tx_type != "ALL":
        query += " AND type = ?"
        params.append(tx_type)

    query += " ORDER BY final_risk_score DESC, created_at DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]

def get_transaction_by_id(tx_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_audit_logs(tx_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE transaction_id = ? ORDER BY timestamp DESC", (tx_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_all_alerts(acknowledged: Optional[int] = None, severity: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []
    if acknowledged is not None:
        query += " AND acknowledged = ?"
        params.append(acknowledged)
    if severity and severity != "ALL":
        query += " AND severity = ?"
        params.append(severity)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def acknowledge_alert(alert_id: int, analyst: str = "Risk Analyst II") -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        UPDATE alerts 
        SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?
        WHERE id = ?
    """, (analyst, now, alert_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def update_transaction_status(tx_id: str, new_status: str, analyst: str = "Risk Analyst II", notes: str = "", justification: str = "") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    tx = dict(row)
    prev_status = tx["status"]
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("UPDATE transactions SET status = ?, updated_at = ? WHERE id = ?", (new_status, now, tx_id))
    cursor.execute("UPDATE cases SET status = ?, updated_at = ? WHERE transaction_id = ?", (new_status, now, tx_id))

    cursor.execute("""
        INSERT INTO audit_logs (transaction_id, action, previous_status, new_status, analyst, notes, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (tx_id, f"STATUS_CHANGE_TO_{new_status}", prev_status, new_status, analyst, notes or f"Status updated to {new_status}", now))

    if new_status == "FROZEN":
        cursor.execute("""
            INSERT INTO frozen_accounts (account_id, transaction_id, frozen_by, freeze_reason, amount_secured, frozen_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (tx["orig_account"], tx_id, analyst, notes or "Frozen by analyst action", tx["amount"], now))
        # Update recipient reputation
        reputation_mgr.update_reputation_on_case_action(tx["dest_account"], "FREEZE", notes)

    elif new_status == "FALSE_POSITIVE":
        cursor.execute("""
            INSERT INTO false_positives (transaction_id, orig_account, marked_by, justification, marked_at)
            VALUES (?, ?, ?, ?, ?)
        """, (tx_id, tx["orig_account"], analyst, justification or notes or "Cleared as false alarm", now))
        reputation_mgr.update_reputation_on_case_action(tx["dest_account"], "FALSE_POSITIVE", notes)

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

def assign_case_analyst(tx_id: str, analyst_name: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE transactions SET assigned_analyst = ?, updated_at = ? WHERE id = ?", (analyst_name, now, tx_id))
    cursor.execute("UPDATE cases SET assigned_analyst = ?, updated_at = ? WHERE transaction_id = ?", (analyst_name, now, tx_id))
    cursor.execute("""
        INSERT INTO audit_logs (transaction_id, action, previous_status, new_status, analyst, notes, timestamp)
        VALUES (?, 'ASSIGN_ANALYST', NULL, 'ASSIGNED', ?, ?, ?)
    """, (tx_id, analyst_name, f"Assigned to {analyst_name}", now))
    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

def update_case_priority(tx_id: str, priority: str, analyst: str = "Risk Analyst II", notes: str = "") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE transactions SET priority = ?, updated_at = ? WHERE id = ?", (priority, now, tx_id))
    cursor.execute("UPDATE cases SET priority = ?, updated_at = ? WHERE transaction_id = ?", (priority, now, tx_id))
    cursor.execute("""
        INSERT INTO audit_logs (transaction_id, action, previous_status, new_status, analyst, notes, timestamp)
        VALUES (?, 'UPDATE_PRIORITY', NULL, ?, ?, ?, ?)
    """, (tx_id, priority, analyst, notes or f"Priority changed to {priority}", now))
    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

def add_case_note(tx_id: str, note_text: str, analyst: str = "Risk Analyst II") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("SELECT analyst_notes FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    curr_notes = row[0] or ""
    new_notes = f"{curr_notes}\n[{now}] {analyst}: {note_text}".strip()
    cursor.execute("UPDATE transactions SET analyst_notes = ?, updated_at = ? WHERE id = ?", (new_notes, now, tx_id))
    cursor.execute("UPDATE cases SET case_notes = ?, updated_at = ? WHERE transaction_id = ?", (new_notes, now, tx_id))
    cursor.execute("""
        INSERT INTO audit_logs (transaction_id, action, previous_status, new_status, analyst, notes, timestamp)
        VALUES (?, 'ADD_NOTE', NULL, 'NOTE_ADDED', ?, ?, ?)
    """, (tx_id, analyst, note_text, now))
    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

def escalate_case(tx_id: str, escalation_tier: str, analyst: str = "Risk Analyst II", notes: str = "") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE transactions SET escalation_level = ?, priority = 'CRITICAL', updated_at = ? WHERE id = ?", (escalation_tier, now, tx_id))
    cursor.execute("UPDATE cases SET escalation_level = ?, priority = 'CRITICAL', updated_at = ? WHERE transaction_id = ?", (escalation_tier, now, tx_id))
    cursor.execute("""
        INSERT INTO audit_logs (transaction_id, action, previous_status, new_status, analyst, notes, timestamp)
        VALUES (?, 'ESCALATE_TIER', NULL, ?, ?, ?, ?)
    """, (tx_id, escalation_tier, analyst, notes or f"Case escalated to {escalation_tier}", now))
    
    # Update recipient reputation on escalation
    cursor.execute("SELECT dest_account FROM transactions WHERE id = ?", (tx_id,))
    dest_row = cursor.fetchone()
    if dest_row:
        reputation_mgr.update_reputation_on_case_action(dest_row[0], "ESCALATE", notes)

    conn.commit()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    updated = dict(cursor.fetchone())
    conn.close()
    return updated

def export_transactions_csv(status: str = "ALL") -> str:
    conn = get_connection()
    cursor = conn.cursor()
    if status == "ALL":
        cursor.execute("SELECT * FROM transactions ORDER BY created_at DESC")
    else:
        cursor.execute("SELECT * FROM transactions WHERE status = ? ORDER BY created_at DESC", (status,))
    rows = cursor.fetchall()
    conn.close()
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        for row in rows:
            writer.writerow(dict(row))
    return output.getvalue()

def get_dashboard_stats() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status IN ('PENDING', 'UNDER_REVIEW')")
    active_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'FROZEN'")
    frozen_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'RESOLVED'")
    resolved_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'FALSE_POSITIVE'")
    fp_count = cursor.fetchone()[0]
    cursor.execute("SELECT COALESCE(SUM(expected_loss), 0.0) FROM transactions WHERE status IN ('PENDING', 'UNDER_REVIEW')")
    total_loss_exposure = cursor.fetchone()[0]
    cursor.execute("SELECT COALESCE(SUM(amount_secured), 0.0) FROM frozen_accounts")
    prevented_loss = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE acknowledged = 0")
    unack_alerts = cursor.fetchone()[0]

    # Category breakdowns
    cursor.execute("SELECT fraud_category, COUNT(*) FROM transactions GROUP BY fraud_category")
    cat_counts = dict(cursor.fetchall())

    conn.close()
    return {
        "active_queue_count": active_count,
        "frozen_count": frozen_count,
        "resolved_count": resolved_count,
        "false_positive_count": fp_count,
        "total_loss_exposure": total_loss_exposure,
        "prevented_loss": prevented_loss,
        "unacknowledged_alerts": unack_alerts,
        "category_counts": {
            "VELOCITY": cat_counts.get("VELOCITY", 4),
            "STRUCTURING": cat_counts.get("STRUCTURING", 3),
            "RECIPIENT_RISK": cat_counts.get("RECIPIENT_RISK", 3),
            "TRADITIONAL": cat_counts.get("TRADITIONAL", 5),
            "NORMAL": cat_counts.get("NORMAL", 1)
        }
    }
