"""
Storage abstraction layer supporting local filesystem and S3-compatible backends.
"""
import os
import uuid
import io
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, BinaryIO
from urllib.parse import urljoin

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()


class StorageBackend(ABC):
    """Abstract storage backend interface."""

    @abstractmethod
    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Save data and return public URL."""
        pass

    @abstractmethod
    def delete(self, key: str) -> bool:
        """Delete file by key. Returns True if deleted."""
        pass

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if file exists."""
        pass

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Get public URL for a key."""
        pass


class LocalStorage(StorageBackend):
    """Local filesystem storage."""

    def __init__(self, base_dir: str, public_base_url: str):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.public_base_url = public_base_url.rstrip("/")

    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        path = self.base_dir / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return self.get_url(key)

    def delete(self, key: str) -> bool:
        path = self.base_dir / key
        if path.exists():
            path.unlink()
            return True
        return False

    def exists(self, key: str) -> bool:
        return (self.base_dir / key).exists()

    def get_url(self, key: str) -> str:
        return f"{self.public_base_url}/{key}"


class S3Storage(StorageBackend):
    """S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, etc.)."""

    def __init__(
        self,
        endpoint_url: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = "us-east-1",
        public_url: Optional[str] = None,
    ):
        self.bucket = bucket
        self.public_url = public_url.rstrip("/") if public_url else None

        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url or None,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=BotoConfig(signature_version="s3v4"),
        )
        self._ensure_bucket()

    def _ensure_bucket(self):
        """Create bucket if it doesn't exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                self.client.create_bucket(Bucket=self.bucket)
            else:
                raise

    def _get_public_url(self, key: str) -> str:
        if self.public_url:
            return f"{self.public_url}/{key}"
        # Generate presigned URL for private buckets (valid for 1 hour)
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=3600,
        )

    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return self._get_public_url(key)

    def delete(self, key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False

    def get_url(self, key: str) -> str:
        return self._get_public_url(key)


def get_storage_backend() -> StorageBackend:
    """Factory function to get the configured storage backend."""
    if settings.STORAGE_BACKEND.lower() == "s3":
        if not settings.S3_ACCESS_KEY or not settings.S3_SECRET_KEY:
            raise ValueError("S3 credentials not configured")
        return S3Storage(
            endpoint_url=settings.S3_ENDPOINT_URL,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            bucket=settings.S3_BUCKET,
            region=settings.S3_REGION,
            public_url=settings.S3_PUBLIC_URL,
        )
    # Default: local storage
    storage_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "storage",
    )
    return LocalStorage(storage_dir, "/storage")


# Convenience functions for avatar handling
ALLOWED_AVATAR_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024


def validate_avatar(file_content: bytes, filename: str) -> tuple[bool, Optional[str]]:
    """Validate avatar file. Returns (is_valid, error_message)."""
    if len(file_content) > MAX_AVATAR_SIZE:
        return False, "File too large (max 5MB)"
    if not filename or "." not in filename:
        return False, "Invalid file name"
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_AVATAR_EXTS:
        return False, f"Unsupported file type: {ext}"
    return True, None


def generate_avatar_key(user_id: str, filename: str) -> str:
    """Generate a unique storage key for an avatar."""
    ext = filename.rsplit(".", 1)[-1].lower()
    return f"avatars/{user_id}/{uuid.uuid4().hex}.{ext}"


def delete_avatar(backend: StorageBackend, avatar_url: str) -> bool:
    """Delete avatar by its public URL."""
    if not avatar_url:
        return False
    # Extract key from URL (assumes format /storage/avatars/... or S3 URL)
    if "/storage/avatars/" in avatar_url:
        key = avatar_url.split("/storage/avatars/", 1)[1]
        key = f"avatars/{key}"
    elif avatar_url.startswith("http"):
        # For S3, try to extract key from URL
        parts = avatar_url.split("/")
        if len(parts) >= 4 and parts[3] == "avatars":
            key = "/".join(parts[3:])
        else:
            return False
    else:
        return False
    return backend.delete(key)