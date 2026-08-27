"""
Unit tests for Storage abstraction layer (LocalStorage & S3Storage)
"""
import pytest
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.storage import (
    LocalStorage,
    S3Storage,
    get_storage_backend,
    validate_avatar,
    generate_avatar_key,
    delete_avatar,
)


def test_local_storage_operations():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = LocalStorage(base_dir=tmpdir, public_base_url="/storage")

        key = "avatars/test-user/avatar.png"
        data = b"fake-png-bytes"

        # 1. Save
        url = storage.save(key, data, content_type="image/png")
        assert url == "/storage/avatars/test-user/avatar.png"
        assert storage.exists(key) is True

        # 2. Check file content
        file_path = Path(tmpdir) / key
        assert file_path.read_bytes() == data

        # 3. Get URL
        assert storage.get_url(key) == "/storage/avatars/test-user/avatar.png"

        # 4. Delete
        deleted = storage.delete(key)
        assert deleted is True
        assert storage.exists(key) is False

        # 5. Delete non-existent
        assert storage.delete("nonexistent.txt") is False


def test_validate_avatar():
    # Valid JPG
    is_valid, err = validate_avatar(b"test", "avatar.jpg")
    assert is_valid is True
    assert err is None

    # Valid PNG
    is_valid, err = validate_avatar(b"test", "photo.png")
    assert is_valid is True
    assert err is None

    # Too large (>5MB)
    large_file = b"x" * (5 * 1024 * 1024 + 1)
    is_valid, err = validate_avatar(large_file, "large.jpg")
    assert is_valid is False
    assert "File too large" in err

    # Unsupported format
    is_valid, err = validate_avatar(b"test", "doc.pdf")
    assert is_valid is False
    assert "Unsupported file type" in err


def test_generate_avatar_key():
    key = generate_avatar_key("user-123", "my_photo.png")
    assert key.startswith("avatars/user-123/")
    assert key.endswith(".png")


def test_delete_avatar_local():
    mock_backend = MagicMock()
    mock_backend.delete.return_value = True

    url = "/storage/avatars/user-123/abc.jpg"
    res = delete_avatar(mock_backend, url)
    assert res is True
    mock_backend.delete.assert_called_once_with("avatars/user-123/abc.jpg")


@patch("boto3.client")
def test_s3_storage_mock(mock_boto_client):
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    s3_storage = S3Storage(
        endpoint_url="https://s3.amazonaws.com",
        access_key="test-key",
        secret_key="test-secret",
        bucket="synapse-test",
        public_url="https://cdn.example.com",
    )

    key = "avatars/u1/test.png"
    data = b"bytes"

    # Save
    url = s3_storage.save(key, data, content_type="image/png")
    assert url == "https://cdn.example.com/avatars/u1/test.png"
    mock_s3.put_object.assert_called_once()

    # Exists
    s3_storage.exists(key)
    mock_s3.head_object.assert_called_once_with(Bucket="synapse-test", Key=key)

    # Delete
    deleted = s3_storage.delete(key)
    assert deleted is True
    mock_s3.delete_object.assert_called_once_with(Bucket="synapse-test", Key=key)
