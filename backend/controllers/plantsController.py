import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import HTTPException

from config import settings
from controllers.interventionsController import interventions_collection
from database import db
from models.plantModel import PlantCreate, PlantUpdate, serialize_plant
from utils.images import save_image_bytes

# --- NUOVI IMPORT PER LA PIPELINE AI ---
from pipeline.pipeline_manager import PipelineManager
from controllers.weather_controller import weatherController

try:
    from utils.trefle_service import fetch_plant_by_id, derive_defaults_from_trefle_data
    TREFLE_AVAILABLE = True
except Exception:
    # Se il modulo non esiste o manca il token, continuiamo senza rompere nulla.
    TREFLE_AVAILABLE = False

plants_collection = db["piante"]


# Helper interni
def _oid(val: str) -> ObjectId:
    return ObjectId(val)

def _parse_iso(dt):
    if not dt:
        return None
    if isinstance(dt, datetime):
        return dt
    try:
        return datetime.fromisoformat(str(dt).replace("Z", "+00:00"))
    except Exception:
        return None

def _safe_int(v, default=None):
    try:
        return int(v)
    except Exception:
        return default

def _apply_trefle_enrichment(base_doc: Dict[str, Any], trefle_id: Optional[int]) -> Dict[str, Any]:
    """
    Integra i campi dal plant Trefle (se disponibile) dentro `base_doc`.
    Precedenza: i valori esplicitamente presenti in base_doc NON vengono sovrascritti.
    """
    if not TREFLE_AVAILABLE or not trefle_id:
        return base_doc

    snapshot = None
    try:
        snapshot = fetch_plant_by_id(int(trefle_id))
    except Exception:
        snapshot = None

    if not snapshot:
        return base_doc

    # Estrai info primarie dall'API
    trefle_scientific = snapshot.get("scientific_name") or snapshot.get("scientificName")
    trefle_common = snapshot.get("common_name") or snapshot.get("commonName")
    trefle_slug = snapshot.get("slug")

    # Deriviamo i defaults da snapshot
    try:
        derived = derive_defaults_from_trefle_data(snapshot) or {}
    except Exception:
        derived = {}

    # Applica i campi Trefle solo se non già settati nel base_doc
    if base_doc.get("species") is None and trefle_scientific:
        base_doc["species"] = trefle_scientific

    if base_doc.get("wateringIntervalDays") is None and derived.get("wateringIntervalDays") is not None:
        base_doc["wateringIntervalDays"] = derived.get("wateringIntervalDays")

    if base_doc.get("sunlight") is None and derived.get("sunlight") is not None:
        base_doc["sunlight"] = derived.get("sunlight")

    if base_doc.get("soil") is None and derived.get("soil") is not None:
        base_doc["soil"] = derived.get("soil")
    
    # Salviamo nel doc anche i riferimenti Trefle
    base_doc["trefleId"] = int(trefle_id)
    if trefle_slug and base_doc.get("trefleSlug") is None:
        base_doc["trefleSlug"] = trefle_slug
    if trefle_scientific and base_doc.get("trefleScientificName") is None:
        base_doc["trefleScientificName"] = trefle_scientific
    if trefle_common and base_doc.get("trefleCommonName") is None:
        base_doc["trefleCommonName"] = trefle_common

    # Conserviamo uno snapshot
    if base_doc.get("trefleData") is None:
        base_doc["trefleData"] = snapshot

    return base_doc


# --- CRUD PIANTE ---

def list_plants(user_id: str) -> List[dict]:
    cursor = plants_collection.find({"userId": _oid(user_id)}).sort("createdAt", -1)
    return [serialize_plant(doc) for doc in cursor]


def get_plant(user_id: str, plant_id: str) -> Optional[dict]:
    doc = plants_collection.find_one({"_id": _oid(plant_id), "userId": _oid(user_id)})
    return serialize_plant(doc)


def create_plant(user_id: str, data: PlantCreate) -> dict:
    now = datetime.utcnow()

    base_doc = {
        "userId": _oid(user_id),
        "name": data.name,
        "species": data.species,
        "location": data.location,
        "description": data.description,
        "wateringIntervalDays": getattr(data, "wateringIntervalDays", None),
        "sunlight": getattr(data, "sunlight", None),
        "soil": getattr(data, "soil", None),
        "lastWateredAt": None,
        "stage": data.stage,
        "imageUrl": data.imageUrl,
        "imageThumbUrl": getattr(data, "imageThumbUrl", None),
        # Campi geo
        "geoLat": getattr(data, "geoLat", None),
        "geoLng": getattr(data, "geoLng", None),
        "placeId": getattr(data, "placeId", None),
        "addressLocality": getattr(data, "addressLocality", None),
        "addressAdmin2": getattr(data, "addressAdmin2", None),
        "addressAdmin1": getattr(data, "addressAdmin1", None),
        "addressCountry": getattr(data, "addressCountry", None),
        "addressCountryCode": getattr(data, "addressCountryCode", None),
        # Trefle link
        "trefleId": getattr(data, "trefleId", None),
        "trefleSlug": getattr(data, "trefleSlug", None),
        "trefleScientificName": getattr(data, "trefleScientificName", None),
        "trefleCommonName": getattr(data, "trefleCommonName", None),
        "trefleData": getattr(data, "trefleData", None),
        "trefleImageUrl": getattr(data, "trefleImageUrl", None) ,
        "createdAt": now,
        "updatedAt": now,
    }

    # Enrich Trefle
    trefle_id = base_doc.get("trefleId")
    base_doc = _apply_trefle_enrichment(base_doc, trefle_id)

    # Fallback defaults
    if base_doc.get("wateringIntervalDays") is None:
        base_doc["wateringIntervalDays"] = 3
    if base_doc.get("sunlight") is None:
        base_doc["sunlight"] = "pieno sole"

    res = plants_collection.insert_one(base_doc)
    base_doc["_id"] = res.inserted_id
    return serialize_plant(base_doc)


