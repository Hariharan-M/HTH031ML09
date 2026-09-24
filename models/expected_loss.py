import pandas as pd
import joblib
print("Loading model...")

model = joblib.load(
    r"C:\Project\Fraud_Detection\models\xgboost_fraud.pkl"
)

print("Loading test data...")

X_test = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\X_test.csv"
)

print("Generating probabilities...")

fraud_probability = model.predict_proba(X_test)[:, 1]

results = X_test.copy()

results["fraud_probability"] = fraud_probability

results["expected_loss"] = (
    results["fraud_probability"]
    * results["amount"]
)

results = results.sort_values(
    by="expected_loss",
    ascending=False
)

results["rank"] = range(
    1,
    len(results) + 1
)

top_50 = results.head(50)


results.to_csv(
    r"C:\Project\Fraud_Detection\datasets\ranked_transactions.csv",
    index=False
)

top_50.to_csv(
    r"C:\Project\Fraud_Detection\datasets\top_50_queue.csv",
    index=False
)

print("\nTop 10 Transactions:")
print(
    top_50[
        [
            "rank",
            "amount",
            "fraud_probability",
            "expected_loss"
        ]
    ].head(10)
)

print("\nFiles Saved:")
print("ranked_transactions.csv")
print("top_50_queue.csv")