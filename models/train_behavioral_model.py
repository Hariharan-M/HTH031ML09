"""
Model Retraining Pipeline - Behavioral & Multi-Factor XGBoost Fraud Classifier
Trains on PaySim transaction dynamics augmented with 12 temporal, velocity, structuring, and reputation features.
"""
import os
import sys
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, average_precision_score
from sklearn.model_selection import train_test_split

def generate_behavioral_dataset(n_samples: int = 150000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates synthetic PaySim distribution augmented with realistic behavioral fraud typologies:
    1. Velocity bursts (20-30 tx/hr, rapid liquidation)
    2. Structuring / Smurfing (sub-threshold uniform amounts e.g., 5-8 tx of ~1,000-4,900)
    3. Recipient Burst / Fan-Out (1 sender to 6-12 distinct recipient accounts)
    4. Recipient Reputation Risk (prior flagged mule accounts)
    5. Traditional Wire Drain & Liquidation (large TRANSFER/CASH_OUT emptying account)
    6. Legitimate Baseline (Payment, Debit, Cash-In, standard single transfer)
    """
    np.random.seed(random_state)
    
    # 1. Base transaction features
    steps = np.random.randint(1, 744, size=n_samples)
    # Types: 0: CASH_IN, 1: CASH_OUT, 2: DEBIT, 3: PAYMENT, 4: TRANSFER
    types = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.22, 0.35, 0.05, 0.28, 0.10])
    
    # Amounts (log-normal base)
    amounts = np.random.exponential(scale=25000, size=n_samples) + 50
    oldbalance_org = np.random.exponential(scale=80000, size=n_samples) + amounts
    newbalance_orig = np.maximum(0, oldbalance_org - amounts * np.random.uniform(0.9, 1.0, size=n_samples))
    
    oldbalance_dest = np.random.exponential(scale=50000, size=n_samples)
    newbalance_dest = oldbalance_dest + amounts * np.random.uniform(0.9, 1.0, size=n_samples)

    # Initial behavioral baseline (mostly 1 tx/hr, 1-3 tx/day)
    tx_last_hour = np.random.choice([1, 2, 3], size=n_samples, p=[0.85, 0.12, 0.03])
    tx_last_day = tx_last_hour + np.random.randint(0, 4, size=n_samples)
    
    total_amount_hour = amounts * tx_last_hour * np.random.uniform(0.9, 1.1, size=n_samples)
    total_amount_day = total_amount_hour + np.random.exponential(scale=10000, size=n_samples)
    
    unique_dest_hour = np.minimum(tx_last_hour, np.random.choice([1, 2], size=n_samples, p=[0.90, 0.10]))
    unique_dest_day = np.minimum(tx_last_day, unique_dest_hour + np.random.randint(0, 3, size=n_samples))
    
    avg_amount_hour = total_amount_hour / tx_last_hour
    avg_amount_day = total_amount_day / tx_last_day

    velocity_score = np.random.uniform(0, 25, size=n_samples)
    structuring_score = np.random.uniform(0, 20, size=n_samples)
    recipient_burst_score = np.random.uniform(0, 15, size=n_samples)
    recipient_reputation_score = np.random.choice([0.0, 5.0, 10.0, 20.0], size=n_samples, p=[0.70, 0.20, 0.08, 0.02])

    is_fraud = np.zeros(n_samples, dtype=int)

    # Inject Fraud Typologies (~2.5% of dataset to provide dense learning signals)
    n_fraud = int(n_samples * 0.028)
    fraud_indices = np.random.choice(n_samples, size=n_fraud, replace=False)

    for i in fraud_indices:
        typology = np.random.choice(["TRADITIONAL_DRAIN", "VELOCITY_BURST", "STRUCTURING_SMURF", "RECIPIENT_FANOUT", "REPUTATION_MULE"], p=[0.30, 0.25, 0.20, 0.15, 0.10])
        is_fraud[i] = 1
        
        if typology == "TRADITIONAL_DRAIN":
            types[i] = np.random.choice([1, 4])  # CASH_OUT or TRANSFER
            amounts[i] = np.random.uniform(80000, 800000)
            oldbalance_org[i] = amounts[i]
            newbalance_orig[i] = 0.0  # complete liquidation
            oldbalance_dest[i] = 0.0
            newbalance_dest[i] = amounts[i]
            tx_last_hour[i] = 1
            tx_last_day[i] = 1
            total_amount_hour[i] = amounts[i]
            total_amount_day[i] = amounts[i]
            unique_dest_hour[i] = 1
            unique_dest_day[i] = 1
            avg_amount_hour[i] = amounts[i]
            avg_amount_day[i] = amounts[i]
            velocity_score[i] = np.random.uniform(20, 45)
            structuring_score[i] = np.random.uniform(5, 20)
            recipient_burst_score[i] = 0.0
            recipient_reputation_score[i] = np.random.uniform(10, 40)

        elif typology == "VELOCITY_BURST":
            types[i] = np.random.choice([1, 4])
            tx_last_hour[i] = np.random.randint(12, 30)
            tx_last_day[i] = tx_last_hour[i] + np.random.randint(5, 20)
            amounts[i] = np.random.uniform(15000, 60000)
            total_amount_hour[i] = amounts[i] * tx_last_hour[i] * np.random.uniform(0.85, 1.0)
            total_amount_day[i] = total_amount_hour[i] * np.random.uniform(1.1, 1.4)
            unique_dest_hour[i] = np.random.randint(2, 6)
            unique_dest_day[i] = unique_dest_hour[i] + np.random.randint(2, 8)
            avg_amount_hour[i] = total_amount_hour[i] / tx_last_hour[i]
            avg_amount_day[i] = total_amount_day[i] / tx_last_day[i]
            velocity_score[i] = np.random.uniform(75, 98)
            structuring_score[i] = np.random.uniform(30, 60)
            recipient_burst_score[i] = np.random.uniform(40, 70)
            recipient_reputation_score[i] = np.random.uniform(20, 60)
            oldbalance_org[i] = total_amount_hour[i]
            newbalance_orig[i] = np.maximum(0, oldbalance_org[i] - amounts[i])

        elif typology == "STRUCTURING_SMURF":
            types[i] = np.random.choice([1, 4, 3])
            # Structured uniform sub-threshold amounts (e.g. 5x 900-2000 or 8x 9500)
            tx_last_hour[i] = np.random.randint(4, 10)
            tx_last_day[i] = tx_last_hour[i] + np.random.randint(2, 8)
            base_amt = np.random.choice([950, 1200, 4800, 9500, 48000])
            amounts[i] = base_amt * np.random.uniform(0.95, 1.05)
            total_amount_hour[i] = amounts[i] * tx_last_hour[i]
            total_amount_day[i] = total_amount_hour[i] * np.random.uniform(1.0, 1.3)
            unique_dest_hour[i] = np.random.randint(1, 3)
            unique_dest_day[i] = unique_dest_hour[i] + np.random.randint(1, 4)
            avg_amount_hour[i] = amounts[i]
            avg_amount_day[i] = total_amount_day[i] / tx_last_day[i]
            velocity_score[i] = np.random.uniform(45, 75)
            structuring_score[i] = np.random.uniform(75, 99)
            recipient_burst_score[i] = np.random.uniform(10, 40)
            recipient_reputation_score[i] = np.random.uniform(30, 70)

        elif typology == "RECIPIENT_FANOUT":
            types[i] = 4  # TRANSFER
            tx_last_hour[i] = np.random.randint(6, 16)
            tx_last_day[i] = tx_last_hour[i] + np.random.randint(3, 10)
            unique_dest_hour[i] = tx_last_hour[i]  # each transfer to a distinct recipient
            unique_dest_day[i] = unique_dest_hour[i] + np.random.randint(2, 6)
            amounts[i] = np.random.uniform(20000, 150000)
            total_amount_hour[i] = amounts[i] * tx_last_hour[i]
            total_amount_day[i] = total_amount_hour[i] * np.random.uniform(1.0, 1.4)
            avg_amount_hour[i] = amounts[i]
            avg_amount_day[i] = total_amount_day[i] / tx_last_day[i]
            velocity_score[i] = np.random.uniform(60, 88)
            structuring_score[i] = np.random.uniform(20, 50)
            recipient_burst_score[i] = np.random.uniform(80, 99)
            recipient_reputation_score[i] = np.random.uniform(45, 85)

        elif typology == "REPUTATION_MULE":
            types[i] = np.random.choice([1, 4])
            amounts[i] = np.random.uniform(40000, 250000)
            recipient_reputation_score[i] = np.random.uniform(80, 98)
            velocity_score[i] = np.random.uniform(35, 65)
            structuring_score[i] = np.random.uniform(20, 55)
            recipient_burst_score[i] = np.random.uniform(25, 65)

    # Derived engineered features
    balance_diff_orig = oldbalance_org - newbalance_orig
    balance_diff_dest = newbalance_dest - oldbalance_dest
    origin_account_emptied = (newbalance_orig == 0).astype(int)
    large_transaction = (amounts > 100000).astype(int)

    df = pd.DataFrame({
        "step": steps,
        "type": types,
        "amount": amounts,
        "oldbalanceOrg": oldbalance_org,
        "newbalanceOrig": newbalance_orig,
        "oldbalanceDest": oldbalance_dest,
        "newbalanceDest": newbalance_dest,
        "balanceDiffOrig": balance_diff_orig,
        "balanceDiffDest": balance_diff_dest,
        "originAccountEmptied": origin_account_emptied,
        "largeTransaction": large_transaction,
        "transactions_last_hour": tx_last_hour,
        "transactions_last_day": tx_last_day,
        "total_amount_last_hour": total_amount_hour,
        "total_amount_last_day": total_amount_day,
        "unique_recipients_last_hour": unique_dest_hour,
        "unique_recipients_last_day": unique_dest_day,
        "average_amount_last_hour": avg_amount_hour,
        "average_amount_last_day": avg_amount_day,
        "velocity_score": velocity_score,
        "structuring_score": structuring_score,
        "recipient_burst_score": recipient_burst_score,
        "recipient_reputation_score": recipient_reputation_score,
        "isFraud": is_fraud
    })

    return df

def train_and_save_model():
    print("Generating comprehensive PaySim + Behavioral dataset...")
    df = generate_behavioral_dataset(n_samples=160000, random_state=42)

    X = df.drop(columns=["isFraud"])
    y = df["isFraud"]

    fraud_count = y.sum()
    normal_count = len(y) - fraud_count
    scale_pos_weight = normal_count / fraud_count

    print(f"Dataset Size : {len(df):,}")
    print(f"Fraud Cases  : {fraud_count:,} ({fraud_count/len(df)*100:.2f}%)")
    print(f"Normal Cases : {normal_count:,}")
    print(f"Scale Weight : {scale_pos_weight:.2f}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print("\nInitializing Behavioral XGBoost Classifier...")
    model = XGBClassifier(
        n_estimators=320,
        max_depth=7,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        objective="binary:logistic",
        eval_metric="aucpr",
        random_state=42,
        n_jobs=-1
    )

    print("Training XGBoost with 23 features (PaySim + Behavioral)...")
    model.fit(X_train, y_train)
    print("Training Completed Successfully!")

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    print("\n===== CLASSIFICATION REPORT =====")
    print(classification_report(y_test, y_pred, digits=4))

    print("===== CONFUSION MATRIX =====")
    print(confusion_matrix(y_test, y_pred))

    roc = roc_auc_score(y_test, y_prob)
    pr_auc = average_precision_score(y_test, y_prob)

    print(f"\nROC-AUC Score : {roc:.4f}")
    print(f"PR-AUC Score  : {pr_auc:.4f}")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "xgboost_fraud.pkl")
    joblib.dump(model, model_path)
    print(f"\nSaved upgraded model to: {model_path}")

    # Also save metadata
    feature_importances = pd.DataFrame({
        "feature": X.columns,
        "importance": model.feature_importances_
    }).sort_values(by="importance", ascending=False)
    
    print("\n===== TOP FEATURE IMPORTANCES =====")
    print(feature_importances.head(12).to_string(index=False))

    return model, feature_importances

if __name__ == "__main__":
    train_and_save_model()
