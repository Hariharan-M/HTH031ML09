import pandas as pd
import joblib

model = joblib.load(
    r"C:\Project\Fraud_Detection\models\xgboost_fraud.pkl"
)

transaction = {
    "step": 300,
    "type": 4,  
    "amount": 50000,

    "oldbalanceOrg": 50000,
    "newbalanceOrig": 0,

    "oldbalanceDest": 1000,
    "newbalanceDest": 51000
}


transaction["balanceDiffOrig"] = (
    transaction["oldbalanceOrg"]
    - transaction["newbalanceOrig"]
)

transaction["balanceDiffDest"] = (
    transaction["newbalanceDest"]
    - transaction["oldbalanceDest"]
)

transaction["originAccountEmptied"] = int(
    transaction["newbalanceOrig"] == 0
)


transaction["largeTransaction"] = int(
    transaction["amount"] > 100000
)



df = pd.DataFrame([transaction])

probability = model.predict_proba(df)[0][1]

prediction = (
    "FRAUD"
    if probability > 0.5
    else "LEGIT"
)

expected_loss = (
    probability
    * transaction["amount"]
)

print("\n===== RESULT =====")

print(
    f"Fraud Probability : {probability:.4f}"
)

print(
    f"Prediction        : {prediction}"
)

print(
    f"Expected Loss     : ₹{expected_loss:,.2f}"
)