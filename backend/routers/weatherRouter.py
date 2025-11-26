from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from controllers.weather_controller import weatherController 

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("", summary="Ottieni dati meteo e ambientali attuali")
async def get_weather(
    city: Optional[str] = Query(None, description="Nome della città"),
    lat: Optional[float] = Query(None, description="Latitudine"),
    lon: Optional[float] = Query(None, description="Longitudine")
):
    """
    Proxy verso Open-Meteo.
    Accetta città O coordinate (consigliate per precisione).
    Restituisce: Temperatura, Umidità, Pioggia, Luce stimata e Umidità Suolo stimata.
    """
    if not city and (lat is None or lon is None):
        raise HTTPException(status_code=400, detail="Devi fornire 'city' oppure 'lat' e 'lon'")

    return await weatherController.get_weather_data(city=city, lat=lat, lon=lon)