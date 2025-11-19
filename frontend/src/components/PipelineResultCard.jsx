//Questo componente renderizza la risposta JSON della pipeline in un formato leggibile (log delle decisioni).

// src/components/PipelineResultCard.jsx
import React from 'react';
import {
    Droplets, AlertTriangle, CheckCircle, Clock, Leaf, Thermometer, Zap, BarChart,
    Layers, CornerDownRight, X
} from 'lucide-react';

// Componente Card riutilizzabile
const Card = ({ children, title, icon: Icon, colorClass = 'text-gray-900', bgClass = 'bg-white' }) => (
    <div className={`${bgClass} p-6 rounded-xl shadow-lg border border-gray-100 space-y-4`}>
        <h3 className={`text-xl font-bold ${colorClass} flex items-center gap-2 border-b pb-2 mb-4`}>
            <Icon className="h-6 w-6" />
            {title}
        </h3>
        {children}
    </div>
);

// Componente riga dettaglio
const DetailRow = ({ label, value, unit, icon: Icon, iconColor = 'text-gray-500' }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-700">
            {Icon && <Icon className={`h-4 w-4 ${iconColor}`} />}
            <span>{label}</span>
        </div>
        <span className="font-semibold text-gray-900 text-sm">
            {/* Formatta numeri: se intero, nessuna cifra decimale, altrimenti 2 */}
            {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value || '—'} {unit}
        </span>
    </div>
);

