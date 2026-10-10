"""Check that Claude on Bedrock works for YOUR account before you switch AgentMode to bedrock.

    python check_bedrock.py <model-or-inference-profile-id> [region]

Use the ID exactly as the Bedrock console lists it (newer models often need an inference
profile ID that starts with us. or global.). Run it with the same AWS credentials you deploy with.
"""
import sys

import boto3
from botocore.exceptions import ClientError

if len(sys.argv) < 2:
    sys.exit(__doc__)
model = sys.argv[1]
region = sys.argv[2] if len(sys.argv) > 2 else "us-east-1"
try:
    out = boto3.client("bedrock-runtime", region_name=region).converse(
        modelId=model,
        messages=[{"role": "user", "content": [{"text": "Reply with the single word: ready"}]}],
        inferenceConfig={"maxTokens": 20},
    )
    print("OK:", out["output"]["message"]["content"][0]["text"].strip())
except ClientError as err:
    e = err.response["Error"]
    print(f"FAILED: {e['Code']}: {e['Message']}")
    print("Check the model ID spelling, the region, and whether the console lists this model for your account.")
    sys.exit(1)
