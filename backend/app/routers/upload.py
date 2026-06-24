"""
Rasm yuklash — Supabase Storage orqali.

POST /upload  — fayl yuboriladi, public URL qaytariladi.
SUPABASE_URL yoki SUPABASE_KEY muhit o'zgaruvchisi bo'lmasa 503 qaytariladi.

Bucket: "sim-photos" (PUBLIC bo'lishi shart — public URL shu asosda qaytariladi).
"""
import os
import re
import uuid

import requests
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from ..deps import get_current_user
from ..models import User

router = APIRouter(tags=["upload"])

# Supabase Storage bucket nomi (Supabase panelida PUBLIC qilib yaratilgan)
BUCKET = "sim-photos"


def _supabase_creds() -> tuple[str, str]:
    """SUPABASE_URL va SUPABASE_KEY ni o'qiydi; bo'lmasa 503."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL yoki SUPABASE_KEY muhit o'zgaruvchisi sozlanmagan",
        )
    return url.rstrip("/"), key


def _safe_name(name: str | None) -> str:
    """Original fayl nomini xavfsiz holatga keltiradi (faqat harf/raqam/._-)."""
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", name or "")
    return cleaned[-60:] or "photo.jpg"


@router.post("/upload")
async def upload_photo(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    """Rasm faylini Supabase Storage'ga yuklaydi va public URL + path qaytaradi."""
    base, key = _supabase_creds()
    data = await file.read()

    # Unikal fayl nomi: uuid + original nom (to'qnashuvni oldini oladi)
    path = f"{uuid.uuid4().hex}_{_safe_name(file.filename)}"
    content_type = file.content_type or "image/jpeg"

    res = requests.post(
        f"{base}/storage/v1/object/{BUCKET}/{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Content-Type": content_type,
            "x-upsert": "true",
        },
        timeout=30,
    )
    if not res.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase Storage yuklash xatosi ({res.status_code}): {res.text[:200]}",
        )

    # Public bucket'dagi to'g'ridan-to'g'ri ko'rinadigan URL
    public_url = f"{base}/storage/v1/object/public/{BUCKET}/{path}"

    # Javob shakli Cloudinary bilan bir xil: {url, public_id}. Frontend o'zgarmaydi.
    # public_id = bucket ichidagi path (keyinchalik o'chirish uchun ishlatiladi).
    return {"url": public_url, "public_id": path}


def delete_storage_image(public_id: str | None) -> None:
    """
    Supabase Storage'dan rasmni o'chiradi (best-effort).
    public_id (bucket ichidagi path) bo'lmasa yoki xato bo'lsa — jimgina o'tadi
    (ma'lumot butunligi muhimroq; yetim fayl qolishi mumkin).
    """
    if not public_id:
        return
    try:
        base, key = _supabase_creds()
        requests.delete(
            f"{base}/storage/v1/object/{BUCKET}/{public_id}",
            headers={"Authorization": f"Bearer {key}", "apikey": key},
            timeout=15,
        )
    except Exception:
        # Yetim fayl qolishi mumkin, lekin bu jarayonni to'xtatmasligi kerak
        pass
