import httpx
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class WeatherController:
    """
    Gestisce il recupero dei dati meteo da Open-Meteo.
    Recupera anche stime di luce e suolo per la Pipeline AI.
    """
    
    async def get_weather_data(self, city: str):
        """
        Recupera dati meteo correnti per una città specifica.
        Restituisce anche stime satellitari per umidità del suolo e luce.
        """
        if not city:
            raise HTTPException(status_code=400, detail="Città non specificata")

        try:
            logger.info(f"Richiesta meteo per: {city}")

            # 1. Geocoding: Ottieni coordinate da nome città
            geo_url = "https://geocoding-api.open-meteo.com/v1/search"
            params_geo = {
                "name": city,
                "count": 1,
                "language": "it",
                "format": "json"
            }
            
            async with httpx.AsyncClient() as client:
                geo_res = await client.get(geo_url, params=params_geo)
                geo_data = geo_res.json()
            
            if not geo_data.get("results"):
                raise HTTPException(status_code=404, detail=f"Città '{city}' non trovata")
            
            location = geo_data["results"][0]
            lat = location["latitude"]
            lon = location["longitude"]

            # 2. Meteo Completo: Aria + Suolo + Sole
            weather_url = "https://api.open-meteo.com/v1/forecast"
            params_wx = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,rain,soil_moisture_0_to_7cm,shortwave_radiation",
                "timezone": "auto"
            }
            
            async with httpx.AsyncClient() as client:
                wx_res = await client.get(weather_url, params=params_wx)
                wx_data = wx_res.json()
            
            if "current" not in wx_data:
                raise HTTPException(status_code=502, detail="Dati meteo non disponibili")

            current = wx_data["current"]

            # 3. Normalizzazione Dati per la Pipeline (CON PROTEZIONE DA NULL)
            
            # --- FIX PER IL NULL TYPE ERROR ---
            # Controlliamo se il valore è None prima di fare calcoli matematici.
            
            # Umidità Suolo
            raw_soil = current.get("soil_moisture_0_to_7cm")
            if raw_soil is None:
                raw_soil = 0.0 # Fallback sicuro se il sensore satellitare non ha dati
            
            soil_moisture_pct = min(100.0, max(0.0, raw_soil * 100))

            # Luce Solare
            raw_rad = current.get("shortwave_radiation")
            if raw_rad is None:
                raw_rad = 0.0 # Fallback sicuro (es. è notte o dato mancante)
                
            light_lux = raw_rad * 120.0

            return {
                "status": "success",
                "location": {
                    "name": location["name"],
                    "country": location.get("country"),
                    "lat": lat,
                    "lng": lon
                },
                "temp": current.get("temperature_2m", 0.0),
                "humidity": current.get("relative_humidity_2m", 0.0),
                "rainNext24h": current.get("rain", 0.0),
                
                # Dati "Sensori Virtuali" pronti per la pipeline
                "soil_moisture": round(soil_moisture_pct, 1), 
                "light": round(light_lux, 0)
            }

        except HTTPException as he:
            raise he
        except Exception as e:
            logger.error(f"Error fetching weather: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Errore meteo: {str(e)}")

# Istanza globale da importare nel Router
weatherController = WeatherController()