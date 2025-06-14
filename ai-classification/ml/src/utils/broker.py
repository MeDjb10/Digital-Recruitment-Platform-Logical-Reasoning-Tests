import aio_pika
import json
from datetime import datetime

class MessageBroker:
    def __init__(self):
        self.connection = None
        self.channel = None

    async def connect(self):
        if not self.connection:
            self.connection = await aio_pika.connect_robust("amqp://localhost")
            self.channel = await self.connection.channel()

    async def publish_classification(self, attempt_id: str, prediction: dict):
        await self.connect()

        message = {
            "type": "AI_CLASSIFICATION_QUEUE",  # Add message type here
            "attemptId": attempt_id,
            "claclassification":{
                "prediction": prediction["predicted_category"],
                "confidence": prediction["confidence"],
                "timestamp": datetime.now().isoformat()
            }
        }

        await self.channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                content_type="application/json"
            ),
            routing_key="test.attempts.classified"
        )


broker = MessageBroker()
