"""Shared pagination helper for list endpoints.

Response shape: {"items": [...], "total": int, "page": int, "page_size": int, "total_pages": int}
"""


def make_page(items: list, total: int, page: int, page_size: int) -> dict:
    total_pages = (total + page_size - 1) // page_size if page_size else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
