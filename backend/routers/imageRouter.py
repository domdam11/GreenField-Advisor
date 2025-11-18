# backend/routers/imageRouter.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from utils.images import save_image_bytes
from pathlib import Path
import uuid
from typing import List

router = APIRouter(prefix="/api/images", tags=["images"])


@router.post("/upload", summary="Carica immagine")
async def upload_image(
        file: UploadFile = File(..., description="File immagine (JPEG, PNG, WEBP)")
):
    """
    Carica un'immagine e salvala nella cartella uploads
    """
    try:
        # Leggi il contenuto del file
        image_data = await file.read()

        # Genera nome univoco
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        base_name = str(uuid.uuid4())

        # Salva l'immagine usando la funzione esistente in utils/images.py
        saved_paths = save_image_bytes(
            data=image_data,
            subdir="plants",
            base_name=base_name
        )

        return {
            "status": "success",
            "filename": f"{base_name}.{file_extension}",
            "paths": saved_paths,
            "message": "Image uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")


@router.get("/list", summary="Lista tutte le immagini")
async def list_images(subdir: str = "plants") -> List[str]:
    """
    Elenca tutte le immagini caricate in una sottocartella
    """
    try:
        from config import settings
        upload_dir = Path(settings.UPLOAD_DIR) / subdir

        if not upload_dir.exists():
            return []

        # Lista tutti i file immagine
        images = [
            f.name for f in upload_dir.iterdir()
            if f.is_file() and f.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']
        ]

        return sorted(images)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing images: {str(e)}")


@router.delete("/delete/{filename}", summary="Elimina immagine")
async def delete_image(filename: str, subdir: str = "plants"):
    """
    Elimina un'immagine dalla cartella uploads
    """
    try:
        from config import settings
        file_path = Path(settings.UPLOAD_DIR) / subdir / filename

        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")

        file_path.unlink()

        return {
            "status": "success",
            "message": f"Image {filename} deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting image: {str(e)}")
