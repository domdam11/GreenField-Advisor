//Questo componente gestisce l'input del form e chiama il servizio API, usando PipelineResultCard per la visualizzazione.

// src/pages/PipelineTestPage.jsx
import React, { useState } from 'react';
import { Brain, Droplets, Settings, RefreshCw, AlertTriangle } from 'lucide-react';
import { processPipeline } from '../api/pipelineApi';
import PipelineResultCard from '../components/PipelineResultCard';
import RequireAuth from '../components/RequireAuth';
import { Link } from 'react-router-dom';


const DEFAULT_INPUT = {
    soil_moisture: 45.0,
    temperature: 24.5,
    humidity: 62.0,
    light: 15000.0,
    rainfall: 0.0,
};

const SUPPORTED_PLANTS = ["tomato", "lettuce", "basil", "pepper", "cucumber", "generic"];


export default function PipelineTestPage() {
    // Stato per l'input dei sensori
    const [inputData, setInputData] = useState(DEFAULT_INPUT);
    const [plantType, setPlantType] = useState('tomato');
    
    // Stato per il risultato della pipeline
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Importante: convertire a numero
        setInputData(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleRunPipeline = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await processPipeline(inputData, plantType);
            setResult(res);
            // Verifica errori specifici del backend, anche se status è 'success'
            if (res.status === 'error' && res.metadata.errors.length > 0) {
                setError(res.metadata.errors.join(', ') || 'Errore sconosciuto durante il processing.');
            }
        } catch (err) {
            console.error('Errore esecuzione pipeline:', err);
            setError(err.response?.data?.detail || 'Errore di connessione o API');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setInputData(DEFAULT_INPUT);
        setPlantType('tomato');
        setResult(null);
        setError(null);
    };

    return (
        <RequireAuth>
            <div className="min-h-screen bg-green-50 pt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3">
                            <div className="bg-gradient-to-r from-green-600 to-teal-600 p-3 rounded-full">
                                <Settings className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    Pipeline Testing & Log Decisionale
                                </h1>
                                <p className="text-gray-600">
                                    Invia dati sensore e visualizza in dettaglio ogni step della pipeline.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Colonna Input Raw */}
                        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg h-fit sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Droplets className="h-5 w-5 text-green-600" /> Input Dati Sensore
                            </h2>

                            <div className="space-y-4">
                                {Object.keys(DEFAULT_INPUT).map((key) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                            {key.replace('_', ' ')}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name={key}
                                            value={inputData[key]}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder={`Valore per ${key.replace('_', ' ')}`}
                                        />
                                    </div>
                                ))}
                                
                                {/* Selezione Tipo Pianta */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo Pianta
                                    </label>
                                    <select
                                        value={plantType}
                                        onChange={(e) => setPlantType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    >
                                        {SUPPORTED_PLANTS.map(p => (
                                            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        La strategia di irrigazione dipende dal tipo di pianta.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleRunPipeline}
                                        disabled={loading}
                                        className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <RefreshCw className="h-5 w-5 animate-spin" /> Elaborazione...
                                            </>
                                        ) : (
                                            <>
                                                <Brain className="h-5 w-5" /> Esegui Pipeline
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                        title="Reset"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Colonna Risultati e Log */}
                        <div className="lg:col-span-2 space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                                    <div>
                                        <p className="text-red-700 font-medium">Errore di Esecuzione:</p>
                                        <p className="text-sm text-red-600 mt-1">{error}</p>
                                    </div>
                                </div>
                            )}

                            {result ? (
                                <PipelineResultCard result={result} plantType={plantType} />
                            ) : (
                                <div className="bg-white p-10 rounded-xl shadow-lg text-center text-gray-500">
                                    <Brain className="h-12 w-12 mx-auto mb-4" />
                                    <p>Inserisci i dati nel modulo a lato e clicca 'Esegui Pipeline' per visualizzare i risultati e i log decisionali.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-12 text-center text-sm text-gray-500">
                        <p>
                            Questo strumento di test è disponibile solo per utenti autenticati e non salva dati.
                        </p>
                    </div>

                </div>
            </div>
        </RequireAuth>
    );
}