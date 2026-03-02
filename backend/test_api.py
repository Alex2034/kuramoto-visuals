"""
Verification script: call /simulate API and sanity-check response.
Run with backend server: uvicorn main:app --reload
Then: conda run -n kuramoto_vis python test_api.py
"""
import requests

resp = requests.post(
    "http://localhost:8000/simulate",
    json={"N": 10, "l": 5, "lambda_val": 1.0, "kappa": 1.0, "t_max": 100},
)
resp.raise_for_status()
data = resp.json()
assert "times" in data
assert "frames" in data
assert len(data["frames"]) == len(data["times"])
assert len(data["frames"][0]["points"]) == 2 * 10 + 5  # V = 2N + l
print("API verification OK")
