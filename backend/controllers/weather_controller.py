import httpx
import logging
import re
from fastapi import HTTPException

logger = logging.getLogger(__name__)

class WeatherController:
    """
    Gestisce il recupero dei dati meteo da Open-Meteo.
    Include Geocoding (Nome -> Coord) e Reverse Geocoding (Coord -> Nome).
    """
    
    async def get_weather_data(self, city: str = None, lat: float = None, lon: float = None):
        
        location_name = "Posizione sconosciuta"
        
        # 1. DETERMINA COORDINATE E NOME
        if lat is None or lon is None:
            # CASO A: Abbiamo solo il nome (es. profilo utente)
            if not city:
                raise HTTPException(status_code=400, detail="Coordinate o Città non specificate")

            # Pulizia nome città
            city_clean = city.split(',')[0]
            city_clean = re.sub(r'\d+', '', city_clean).strip()
            
            coords = await self._fetch_coords_from_name(city_clean)
            
            # Fallback prima parola
            if not coords and len(city_clean.split()) > 1:
                city_simple = city_clean.split()[0]
                coords = await self._fetch_coords_from_name(city_simple)

            if not coords:
                raise HTTPException(status_code=404, detail=f"Città '{city}' non trovata")
                
            lat = coords["latitude"]
            lon = coords["longitude"]
            location_name = coords["name"]
        else:
            # CASO B: Abbiamo le coordinate (es. GPS o Pianta)
            # CHE SI FA: Facciamo Reverse Geocoding per trovare il nome reale
            found_name = await self._fetch_name_from_coords(lat, lon)
            location_name = found_name if found_name else (city or "Posizione Rilevata")

        # 2. METEO (Open-Meteo Forecast)
        try:
            lat = float(lat)
            lon = float(lon)
            
            weather_url = "https://api.open-meteo.com/v1/forecast"
            params_wx = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,rain,soil_moisture_0_to_7cm,shortwave_radiation",
                "timezone": "auto"
            }
            
            async with httpx.AsyncClient() as client:
                wx_res = await client.get(weather_url, params=params_wx, timeout=10.0)
                wx_data = wx_res.json()
            
            if "error" in wx_data:
                raise HTTPException(status_code=502, detail="Errore provider meteo")

            current = wx_data.get("current", {})

            # Normalizzazione
            raw_soil = current.get("soil_moisture_0_to_7cm")
            soil_pct = min(100.0, max(0.0, (raw_soil or 0.0) * 100))

            raw_rad = current.get("shortwave_radiation")
            light_lux = (raw_rad or 0.0) * 120.0

            return {
                "status": "success",
                "location": {"name": location_name, "lat": lat, "lng": lon},
                "temp": current.get("temperature_2m", 20.0),
                "humidity": current.get("relative_humidity_2m", 50.0),
                "rainNext24h": current.get("rain", 0.0),
                "soil_moisture": round(soil_pct, 1),
                "light": round(light_lux, 0)
            }

        except Exception as e:
            logger.exception(f" Eccezione Meteo: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Errore recupero meteo: {str(e)}")

    async def _fetch_coords_from_name(self, query):
        """Geocoding: Nome -> Coordinate"""
        try:
            url = "https://geocoding-api.open-meteo.com/v1/search"
            params = {"name": query, "count": 1, "language": "it", "format": "json"}
            async with httpx.AsyncClient() as client:
                res = await client.get(url, params=params, timeout=5.0)
                data = res.json()
                if data.get("results"):
                    return data["results"][0]
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
        return None

    async def _fetch_name_from_coords(self, lat, lon):
        """ Reverse Geocoding: Coordinate -> Nome Città"""
        try:
            url = "https://api.bigdatacloud.net/data/reverse-geocode-client"
            params = {
                "latitude": lat,
                "longitude": lon,
                "localityLanguage": "it"
            }
            async with httpx.AsyncClient() as client:
                res = await client.get(url, params=params, timeout=3.0)
                data = res.json()
                return data.get("city") or data.get("locality") or data.get("principalSubdivision")
                
        except Exception as e:
            logger.error(f"Reverse Geocoding error: {e}")
            return None

weatherController = WeatherController()