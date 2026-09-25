import urllib.request
import json

endpoints = [
  ('GET', 'http://127.0.0.1:8000/health', None),
  ('GET', 'http://127.0.0.1:8000/model/intelligence', None),
  ('GET', 'http://127.0.0.1:8000/queue?category=VELOCITY', None),
  ('GET', 'http://127.0.0.1:8000/queue?category=STRUCTURING', None),
  ('GET', 'http://127.0.0.1:8000/safety/recipient-check?dest_account=M_FRAUD_9012&amount=5000', None),
  ('POST', 'http://127.0.0.1:8000/predict', {
      'step': 305,
      'type': 4,
      'amount': 15000.0,
      'oldbalanceOrg': 50000.0,
      'newbalanceOrig': 35000.0,
      'oldbalanceDest': 2000.0,
      'newbalanceDest': 17000.0,
      'orig_account': 'C109283746',
      'dest_account': 'M304958201',
      'transactions_last_hour': 25,
      'transactions_last_day': 48,
      'recent_amounts': [15000, 14500, 15200, 14800, 15000, 14900]
  })
]

for method, url, body in endpoints:
    req = urllib.request.Request(url, method=method)
    if body:
        req.add_header('Content-Type', 'application/json')
        data = json.dumps(body).encode('utf-8')
    else:
        data = None
    try:
        with urllib.request.urlopen(req, data=data, timeout=5) as response:
            res = json.loads(response.read().decode('utf-8'))
            print(f'SUCCESS: {method} {url} -> status={response.status}')
            if 'final_risk_score' in res:
                print(f'   Prediction Result: Final={res.get("final_risk_score")}, Tier={res.get("final_risk_tier")}, Cat={res.get("fraud_category")}, Vel={res.get("velocity_score")}, Struct={res.get("structuring_score")}')
            if 'warning_triggered' in res:
                print(f'   Safety Check: Triggered={res.get("warning_triggered")}, Msg={res.get("warning_message")}')
            if 'behavioral_vs_traditional' in res:
                print(f'   Intelligence: Telemetry Keys={list(res.keys())}')
    except Exception as e:
        print(f'FAILED: {method} {url} -> {e}')
