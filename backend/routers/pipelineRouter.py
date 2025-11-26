"""
Router API per la pipeline di processing.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any
from models.pipelineModel import (
    PipelineRequest,
    PipelineResponse,
    HealthCheckResponse,
    SensorDataInput
)
from controllers.pipelineController import PipelineController


# Inizializza router
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# Inizializza controller
controller = PipelineController()


@router.post("/process", response_model=PipelineResponse, summary="Processa dati sensori")
async def process_sensor_data(request: PipelineRequest):
    """
    Processa dati sensori attraverso la pipeline completa.
    
    La pipeline esegue:
    1. **Data Validation**: Pulisce e valida i dati
    2. **Feature Engineering**: Calcola feature derivate (SWRF, VPD, AWC)
    3. **Estimation**: Applica regole di irrigazione specifiche per la pianta
    4. **Anomaly Detection**: Rileva condizioni anomale
    5. **Action Generation**: Genera suggerimenti finali (Irrigazione e Concimazione)
    
    Args:
        request: Dati sensori, tipo pianta e tipo terreno
        
    Returns:
        Suggerimento irrigazione con dettagli completi
    """
    return controller.process_sensor_data(request)


@router.post("/suggest", summary="Suggerimento rapido (alias)")
async def suggest_irrigation(sensor_data: SensorDataInput, plant_type: str = "generic"):
    """
    Endpoint semplificato per ottenere solo il suggerimento principale.
    
    Args:
        sensor_data: Dati dai sensori
        plant_type: Tipo di pianta (default: generic)
        
    Returns:
        Suggerimento irrigazione semplificato
    """
    request = PipelineRequest(sensor_data=sensor_data, plant_type=plant_type)
    result = controller.process_sensor_data(request)
    
    # Ritorna solo il suggerimento principale
    return {
        "status": result.status,
        "suggestion": result.suggestion
    }


@router.get("/health", response_model=HealthCheckResponse, summary="Health check")
async def health_check():
    """
    Verifica stato del servizio pipeline.
    
    Returns:
        Stato del servizio e piante supportate
    """
    return controller.get_health_check()


@router.get("/plants", summary="Lista piante supportate")
async def list_supported_plants():
    """
    Lista dei tipi di pianta supportati dalla pipeline.
    
    Returns:
        Lista di tipi pianta con descrizione agronomica e range di umidità.
    """
    return {
        "plants": [
            {
                "id": "tomato",
                "name": "Pomodoro",
                "description": "Solanacea esigente. Richiede un suolo costantemente umido per lo sviluppo dei frutti, ma teme i ristagni che causano marciumi.",
                "optimal_moisture": "60-80%"
            },
            {
                "id": "potato",
                "name": "Patata",
                "description": "Tubero sensibile. Necessita di terreno fresco e umido per l'ingrossamento, ma l'eccesso d'acqua favorisce malattie fungine.",
                "optimal_moisture": "60-75%"
            },
            {
                "id": "pepper",
                "name": "Peperone",
                "description": "Simile al pomodoro ma più sensibile allo stress idrico. Richiede irrigazioni frequenti ma senza ristagni al colletto.",
                "optimal_moisture": "55-75%"
            },
            {
                "id": "peach",
                "name": "Pesca / Pesco",
                "description": "Albero da frutto con radici profonde. Tollera brevi periodi secchi meglio delle erbacee, ma richiede acqua abbondante in fase di fruttificazione.",
                "optimal_moisture": "55-70%"
            },
            {
                "id": "grape",
                "name": "Uva / Vite",
                "description": "Coltura resistente e rustica. Preferisce suoli tendenzialmente asciutti; l'eccesso idrico riduce la qualità dell'uva e favorisce malattie.",
                "optimal_moisture": "30-50%"
            },
            {
                "id": "generic",
                "name": "Generica",
                "description": "Strategia bilanciata per piante non specificate. Mantiene un livello di umidità medio standard.",
                "optimal_moisture": "50-70%"
            }
        ]
    }