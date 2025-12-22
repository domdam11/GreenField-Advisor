import logging
import numpy as np
from PIL import Image
import tensorflow as tf
from io import BytesIO
import os
import json

logger = logging.getLogger(__name__)

class PlantClassifierCNN:
    _instance = None
    _model = None
    _classes = {}

    IMG_SIZE = (224, 224) 
    
    # Percorsi relativi
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODEL_PATH = os.path.join(BASE_DIR, "models/plant_disease_model.h5")
    CLASSES_PATH = os.path.join(BASE_DIR, "models/disease_classes.json")

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PlantClassifierCNN, cls).__new__(cls)
            cls._instance._load_resources()
        return cls._instance

    def _load_resources(self):
        if self._model is None:
            try:
                if os.path.exists(self.CLASSES_PATH):
                    with open(self.CLASSES_PATH, 'r') as f:
                        self._classes = {int(k): v for k, v in json.load(f).items()}
                
                if os.path.exists(self.MODEL_PATH):
                    self._model = tf.keras.models.load_model(self.MODEL_PATH)
                    logger.info(f"Modello caricato ({len(self._classes)} classi).")
                else:
                    logger.warning("Modello non trovato.")
            except Exception as e:
                logger.error(f"Errore caricamento IA: {e}")

    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        img = Image.open(BytesIO(image_bytes))
        if img.mode != 'RGB': img = img.convert('RGB')
        img = img.resize(self.IMG_SIZE)
        img_array = tf.keras.preprocessing.image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        return img_array / 255.0

    def predict_health(self, image_bytes: bytes, plant_context: str = None):
        """
        Analizza l'immagine. 
        Se 'plant_context' è fornito (es. 'tomato'), filtra i risultati per considerare SOLO quella specie.
        """
        if self._model is None:
            return {"label": "Errore", "confidence": 0.0, "advice": "Modello non disponibile."}

        try:
            processed = self.preprocess_image(image_bytes)
            predictions = self._model.predict(processed)[0] # Array di probabilità
            
            #LOGICA DI FILTRO (MASKING)
            if plant_context and plant_context.lower() != "generic":
                # Cerchiamo quali indici corrispondono alla pianta selezionata (es. "tomato")
                target = plant_context.lower()
                
                # Mappatura manuale se i nomi non coincidono perfettamente (opzionale)
                if "pomodoro" in target: target = "tomato"
                if "patata" in target: target = "potato"
                if "peperone" in target or "pepper" in target: target = "pepper"
                if "pesca" in target: target = "peach"
                if "uva" in target or "vite" in target: target = "grape"

                # Crea una maschera: metti a -1 (o 0) tutte le probabilità delle piante diverse
                filtered_preds = np.copy(predictions)
                
                for idx, label_name in self._classes.items():
                    if target not in label_name.lower():
                        filtered_preds[idx] = -1.0 

                
                if np.max(filtered_preds) > -0.5:
                    predictions = filtered_preds
                    logger.info(f"🔍 Filtro IA applicato per: {target}")

            # Trova la classe vincente (tra quelle rimaste)
            idx = np.argmax(predictions)
            confidence = float(predictions[idx])
            raw_label = self._classes.get(idx, "Sconosciuto")
            advice = self._get_advice(raw_label)
            clean_label = raw_label.replace("___", " - ").replace("_", " ")

            return {
                "label": clean_label,
                "confidence": confidence,
                "advice": advice
            }
            
        except Exception as e:
            logger.error(f"Errore predizione: {e}")
            raise e

    def _get_advice(self, raw_label):
        """Traduce le etichette in consigli."""
        l = raw_label.lower()
        
        if "healthy" in l:
            return "Pianta Sana. Continua così!"

        # POMODORO
        if "tomato" in l:
             if "bacterial" in l: return "Macchia Batterica: Rimuovi foglie, usa rame, evita bagnatura fogliare."
             if "late_blight" in l: return "Peronospora (Late Blight): Grave. Rimuovi parti nere, tratta subito con fungicidi."
             if "early_blight" in l: return "Alternaria: Macchie concentriche. Migliora ventilazione, usa rame."
             if "mold" in l: return "Muffa Fogliare: Troppa umidità. Ventila."
             if "mosaic" in l: return "Virus Mosaico: Isola la pianta immediatamente."
             if "spider" in l or "mite" in l: return "Ragnetto Rosso: Aumenta umidità, usa olio di Neem."

        # PATATA
        if "potato" in l:
             if "early_blight" in l: return "Alternaria: Fungicida rameico e rotazione colture."
             if "late_blight" in l: return "Peronospora: Rischio marciume tuberi. Tratta subito."

        # PEPERONE
        if "pepper" in l:
             if "bacterial" in l: return "Macchia Batterica: Rimuovi foglie infette. Rame."

        # PESCA
        if "peach" in l:
             if "bacterial" in l: return "Macchia Batterica: Trattamenti preventivi in autunno."

        # UVA
        if "grape" in l:
             if "black_rot" in l: return "Marciume Nero: Rimuovi grappoli colpiti."
             if "esca" in l: return "Mal dell'Esca: Disinfetta forbici."
             if "blight" in l: return "Seccume: Controlla ventilazione."

        return "Patologia rilevata. Controllare manualmente."

cnn_classifier = PlantClassifierCNN()