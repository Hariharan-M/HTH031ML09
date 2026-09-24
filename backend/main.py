from fastapi import FastAPI
from pydantic import BaseModel

import pandas as pd
import joblib
import shap


model = joblib.load(
    r"C:\Project\Fraud_Detection\models\xgboost_fraud.pkl"
)

explainer = shap.TreeExplainer(model)

app = FastAPI(
    title="Fraud Detection API",
    version="1.0"
)

class Transaction(BaseModel):

    step: int
    type: int

    amount: float

    oldbalanceOrg: float
    newbalanceOrig: float

    oldbalanceDest: float
    newbalanceDest: float

@app.get("/")
def home():

    return {
        "message": "Fraud Detection API Running"
    }

@app.post("/predict")
def predict(transaction: Transaction):

    data = transaction.dict()

    data["balanceDiffOrig"] = (
        data["oldbalanceOrg"]
        - data["newbalanceOrig"]
    )

    data["balanceDiffDest"] = (
        data["newbalanceDest"]
        - data["oldbalanceDest"]
    )

    data["originAccountEmptied"] = int(
        data["newbalanceOrig"] == 0
    )

    data["largeTransaction"] = int(
        data["amount"] > 100000
    )

    df = pd.DataFrame([data])

    fraud_probability = float(
        model.predict_proba(df)[0][1]
    )

    prediction = (
        "FRAUD"
        if fraud_probability > 0.5
        else "LEGIT"
    )

    expected_loss = (
        fraud_probability
        * data["amount"]
    )


    shap_values = explainer.shap_values(df)

    feature_df = pd.DataFrame({
        "Feature": df.columns,
        "SHAP_Value": shap_values[0]
    })

    feature_df = feature_df.sort_values(
        by="SHAP_Value",
        ascending=False
    )

    reasons = []

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

    positive_features = feature_df[
        feature_df["SHAP_Value"] > 0
    ].head(3)

    for _, row in positive_features.iterrows():

        reasons.append(
            reason_templates.get(
                row["Feature"],
                row["Feature"]
            )
        )


    return {

        "prediction": prediction,

        "fraud_probability":
            round(fraud_probability, 4),

        "expected_loss":
            round(expected_loss, 2),

        "reasons":
            reasons
    }