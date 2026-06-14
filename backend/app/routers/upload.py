"""
Rasm yuklash — Cloudinary orqali.

POST /upload  — fayl yuboriladi, Cloudinary URL qaytariladi.
CLOUDINARY_URL muhit o'zgaruvchisi bo'lmasa 503 qaytariladi.
"""
import os
import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from ..deps import get_current_user
from ..models import User

router = APIRouter(tags=["upload"])

_configured = False


def _ensure_cloudinary():
    global _configured
    if _configured:
        return
    url = os.getenv("CLOUDINARY_URL")
    if not url:
        raise HTTPException(
            status_code=503,
            detail="CLOUDINARY_URL muhit o'zgaruvchisi sozlanmagan",
        )
    cloudinary.config(cloudinary_url=url)
    _configured = True


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    """Rasm faylini Cloudinary'ga yuklaydi va URL qaytaradi."""
    _ensure_cloudinary()
    data = await file.read()
    result = cloudinary.uploader.upload(
        data,
        folder="simkarta",
        resource_type="image",
        transformation=[{"quality": "auto", "fetch_format": "auto"}],
    )
    return {"url": result["secure_url"]}
