"""
Controller per la pipeline di processing.
"""

import logging
from datetime import datetime
from fastapi import HTTPException
from pipeline.pipeline_manager import PipelineManager
from models.pipelineModel import (
    PipelineRequest, 
    PipelineResponse,
    IrrigationSuggestion,
    PipelineDetailsResponse,
    PipelineMetadataResponse,
    HealthCheckResponse
)


logger = logging.getLogger(__name__)


class PipelineController:
    """
    Controller per gestire le richieste alla pipeline.
    """
    
    SUPPORTED_PLANTS = ["tomato", "lettuce", "basil", "pepper", "cucumber", "generic"]
    
    def __init__(self):
        logger.info("✅ PipelineController inizializzato")
        
    def process_sensor_data(self, request: PipelineRequest) -> PipelineResponse:
        """
        Processa dati sensori attraverso la pipeline.
        """
        try:
            # Valida plant_type
            if request.plant_type not in self.SUPPORTED_PLANTS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Tipo pianta '{request.plant_type}' non supportato. "
                           f"Supportati: {', '.join(self.SUPPORTED_PLANTS)}"
                )
            
            logger.info(f"Inizio processing per pianta: {request.plant_type}")
            started_at = datetime.utcnow().isoformat()
            
            # Converti SensorDataInput a dict
            sensor_data = request.sensor_data.model_dump()

            if request.soil_type:
                # La pipeline leggerà il campo 'soil' direttamente da qui
                sensor_data["soil"] = request.soil_type.lower()
            
            # Crea pipeline manager per questo tipo di pianta
            pipeline = PipelineManager(plant_type=request.plant_type)
            
            # Esegui pipeline
            result = pipeline.process(sensor_data)
            
            logger.info(f"Processing completato con successo per {request.plant_type}")

            # Estrai il dizionario 'details'
            details_dict = result.get("details", {})
            
            # Estrai suggerimenti da details (che contiene il campo frequency_estimation generato da ActionGenerator)
            suggestions = details_dict.get("full_suggestions", {})
            main_action = suggestions.get("main_action", {})
            timing_info = suggestions.get("timing", {})
            
            #Struttura la risposta con PipelineResponse
            return PipelineResponse(
                status=result.get("status", "success"),
                suggestion=IrrigationSuggestion(
                    should_water=main_action.get("action") == "irrigate",
                    water_amount_liters=main_action.get("water_amount_liters", 0.0),
                    decision=main_action.get("decision", ""),
                    description=main_action.get("description", ""),
                    timing=timing_info.get("suggested_time", ""), 
                    priority=suggestions.get("priority", "medium"),
                    frequency_estimation=suggestions.get("frequency_estimation"),
                    fertilizer_estimation=suggestions.get("fertilizer_estimation")
                ),
                details=PipelineDetailsResponse(
                    cleaned_data=details_dict.get("cleaned_data"),
                    features=details_dict.get("features"),
                    estimation=details_dict.get("estimation"),
                    anomalies=details_dict.get("anomalies", []),
                    full_suggestions=suggestions
                ),
                metadata=PipelineMetadataResponse(
                    started_at=result.get("metadata", {}).get("started_at"),
                    completed_at=result.get("metadata", {}).get("completed_at"),
                    errors=result.get("metadata", {}).get("errors", []),
                    warnings=result.get("metadata", {}).get("warnings", []),
                    stage_results=result.get("metadata", {}).get("stage_results", {})
                )
            )
            
        except HTTPException:
            raise
        except ValueError as e:
            logger.warning(f"Dati non validi: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Dati sensori non validi: {str(e)}"
            )
        except Exception as e:
            logger.exception(f"Errore imprevisto durante processing: {str(e)}")
            return PipelineResponse(
                status="error",
                suggestion=None,
                details=None,
                metadata=PipelineMetadataResponse(
                    started_at=started_at,
                    completed_at=datetime.utcnow().isoformat(),
                    errors=[str(e)],
                    warnings=[]
                )
            )
    
    def get_health_check(self) -> HealthCheckResponse:
        return HealthCheckResponse(
            status="healthy",
            pipeline_available=True,
            supported_plants=self.SUPPORTED_PLANTS,
            timestamp=datetime.utcnow().isoformat()
        )