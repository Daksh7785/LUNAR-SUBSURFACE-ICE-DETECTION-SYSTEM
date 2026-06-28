import os
from celery import Celery

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

app = Celery(
    'lunar_ml_worker',
    broker=RABBITMQ_URL,
    backend=REDIS_URL,
    include=['tasks']
)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

if __name__ == '__main__':
    app.start()
