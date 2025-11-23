"""
Step 5: Action Suggestion Generator
Genera suggerimenti finali di azione basati su tutti i dati processati.
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
from .base import ProcessorBase, PipelineContext, PipelineStage


class ActionGenerator(ProcessorBase):
    
    def __init__(self):
        super().__init__("Action Generator")
        
    def _get_stage(self) -> PipelineStage:
        return PipelineStage.ACTION_GENERATION
        
    def _execute(self, context: PipelineContext) -> Dict[str, Any]:
        if not context.estimation:
            raise ValueError("Estimation non disponibile.")
        
        main_action = self._generate_main_action(context)
        secondary_actions = self._generate_secondary_actions(context)
        timing = self._suggest_timing(context)
        frequency_estimation = self._estimate_irrigation_frequency(context)
        
        # 🟢 Calcolo Concimazione
        fertilizer_estimation = self._estimate_fertilizer(context)
        
        notes = self._generate_notes(context)
        
        suggestions = {
            "main_action": main_action,
            "secondary_actions": secondary_actions,
            "timing": timing,
            "frequency_estimation": frequency_estimation,
            "fertilizer_estimation": fertilizer_estimation, 
            "notes": notes,
            "priority": self._calculate_priority(context),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        context.suggestions = suggestions
        return {"suggestions": suggestions}
        
    def _estimate_irrigation_frequency(self, context: PipelineContext) -> Dict[str, str]:
        # ... (Codice Irrigazione invariato - vedi sotto per copia completa se serve) ...
        features = context.features or {}
        et0 = features.get("evapotranspiration", 0) 
        swrf = features.get("soil_retention_factor", 1.0) 
        soil_desc = features.get("soil_behavior", "")

        if et0 > 0:
            base_days = max(1.0, 4.0 / et0) 
        else:
            base_days = 7.0 
            
        adjusted_days = base_days * swrf 

        if adjusted_days <= 1.5:
             detail = "Ogni 1-2 giorni"
             label = "ALTA"
        elif adjusted_days <= 3.0:
             detail = "Ogni 2-3 giorni"
             label = "MEDIA-ALTA"
        elif adjusted_days <= 5.0:
             detail = "Ogni 3-5 giorni"
             label = "MEDIA"
        else:
             detail = "Settimanale"
             label = "BASSA"
            
        reasoning = f"Frequenza basata su ET0 ({et0} mm/g) e Ritenzione Suolo ({swrf}x)."

        return {
            "label": label,
            "detail": detail,
            "icon": label.lower(),
            "reasoning": reasoning
        }

    # 🟢 FUNZIONE CONCIMAZIONE CORRETTA E POTENZIATA
    def _estimate_fertilizer(self, context: PipelineContext) -> Dict[str, str]:
        """
        Stima necessità di concimazione.
        Corretto per riconoscere meglio i tipi di pianta (Italiano/Inglese/ID).
        """
        # Recuperiamo il tipo pianta. Se la pipeline ha fatto il match, usiamo quello.
        # Altrimenti usiamo il raw input.
        plant_type_input = context.raw_data.get("plant_type", "generic").lower()
        
        # A volte il controller passa 'plant_type' ma altre volte potrebbe essere 'species' nel raw_data
        # Cerchiamo di essere robusti
        if plant_type_input == "generic" and "species" in context.raw_data:
             plant_type_input = str(context.raw_data["species"]).lower()

        soil_type = context.cleaned_data.get("soil", "universale").lower()
        
        # 1. Liste di Riconoscimento Ampliate (ID + Italiano + Inglese)
        high_feeders = [
            "tomato", "pomodoro", 
            "pepper", "peperone", 
            "cucumber", "cetriolo", 
            "zucchini", "zucchina", 
            "eggplant", "melanzana",
            "potato", "patata",
            "rose", "rosa",
            "citrus", "limone", "arancio"
        ]
        
        low_feeders = [
            "basil", "basilico", 
            "lettuce", "lattuga", "salad", "insalata",
            "succulent", "grassa", "cactus",
            "herb", "aromatica", "prezzemolo", "rosmarino", "salvia"
        ]
        
        # Check
        is_high_feeder = any(p in plant_type_input for p in high_feeders)
        is_low_feeder = any(p in plant_type_input for p in low_feeders)
        
        # 2. Logica Terreno (Keywords)
        is_sandy = "sabbioso" in soil_type or "sabbia" in soil_type
        is_clay = "argilloso" in soil_type or "argilla" in soil_type
        is_universal = "universale" in soil_type or "franco" in soil_type
        
        # 3. Definizione Base (Frequenza in giorni)
        if is_high_feeder:
            tipo = "NPK Ricco (es. 20-20-20) o Stallatico"
            base_freq = 14 # Ogni 2 settimane (standard per pomodori in crescita)
            desc_pianta = "Pianta esigente (High Feeder)."
        elif is_low_feeder:
            tipo = "Bilanciato Leggero (es. 5-5-5)"
            base_freq = 30 # Ogni mese
            desc_pianta = "Pianta poco esigente (Low Feeder)."
        else:
            # Caso Generic (Default 21 giorni)
            tipo = "Universale NPK"
            base_freq = 21 
            desc_pianta = "Fabbisogno standard."

        # 4. Modulazione Terreno
        if is_sandy:
            # Sabbia: dilava nutrienti -> concimare più spesso (x0.7)
            final_freq = max(7, int(base_freq * 0.7)) 
            advice = f"{desc_pianta} Terreno SABBIOSO: alto dilavamento. Dosi ridotte ma frequenti."
        elif is_clay:
            # Argilla: trattiene nutrienti -> concimare meno spesso (x1.4)
            final_freq = int(base_freq * 1.4)
            advice = f"{desc_pianta} Terreno ARGILLOSO: trattiene i sali. Concimare più raramente."
        else:
            final_freq = base_freq
            advice = f"{desc_pianta} Terreno equilibrato: frequenza standard."

        return {
            "frequency": f"Ogni {final_freq} giorni",
            "type": tipo,
            "reasoning": advice
        }

    def _generate_main_action(self, context: PipelineContext) -> Dict[str, Any]:
        estimation = context.estimation
        base_desc = self._get_action_description(estimation)
        
        return {
            "action": "irrigate" if estimation["should_water"] else "do_not_irrigate",
            "decision": estimation["decision"],
            "water_amount_ml": estimation["water_amount_ml"],
            "water_amount_liters": round(estimation["water_amount_ml"] / 1000, 2),
            "reasoning": estimation["reasoning"],
            "confidence": estimation["confidence"],
            "description": base_desc
        }
        
    def _get_action_description(self, estimation: Dict[str, Any]) -> str:
        if not estimation["should_water"]: return "Non irrigare. Il livello di umidità è sufficiente."
        l = estimation["water_amount_ml"] / 1000
        return f"Consigliata irrigazione di circa {l:.1f} litri."
        
    def _generate_secondary_actions(self, context: PipelineContext) -> List[Dict[str, Any]]:
        actions = []
        if context.features:
            if context.cleaned_data.get("temperature", 0) > 30:
                actions.append({"type": "preventive", "action": "Ombreggiare", "reason": "Caldo estremo"})
        return actions
        
    def _suggest_timing(self, context: PipelineContext) -> Dict[str, Any]:
        now = datetime.now()
        features = context.features or {}
        day_phase = features.get("day_phase", "unknown")
        
        if day_phase == "morning":
            suggested_time = "ora (mattino)"
        elif day_phase == "evening":
            suggested_time = "ora (sera)"
        else:
            suggested_time = "domani mattina o stasera"
            
        return {
            "suggested_time": suggested_time,
            "next_window": datetime.now().isoformat(),
            "current_phase": day_phase,
            "ideal_hours": ["06:00-09:00"]
        }
        
    def _generate_notes(self, context: PipelineContext) -> List[str]:
        return context.warnings
        
    def _calculate_priority(self, context: PipelineContext) -> str:
        urgency = context.features.get("irrigation_urgency", 0)
        if urgency >= 8: return "urgent"
        if urgency >= 5: return "high"
        return "medium"