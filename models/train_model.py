import pandas as pd
import joblib

from xgboost import XGBClassifier

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    average_precision_score
)

print("Loading datasets...")

X_train = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\X_train.csv"
)

X_test = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\X_test.csv"
)

y_train = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\y_train.csv"
).squeeze()

y_test = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\y_test.csv"
).squeeze()

fraud_count = y_train.sum()
normal_count = len(y_train) - fraud_count

scale_pos_weight = normal_count / fraud_count

print(f"Fraud Cases : {fraud_count}")
print(f"Normal Cases: {normal_count}")
print(f"Scale Weight: {scale_pos_weight:.2f}")

model = XGBClassifier(
    n_estimators=300,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_pos_weight,
    objective="binary:logistic",
    eval_metric="aucpr",
    random_state=42,
    n_jobs=-1
)

print("\nTraining XGBoost...")

model.fit(X_train, y_train)

print("Training Completed!")

y_pred = model.predict(X_test)

y_prob = model.predict_proba(X_test)[:, 1]

print("\nClassification Report")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix")
print(confusion_matrix(y_test, y_pred))

roc = roc_auc_score(y_test, y_prob)
pr_auc = average_precision_score(y_test, y_prob)

print(f"\nROC AUC : {roc:.4f}")
print(f"PR AUC  : {pr_auc:.4f}")

joblib.dump(
    model,
    r"C:\Project\Fraud_Detection\models\xgboost_fraud.pkl"
)

print("\nModel Saved Successfully!")

