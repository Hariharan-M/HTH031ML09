import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

print("Loading dataset...")

df = pd.read_csv("C:\\Project\\Fraud_Detection\\datasets\\Synthetic_Financial_datasets_log.csv")

print("Original Shape:", df.shape)

df = df.drop_duplicates()

print("\nMissing Values:")
print(df.isnull().sum())

df = df[df["amount"] > 0]

df["balanceDiffOrig"] = (
    df["oldbalanceOrg"] -
    df["newbalanceOrig"]
)

df["balanceDiffDest"] = (
    df["newbalanceDest"] -
    df["oldbalanceDest"]
)

df["originAccountEmptied"] = (
    df["newbalanceOrig"] == 0
).astype(int)

threshold = df["amount"].quantile(0.95)

df["largeTransaction"] = (
    df["amount"] > threshold
).astype(int)

encoder = LabelEncoder()

df["type"] = encoder.fit_transform(df["type"])

print("\nTransaction Types:")
print(dict(zip(
    encoder.classes_,
    encoder.transform(encoder.classes_)
)))

df.drop(
    columns=[
        "nameOrig",
        "nameDest"
    ],
    inplace=True
)

df.to_csv(
    "C:\\Project\\Fraud_Detection\\datasets\\PS_20174392719_1491204439457_log.csv",
    index=False
)

print("\nCleaned Shape:", df.shape)

X = df.drop(
    columns=[
        "isFraud",
        "isFlaggedFraud"
    ]
)

y = df["isFraud"]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("\nTraining Shape:", X_train.shape)
print("Testing Shape :", X_test.shape)

X_train.to_csv("C:\\Project\\Fraud_Detection\\datasets\\X_train.csv", index=False)
X_test.to_csv("C:\\Project\\Fraud_Detection\\datasets\\X_test.csv", index=False)

y_train.to_csv("C:\\Project\\Fraud_Detection\\datasets\\y_train.csv", index=False)
y_test.to_csv("C:\\Project\\Fraud_Detection\\datasets\\y_test.csv", index=False)

print("\nDataset preparation completed.")