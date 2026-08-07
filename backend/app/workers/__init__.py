from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "synapse",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.auto_apply_tasks"],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,

    # Task tracking & acknowledgment
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Retry policy (applies to all tasks unless overridden)
    task_autoretry_for=(Exception,),
    task_retry_backoff=True,
    task_retry_backoff_max=600,  # 10 minutes max backoff
    task_retry_jitter=True,

    # Result backend
    result_expires=86400,  # 24 hours
    result_extended=True,

    # Dead letter queue - route failed tasks after max retries
    task_routes={
        "auto_apply.process_auto_apply": {"queue": "auto_apply"},
    },
    task_create_missing_queues=True,

    # Worker behavior
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
    broker_connection_retry_on_startup=True,
    broker_connection_retry=True,
    broker_connection_max_retries=10,

    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)
