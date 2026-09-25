import urllib.request
import json

txs = ['TX-948271', 'TX-VEL-8491', 'TX-948268', 'TX-STR-4921', 'TX-REC-7712', 'TX-STR-4922', 'TX-VEL-8492']

for tx in txs:
    url = f"http://127.0.0.1:8000/explanation/{tx}"
    res = urllib.request.urlopen(url)
    data = json.loads(res.read())
    print(f"[{tx}] Step: {data['step']}, RiskScore: {data['risk_score']}/100, Tier: {data['risk_level']}, Prob: {data['fraud_probability']}, Loss: ${data['expected_loss']:,.2f}, SHAP features: {len(data['shap_features'])}, Reasons: {len(data['reasons'])}")

print("\n--- ALL EXPLANATION ENDPOINTS VERIFIED SUCCESSFULLY ---")
