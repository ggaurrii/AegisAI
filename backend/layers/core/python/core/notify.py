"""Staff notifications: an audit event in the store, plus SNS when a topic is configured."""
from . import config


def send(store, severity, message, building_id=None, clock=None):
    ev = store.add_event({"kind": "notification", "severity": severity, "text": message,
                          "building_id": building_id, "clock": clock})
    if config.ALERT_TOPIC_ARN:
        try:
            import boto3

            boto3.client("sns", region_name=config.REGION).publish(
                TopicArn=config.ALERT_TOPIC_ARN,
                Subject=f"JalRakshak {severity} alert"[:100],
                Message=message,
            )
        except Exception as err:
            store.add_event({"kind": "system", "text": f"SNS publish failed: {type(err).__name__}"})
    return ev