// Badge Priorità
const PriorityBadge = ({ priority }) => {
    const map = {
        urgent: 'bg-red-500 text-white',
        high: 'bg-orange-500 text-white',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800',
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${map[priority] || 'bg-gray-100 text-gray-800'}`}>
            {priority}
        </span>
    );
};

export default function PipelineResultCard({ result, plantType }) {
    if (!result || result.status === 'error') {
        const errors = result?.metadata?.errors || [];
        return (
            <Card title="Errore Critico" icon={X} colorClass="text-red-700" bgClass="bg-red-50">
                <p>La pipeline ha riscontrato un errore fatale durante l'elaborazione.</p>
                {errors.length > 0 && (
                    <ul className="list-disc list-inside text-red-600">
                        {errors.map((e, i) => <li key={i} className="text-sm">{e}</li>)}
                    </ul>
                )}
            </Card>
        );
    }

    // Estrazione dati per chiarezza
    const { suggestion, details, metadata } = result;
    const cleanedData = details?.cleaned_data || {};
    const features = details?.features || {};
    const estimation = details?.estimation || {};
    const anomalies = details?.anomalies || [];
    const warnings = metadata?.warnings || [];

    return (
        <div className="space-y-6">

            {/* 1. RISULTATO OPERATIVO FINALE */}
            <Card title="Suggerimento Operativo Finale" icon={Droplets} colorClass={suggestion?.should_water ? 'text-blue-600' : 'text-green-600'} bgClass="bg-white">
                
                <div className={`p-4 rounded-lg ${suggestion?.should_water ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border space-y-3`}>
                    <div className="flex justify-between items-center">
                        <p className="text-lg font-bold">
                            {suggestion?.should_water ? '💧 Irrigare' : '✅ Non Irrigare'}
                        </p>
                        <PriorityBadge priority={suggestion?.priority} />
                    </div>

                    <p className="text-sm text-gray-700">{suggestion?.description}</p>
                    
                    <ul className="text-sm space-y-1 pt-2 border-t border-gray-100">
                        <li>
                            <strong className="text-gray-600">Quantità:</strong> 
                            <span className="ml-2 font-semibold text-blue-800">
                                {suggestion?.water_amount_liters?.toFixed(1) || 0} Litri
                            </span>
                        </li>
                        <li>
                            <strong className="text-gray-600">Timing Suggerito:</strong> 
                            <span className="ml-2 font-semibold">{suggestion?.timing || 'Adesso'}</span>
                        </li>
                    </ul>
                </div>
                <p className="text-xs italic text-gray-500">
                    Decisione finale generata dallo stage 'Action Generation'.
                </p>
            </Card>

            {/* 2. LOG: Dati Puliti e Dati Raw (Validation Stage) */}
            <Card title={`Log Dati (Input: ${plantType.toUpperCase()})`} icon={CheckCircle} colorClass="text-green-600">
                <h4 className="font-semibold text-gray-700 mt-2">Dati Puliti e Finali (Cleaned Data)</h4>
                {Object.entries(cleanedData).map(([key, value]) => (
                    <DetailRow
                        key={key}
                        label={key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1)}
                        value={value}
                        unit={key === 'soil_moisture' || key === 'humidity' ? '%' : key === 'temperature' ? '°C' : key === 'light' ? 'lux' : ''}
                        icon={Zap}
                        iconColor="text-teal-600"
                    />
                ))}
                
                {warnings.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="flex items-center gap-2 text-sm font-medium text-yellow-800"><AlertTriangle className="h-4 w-4" /> Warning di Validazione/Clamping:</h5>
                        <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                            {warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                )}
            </Card>

            {/* 3. LOG: Feature Calcolate (Feature Engineering Stage) */}
            <Card title="Log Features Derivate" icon={BarChart} colorClass="text-purple-600">
                {Object.entries(features).map(([key, value]) => (
                    <DetailRow
                        key={key}
                        label={key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1)}
                        value={value}
                        unit={key.includes('index') ? '/100' : key === 'irrigation_urgency' ? '/10' : key.includes('transpiration') || key.includes('deficit') ? 'mm' : ''}
                        icon={Zap}
                        iconColor="text-purple-600"
                    />
                ))}
            </Card>

            {/* 4. LOG: Stima e Anomalie */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 4A. Stima Irrigazione (Estimation Stage) */}
                <Card title="Log Stima Irrigazione" icon={Layers} colorClass="text-orange-600">
                    <p className="text-sm font-semibold text-gray-800">
                        Strategia Usata: <span className="uppercase">{estimation?.plant_type}</span>
                    </p>
                    <p className="text-sm text-gray-700 border-b pb-2">
                        <strong className="text-orange-600">Motivazione:</strong> {estimation?.reasoning}
                    </p>
                    <DetailRow label="Confidence" value={estimation?.confidence * 100} unit="%" icon={CornerDownRight} iconColor="text-orange-600" />
                    <DetailRow label="Quantità (ml)" value={estimation?.water_amount_ml} unit="ml" icon={CornerDownRight} iconColor="text-orange-600" />
                </Card>

                {/* 4B. Anomalie (Anomaly Detection Stage) */}
                <Card title="Anomalie Rilevate" icon={AlertTriangle} colorClass={anomalies.some(a => a.severity === 'critical') ? 'text-red-600' : 'text-gray-600'}>
                    {anomalies.length > 0 ? (
                        <ul className="space-y-3">
                            {anomalies.map((a, i) => (
                                <li key={i} className={`p-3 rounded-lg border ${a.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} text-sm`}>
                                    <div className={`font-bold uppercase ${a.severity === 'critical' ? 'text-red-700' : 'text-yellow-800'} flex items-center gap-2`}>
                                        <AlertTriangle className="h-4 w-4" /> {a.type} ({a.severity})
                                    </div>
                                    <p className="text-xs mt-1 text-gray-700">{a.message}</p>
                                    <p className="text-xs mt-1 font-medium text-gray-800">Raccomandazione: {a.recommendation}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">Nessuna anomalia rilevata nei dati o nelle features.</p>
                    )}
                </Card>
            </div>

            {/* 5. METADATA */}
            <Card title="Metadati Esecuzione" icon={Clock} colorClass="text-gray-600">
                <DetailRow label="Status" value={metadata.status} icon={CheckCircle} iconColor={metadata.status === 'success' ? 'text-green-600' : 'text-red-600'} />
                <DetailRow label="Inizio Elaborazione" value={new Date(metadata.started_at).toLocaleTimeString('it-IT')} icon={Clock} />
                <DetailRow label="Fine Elaborazione" value={new Date(metadata.completed_at).toLocaleTimeString('it-IT')} icon={Clock} />
                <DetailRow label="Tempo Totale (ms)" value={new Date(metadata.completed_at).getTime() - new Date(metadata.started_at).getTime()} unit="ms" icon={Thermometer} />
            </Card>

        </div>
    );
}