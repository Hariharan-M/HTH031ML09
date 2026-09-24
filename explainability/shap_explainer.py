import pandas as pd
import joblib
import shap

print("Loading model...")

model = joblib.load(
    r"C:\Project\Fraud_Detection\models\xgboost_fraud.pkl"
)

X_test = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\X_test.csv"
)

y_test = pd.read_csv(
    r"C:\Project\Fraud_Detection\datasets\y_test.csv"
).squeeze()

fraud_indices = y_test[y_test == 1].index

print(f"Fraud Transactions Found: {len(fraud_indices)}")

if len(fraud_indices) == 0:
    print("No fraud transactions found!")
    exit()

transaction_index = fraud_indices[0]

transaction = X_test.loc[[transaction_index]]

print(f"\nExplaining Fraud Transaction Index: {transaction_index}")

fraud_probability = model.predict_proba(
    transaction
)[0][1]

prediction = (
    "FRAUD"
    if fraud_probability > 0.5
    else "LEGIT"
)

print(f"\nPrediction         : {prediction}")
print(f"Fraud Probability  : {fraud_probability:.4f}")

explainer = shap.TreeExplainer(model)

shap_values = explainer.shap_values(transaction)

feature_df = pd.DataFrame({
    "Feature": transaction.columns,
    "SHAP_Value": shap_values[0]
})

feature_df["ABS_SHAP"] = (
    feature_df["SHAP_Value"].abs()
)

feature_df = feature_df.sort_values(
    by="ABS_SHAP",
    ascending=False
)

reason_templates = {
    "amount":
        "Large transaction amount",

    "balanceDiffOrig":
        "Large money withdrawn from sender account",

    "balanceDiffDest":
        "Large money credited to destination account",

    "originAccountEmptied":
        "Sender account was emptied after transaction",

    "type":
        "Suspicious transaction type",

    "oldbalanceOrg":
        "Unusual sender account balance",

    "newbalanceOrig":
        "Low remaining balance after transaction",

    "oldbalanceDest":
        "Destination account balance pattern",

    "newbalanceDest":
        "High destination account balance increase",

    "largeTransaction":
        "Transaction amount exceeds normal range",

    "step":
        "Transaction timing appears unusual"
}

print("\n===== TOP INFLUENCING FEATURES =====")

for _, row in feature_df.head(8).iterrows():

    feature = row["Feature"]

    impact = (
        "FRAUD"
        if row["SHAP_Value"] > 0
        else "LEGIT"
    )

    reason = reason_templates.get(
        feature,
        feature
    )

    print(
        f"{reason}"
        f"\n   Impact : {impact}"
        f"\n   SHAP   : {row['SHAP_Value']:.4f}\n"
    )

positive_features = feature_df[
    feature_df["SHAP_Value"] > 0
].head(3)

print("\n===== FRAUD REASONS =====")

for _, row in positive_features.iterrows():

    print(
        f"• {reason_templates.get(row['Feature'], row['Feature'])}"
    )

shap.plots.waterfall(
    shap.Explanation(
        values=shap_values[0],
        base_values=explainer.expected_value,
        data=transaction.iloc[0],
        feature_names=transaction.columns
    )
) 