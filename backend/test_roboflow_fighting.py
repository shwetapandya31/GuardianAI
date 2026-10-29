from inference_sdk import InferenceHTTPClient, InferenceConfiguration

ROBOFLOW_API_KEY = "yTpay5EcTZnc9SzA8zVT"

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=ROBOFLOW_API_KEY
).configure(
    InferenceConfiguration(
        api_key_transport="header"
    )
)

result = client.run_workflow(
    workspace_name="mayanks-workspace-ha68g",
    workflow_id="fighting-vfighting-feji2-yljkh-1-yolo26s-t1-logic",
    images={
        "image": "test_fight.jpg"
    },
    use_cache=True
)

print("\n===== ROBOFLOW RESULT =====")
print(result)
