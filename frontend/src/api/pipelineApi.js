//La seguente componente viene creata al fine di isolare la logica della pipeline e la visualizzazione del risultato completo
//IN PARTICOLARE COSA FACCIAMO: Il seguente modulo gestisce l'interazione con l'Endpoint FastAPI

// src/api/pipelineApi.js
import { api } from "./axiosInstance"; // Usa la tua istanza axios autenticata

/**
 * Esegue la pipeline completa con dati sensore e tipo pianta.
 * Questo endpoint restituisce i suggerimenti, i dati puliti, le features e i log completi.
 * @param {object} sensorData - Dati grezzi dai sensori (soil_moisture, temperature, humidity, etc.)
 * @param {string} plantType - Tipo di pianta ('tomato', 'lettuce', 'generic', etc.)
 * @returns {Promise<object>} Il risultato completo della PipelineResponse (JSON)
 */
export async function processPipeline(sensorData, plantType = "generic") {
  const payload = {
    sensor_data: sensorData,
    plant_type: plantType,
  };

  // Chiama l'endpoint POST /api/pipeline/process
  const { data } = await api.post("/api/pipeline/process", payload);
  return data;
}

// Non serve esporre l'endpoint /suggest, usiamo solo il completo /process per il log.