def update_plant(user_id: str, plant_id: str, data: PlantUpdate) -> Optional[dict]:
    existing = plants_collection.find_one({"_id": _oid(plant_id), "userId": _oid(user_id)})
    if not existing:
        return None

    update_fields = {}

    for field in [
        "name", "species", "location", "description",
        "stage", "imageUrl", "imageThumbUrl",
        "geoLat", "geoLng", "placeId",
        "addressLocality", "addressAdmin2", "addressAdmin1",
        "addressCountry", "addressCountryCode",
        "trefleId", "trefleSlug", "trefleScientificName", "trefleCommonName",
    ]:
        val = getattr(data, field, None)
        if val is not None:
            update_fields[field] = val

    if getattr(data, "wateringIntervalDays", None) is not None:
        update_fields["wateringIntervalDays"] = _safe_int(data.wateringIntervalDays, existing.get("wateringIntervalDays", 3))
    if getattr(data, "sunlight", None) is not None:
        update_fields["sunlight"] = data.sunlight
    if getattr(data, "soil", None) is not None:
        update_fields["soil"] = data.soil

    # Trefle re-enrichment logic
    new_trefle_id = getattr(data, "trefleId", None)
    need_enrich = False
    if new_trefle_id is not None:
        if existing.get("trefleId") != new_trefle_id:
            need_enrich = True

    if need_enrich:
        provisional = {**existing, **update_fields}
        provisional = _apply_trefle_enrichment(provisional, new_trefle_id)

        if "wateringIntervalDays" not in update_fields and provisional.get("wateringIntervalDays") is not None:
            update_fields["wateringIntervalDays"] = provisional.get("wateringIntervalDays")
        if "sunlight" not in update_fields and provisional.get("sunlight") is not None:
            update_fields["sunlight"] = provisional.get("sunlight")
        if "soil" not in update_fields and provisional.get("soil") is not None:
            update_fields["soil"] = provisional.get("soil")

        for k in ["trefleSlug", "trefleScientificName", "trefleCommonName", "trefleData", "trefleId", "trefleImageUrl"]:
            if provisional.get(k) is not None:
                update_fields[k] = provisional.get(k)

    update_fields["updatedAt"] = datetime.utcnow()

    plants_collection.update_one(
        {"_id": _oid(plant_id), "userId": _oid(user_id)},
        {"$set": update_fields}
    )
    doc = plants_collection.find_one({"_id": _oid(plant_id), "userId": _oid(user_id)})
    return serialize_plant(doc)


def delete_plant(user_id: str, plant_id: str) -> bool:
    res = plants_collection.delete_one({"_id": _oid(plant_id), "userId": _oid(user_id)})
    if res.deleted_count == 1:
        interventions_collection.delete_many({"plantId": _oid(plant_id), "userId": _oid(user_id)})
        return True
    return False


# --- GESTIONE IMMAGINI ---

def save_plant_image(user_id: str, plant_id: str, file_bytes: bytes) -> Optional[dict]:
    plant = plants_collection.find_one({"_id": _oid(plant_id), "userId": _oid(user_id)})
    if not plant:
        return None

    saved = save_image_bytes(
        data=file_bytes,
        subdir=f"plants/{user_id}/{plant_id}"
    )

    # rimozione img precedenti
    old_rel = plant.get("imageRelPath")
    old_rel_thumb = plant.get("imageRelThumbPath")

    def remove_rel(rel_path: Optional[str]):
        if not rel_path:
            return
        base = settings.UPLOAD_DIR.rstrip("/").rstrip("\\")
        rel_norm = rel_path.replace("uploads/", "")
        abs_path = os.path.join(base, rel_norm)
        try:
            if os.path.exists(abs_path):
                os.remove(abs_path)
        except Exception:
            pass

    remove_rel(old_rel)
    remove_rel(old_rel_thumb)

    plants_collection.update_one(
        {"_id": _oid(plant_id)},
        {"$set": {
            "imageUrl": saved["url"],
            "imageThumbUrl": saved["thumbUrl"],
            "imageRelPath": saved["rel"],
            "imageRelThumbPath": saved["relThumb"],
            "updatedAt": datetime.utcnow()
        }}
    )

    return {"imageUrl": saved["url"], "imageThumbUrl": saved["thumbUrl"]}


def remove_plant_image(user_id: str, plant_id: str) -> Optional[dict]:
    res = plants_collection.update_one(
        {"_id": _oid(plant_id), "userId": _oid(user_id)},
        {"$unset": {
            "imageUrl": "",
            "imageThumbUrl": "",
            "imageRelPath": "",
            "imageRelThumbPath": ""
        },
         "$set": {"updatedAt": datetime.utcnow()}
        }
    )
    if res.matched_count == 0:
        return None
    doc = plants_collection.find_one({"_id": _oid(plant_id)})
    return serialize_plant(doc)


# --- 🚀 NUOVA FUNZIONE PER L'AI E IL METEO ---

async def calculate_irrigation_for_plant(user_id: str, plant_id: str) -> Dict[str, Any]:
    """
    Calcola consiglio irrigazione e concimazione usando la Pipeline AI v2.
    Recupera la pianta dal DB, scarica il meteo reale e lancia la pipeline.
    """
    
    # 1. Recupera la pianta
    try:
        obj_id = _oid(plant_id)
    except:
        raise HTTPException(status_code=400, detail="ID pianta non valido")

    plant = plants_collection.find_one({"_id": obj_id, "userId": _oid(user_id)})
    if not plant:
        raise HTTPException(status_code=404, detail="Pianta non trovata")

    # Recupera specie e terreno
    raw_species = plant.get("species", "generic") or "generic"
    soil_type = plant.get("soil", "universale") or "universale"

    # 2. Recupera Dati Ambientali Reali (Meteo + Suolo + Luce)
    location_name = plant.get("location") or plant.get("addressLocality")
    
    # Valori di default (fallback se non c'è meteo)
    sensor_data = {
        "temperature": 20.0, 
        "humidity": 50.0, 
        "rainfall": 0.0, 
        "light": 10000.0, 
        "soil_moisture": 50.0,
        "soil": soil_type,
        
        # 🟢 CORREZIONE CRITICA: Passiamo la specie nei dati sensore!
        # Senza questo, l'ActionGenerator pensa sia una pianta "Generica" (21gg)
        "plant_type": raw_species, 
        "species": raw_species 
    }

    if location_name:
        try:
            # Chiama il WeatherController
            wx = await weatherController.get_weather_data(location_name)
            
            # Aggiorna con i dati reali
            sensor_data.update({
                "temperature": wx["temp"],
                "humidity": wx["humidity"],
                "rainfall": wx["rainNext24h"],
                "light": wx["light"],
                "soil_moisture": wx["soil_moisture"]
            })
        except Exception as e:
            print(f"[WARN] Errore meteo per pianta {plant_id}: {e}")
            # Continua con i valori di default, ma logga l'errore

    # 3. Esegui la Pipeline
    plant_type_str = raw_species.lower()
    
    # Mappatura semplice per scegliere la strategia di irrigazione (TomatoStrategy, ecc.)
    mapped_type = "generic"
    if "pomodoro" in plant_type_str or "tomato" in plant_type_str: mapped_type = "tomato"
    elif "lattuga" in plant_type_str or "lettuce" in plant_type_str: mapped_type = "lettuce"
    elif "basilico" in plant_type_str or "basil" in plant_type_str: mapped_type = "basil"
    elif "peperone" in plant_type_str or "pepper" in plant_type_str: mapped_type = "pepper"
    elif "cetriolo" in plant_type_str or "cucumber" in plant_type_str: mapped_type = "cucumber"
    
    # Inizializza pipeline
    pipeline = PipelineManager(plant_type=mapped_type)
    
    # Esegui (ora sensor_data contiene 'plant_type', quindi la concimazione funzionerà!)
    result = pipeline.process(sensor_data)

    # 4. Formatta la risposta per il Frontend (PipelineResponse)
    details = result.get("details", {})
    suggestions = details.get("full_suggestions", {})
    main_action = suggestions.get("main_action", {})
    timing_info = suggestions.get("timing", {})

    return {
        "status": "success",
        "suggestion": {
            "should_water": main_action.get("action") == "irrigate",
            "water_amount_liters": main_action.get("water_amount_liters", 0.0),
            "decision": main_action.get("decision", ""),
            "description": main_action.get("description", ""),
            "timing": timing_info.get("suggested_time", ""),
            "priority": suggestions.get("priority", "medium"),
            
            "frequency_estimation": suggestions.get("frequency_estimation"),
            "fertilizer_estimation": suggestions.get("fertilizer_estimation")
        },
        "details": {
            "cleaned_data": details.get("cleaned_data"),
            "features": details.get("features"),
            "estimation": details.get("estimation"),
            "anomalies": details.get("anomalies", [])
        },
        "meta": {
            "weather": sensor_data 
        }
    }