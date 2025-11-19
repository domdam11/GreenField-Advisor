import React, { useEffect, useState, useMemo } from 'react';
import {Droplets, CloudRain, Thermometer, RefreshCw, CheckCircle, Brain, AlertCircle, Clock, MapPin, X, Activity, Wind, SunMedium, Leaf
} from 'lucide-react';
import { api } from '../api/axiosInstance';



const statusPill = (rec) => {
    switch (rec) {
        case 'irrigate_today':
            return { text: 'Irriga oggi', cls: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200' };
        case 'irrigate_tomorrow':
            return { text: 'Irriga domani', cls: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200' };
        case 'skip':
            return { text: 'Non irrigare', cls: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-200' };
        default:
            return { text: 'Calcolo in corso…', cls: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-200' };
    }
};

const fmtDate = (dateString) => {
    if (!dateString) return '—';
    try {
        const d = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z');
        return d.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '—';
    }
};

const fmtLastWatered = (dateString) => {
    if (!dateString) return 'Mai irrigata';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Oggi';
        if (diffDays === 1) return 'Ieri';
        return `${diffDays} giorni fa`;
    } catch {
        return '—';
    }
};

const MetricBox = ({ icon: Icon, label, value, iconClass = '' }) => (
    <div className="bg-gray-50 rounded-lg px-4 py-3 h-[78px] flex flex-col justify-between">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Icon className={`h-4 w-4 ${iconClass}`} />
            <span className="font-medium">{label}</span>
        </div>
        <div className="text-gray-900 font-semibold">
            {value ?? '—'}
        </div>
    </div>
);

const Row = ({ label, value }) => (
    <div className="flex items-center justify-between text-sm py-1.5">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900 font-medium">{value ?? '—'}</span>
    </div>
);

const Badge = ({ children, color = 'gray' }) => {
    const map = {
        gray: 'bg-gray-100 text-gray-800',
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        amber: 'bg-amber-100 text-amber-800',
        teal: 'bg-teal-100 text-teal-800',
        purple: 'bg-purple-100 text-purple-800'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>
      {children}
    </span>
    );
};


const AIIrrigationCard = ({
                              plant,
                              imageUrl,          // opzionale: override immagine
                              sensors = {},
                              weather = {},
                              // modalità controllata:
                              recommendation,
                              loadingExternal,
                              onAskAdvice,
                              onRefreshWeather, // aggiorna meteo (se non passato → fallback a onAskAdvice/self)
                          }) => {
    const isControlled =
        typeof recommendation !== 'undefined' ||
        typeof loadingExternal !== 'undefined' ||
        typeof onAskAdvice === 'function';

    const [loadingInternal, setLoadingInternal] = useState(false);
    const [error, setError] = useState(null);
    const [resultInternal, setResultInternal] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const isLoading = isControlled ? !!loadingExternal : loadingInternal;
    const effectiveResult = isControlled ? recommendation : resultInternal;

    const [showIrrigModal, setShowIrrigModal] = useState(false);

    const [irrigForm, setIrrigForm] = useState({
        liters: '',
        executedAt: new Date().toISOString().slice(0, 16), // precompilato con ora corrente
        notes: '',
    });

    const handleAddIrrigation = async () => {
        const litersNum = Number(irrigForm.liters);
        if (!litersNum || litersNum <= 0) return alert('Inserisci litri validi (> 0)');

        const payload = {
            type: 'irrigazione',
            status: 'done',
            liters: litersNum,
            executedAt: new Date(irrigForm.executedAt).toISOString(),
            notes: irrigForm.notes || undefined,
        };

        try {
            await api.post(`/api/piante/${plant.id}/interventi`, payload);
            setShowIrrigModal(false);
            if (typeof onRefreshWeather === 'function') {
                onRefreshWeather(plant); // ricarica dati
            }
        } catch (e) {
            console.error('Errore irrigazione:', e);
            alert('Errore nel salvataggio irrigazione');
        }
    };

    // Weather effettivo
    const effectiveWeather = useMemo(() => {
        if (weather && (typeof weather.temp === 'number' || typeof weather.rainNext24h === 'number')) {
            return weather;
        }
        if (effectiveResult?.weather && (typeof effectiveResult.weather.temp === 'number' || typeof effectiveResult.weather.rainNext24h === 'number')) {
            return effectiveResult.weather;
        }
        if (effectiveResult?.meta?.weather) {
            return effectiveResult.meta.weather;
        }
        if (effectiveResult?._debug?.weather) {
            return effectiveResult._debug.weather;
        }
        return {};
    }, [weather, effectiveResult]);

    // self fetch se non controllata
    useEffect(() => {
        if (!isControlled && plant?.id) {
            (async () => {
                await fetchSelf();
            })();
        }

    }, [plant?.id, isControlled]);

    const fetchSelf = async () => {
        if (!plant?.id) return;
        setLoadingInternal(true);
        setError(null);
        try {
            const { data } = await api.post(`/api/piante/${plant.id}/ai/irrigazione`, {});
            setResultInternal(data);
        } catch (err) {
            console.error('Errore API irrigazione:', err);
            setError('Errore nel calcolo della previsione. Riprova.');
        } finally {
            setLoadingInternal(false);
        }
    };

    const handleOpenDetails = () => setDetailsOpen(true);
    const handleCloseDetails = () => setDetailsOpen(false);

    const handleRefreshWeather = () => {
        // Aggiorna meteo (e raccomandazione): ri-usa onRefreshWeather oppure onAskAdvice
        if (typeof onRefreshWeather === 'function') {
            onRefreshWeather(plant);
        } else if (typeof onAskAdvice === 'function') {
            onAskAdvice(plant);
        } else {
            fetchSelf();
        }
    };



    const pill = statusPill(effectiveResult?.recommendation);
    const hasGeo = !!(plant?.geoLat && plant?.geoLng);

    // Metrics
    const tempValue =
        typeof effectiveWeather?.temp === 'number' ? `${effectiveWeather.temp}°C` : '—';

    const humidityValue =
        typeof effectiveWeather?.humidity === 'number'
            ? `${Math.round(effectiveWeather.humidity)}%`
            : '—';

    const rainValue =
        typeof effectiveWeather?.rainNext24h === 'number'
            ? `${(+effectiveWeather.rainNext24h).toFixed(1)}mm`
            : '0mm';

    // Umidità suolo: prima soilMoisture0to7cm, poi soilMoistureApprox
    const soilRaw = (effectiveWeather?.soilMoisture0to7cm ?? effectiveWeather?.soilMoistureApprox);
    const soilValue = Number.isFinite(soilRaw) ? `${Math.round(soilRaw)}%` : '—';

    // Meta avanzato
    const meta = effectiveResult?.meta || {};
    const metaWx = meta.weather || {};
    const metaProf = meta.profile || {};
    const metaSources = meta.sources || {};
    const metaGeo = meta.geo || {};

    // ET0 per "inputs sintetici": prova prima dai signals, poi da meta.weather
    const et0Signal = typeof effectiveResult?.signals?.et0 === 'number'
        ? effectiveResult.signals.et0
        : (typeof metaWx?.et0 === 'number' ? metaWx.et0 : undefined);

    return (
        <>
            {/* CARD */}
            <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 p-4 md:p-5 h-full">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 h-full">
                    {/* Media */}
                    <div className="md:col-span-4 lg:col-span-3">
                        <div className="relative w-full aspect-[4/3] md:h-full md:aspect-auto rounded-xl overflow-hidden">
                            <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
  <Leaf className="h-16 w-16 text-green-600 opacity-50" />
</div>
                        </div>
                    </div>
                    {showIrrigModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                                <div className="p-4 border-b">
                                    <h3 className="text-lg font-bold">Registra Irrigazione</h3>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm mb-1">Litri</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={irrigForm.liters}
                                            onChange={(e) =>
                                                setIrrigForm({ ...irrigForm, liters: e.target.value })
                                            }
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Es. 1.5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Data/ora (eseguito)</label>
                                        <input
                                            type="datetime-local"
                                            value={irrigForm.executedAt}
                                            onChange={(e) =>
                                                setIrrigForm({ ...irrigForm, executedAt: e.target.value })
                                            }
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Note (opzionale)</label>
                                        <textarea
                                            rows={2}
                                            value={irrigForm.notes}
                                            onChange={(e) =>
                                                setIrrigForm({ ...irrigForm, notes: e.target.value })
                                            }
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                                            placeholder="Note sull'irrigazione..."
                                        />
                                    </div>
                                </div>
                                <div className="p-4 border-t flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowIrrigModal(false)}
                                        className="px-4 py-2 border rounded-lg"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        onClick={handleAddIrrigation}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Salva
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="md:col-span-8 lg:col-span-9 flex flex-col min-h-[200px]">
                        {/* Header riga 1 */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                                        {plant?.name || 'Pianta senza nome'}
                                    </h3>
                                    {effectiveResult?.recommendation ? (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${pill.cls}`}>
                      <Droplets className="h-4 w-4 mr-1.5" />
                                            {pill.text}
                    </span>
                                    ) : (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${pill.cls}`}>
                      <Brain className="h-4 w-4 mr-1.5" />
                                            {pill.text}
                    </span>
                                    )}
                                </div>

                                <div className="mt-1 text-gray-600 flex items-center gap-3 flex-wrap">
                                    <span className="truncate">{plant?.species || 'Specie n/d'}</span>
                                    {plant?.addressLocality || plant?.addressCountry ? (
                                        <span className="flex items-center gap-1.5 text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">
                        {plant?.addressLocality
                            ? `${plant.addressLocality}${plant.addressCountry ? ', ' + plant.addressCountry : ''}`
                            : plant?.addressCountry}
                      </span>
                    </span>
                                    ) : null}
                                </div>
                            </div>

                            {/* Azione: APRE LA SCHEDA */}
                            <button
                                onClick={handleOpenDetails}
                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Dettagli consiglio
                            </button>
                        </div>

                        {/* Avviso posizione mancante */}
                        {!hasGeo && (
                            <div className="mt-3 flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <MapPin className="h-4 w-4 mt-0.5" />
                                <p className="text-sm">
                                    La pianta non ha una posizione salvata: i consigli sono meno precisi (niente meteo).
                                </p>
                            </div>
                        )}

                        {/* Loading */}
                        {isLoading && (
                            <div className="flex items-center justify-center flex-1 py-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Analizzando dati…</span>
                            </div>
                        )}

                        {/* Error */}
                        {!isLoading && error && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    <p className="text-red-700 text-sm">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Corpo con metriche sintetiche */}
                        {!isLoading && !error && (
                            <>
                                {effectiveResult?.reason && (
                                    <p className="mt-3 text-gray-700 leading-relaxed line-clamp-2">
                                        {effectiveResult.reason}
                                    </p>
                                )}

                                {/* Metrics sintetiche */}
                                <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
                                    <MetricBox
                                        icon={Thermometer}
                                        label="Temperatura"
                                        value={tempValue}
                                        iconClass="text-orange-600"
                                    />
                                    <MetricBox
                                        icon={Droplets}
                                        label="Umidità aria"
                                        value={humidityValue}
                                        iconClass="text-teal-600"
                                    />
                                    <MetricBox
                                        icon={CloudRain}
                                        label="Pioggia 24h"
                                        value={rainValue}
                                        iconClass="text-blue-600"
                                    />
                                    <MetricBox
                                        icon={Droplets}
                                        label="Umidità suolo"
                                        value={soilValue}
                                        iconClass="text-blue-600"
                                    />
                                    <MetricBox
                                        icon={Clock}
                                        label="Ultima irrigazione"
                                        value={fmtLastWatered(plant?.lastWateredAt)}
                                        iconClass="text-gray-600"
                                    />
                                </div>

                                {/* Azioni in card (QUI: aggiunto "Aggiorna meteo") */}
                                <div className="mt-5 flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setIrrigForm({
                                                liters: '',
                                                executedAt: new Date().toISOString().slice(0, 16),
                                                notes: '',
                                            });
                                            setShowIrrigModal(true);
                                        }}
                                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="h-5 w-5" />
                                        Registra irrigazione ora
                                    </button>

                                    <button
                                        onClick={handleRefreshWeather}
                                        disabled={isLoading}
                                        className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium inline-flex items-center gap-2"
                                        title="Aggiorna meteo (temperatura, umidità aria, pioggia, suolo)"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                        Aggiorna meteo
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* DRAWER & SCHEDA DETTAGLI */}
            {detailsOpen && (
                <>
                    {/* overlay */}
                    <div
                        className="fixed inset-0 bg-black/40 z-40"
                        onClick={handleCloseDetails}
                    />
                    {/* panel */}
                    <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
                        {/* header */}
                        <div className="px-5 py-4 border-b flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Dettagli consiglio – {plant?.name || plant?.species || 'Pianta'}
                                </h3>
                            </div>
                            <button
                                onClick={handleCloseDetails}
                                className="p-2 rounded-md hover:bg-gray-100"
                                aria-label="Chiudi"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>

                        {/* content */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">


                            {/* stato */}
                            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${pill.cls}`}>
                  <Droplets className="h-4 w-4 mr-1.5" />
                    {pill.text}
                </span>
                                {effectiveResult?.nextDate && (
                                    <span className="text-sm text-gray-600">
                    Prossima suggerita: <span className="font-semibold text-gray-900">{fmtDate(effectiveResult.nextDate)}</span>
                  </span>
                                )}
                            </div>

                            {/* reason */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-1">Motivazione</h4>
                                <p className="text-gray-800">
                                    {effectiveResult?.reason || '—'}
                                </p>
                            </div>

                            {/* metriche principali */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">Meteo & Suolo</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <MetricBox icon={Thermometer} label="Temperatura" value={tempValue} iconClass="text-orange-600" />
                                    <MetricBox icon={Droplets} label="Umidità aria" value={humidityValue} iconClass="text-teal-600" />
                                    <MetricBox icon={CloudRain} label="Pioggia 24h" value={rainValue} iconClass="text-blue-600" />
                                    <MetricBox icon={Droplets} label="Umidità suolo" value={soilValue} iconClass="text-blue-600" />
                                </div>
                            </div>

                            {/* Dettagli tecnici (fuzzy) */}
                            {effectiveResult?.tech && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Dettagli tecnici (fuzzy)</h4>

                                    {/* Inputs sintetici */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-gray-500">Giorni dall'ultima</div>
                                            <div className="font-semibold text-gray-900">{effectiveResult.signals?.daysSinceLast ?? '—'}</div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-gray-500">Intervallo (baseline)</div>
                                            <div className="font-semibold text-gray-900">{effectiveResult.signals?.baselineInterval ?? '—'} gg</div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-gray-500">Pioggia 24h</div>
                                            <div className="font-semibold text-gray-900">
                                                {typeof effectiveResult.signals?.rainNext24h === 'number' ? `${effectiveResult.signals.rainNext24h.toFixed(1)} mm` : '—'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-gray-500">Temp aria</div>
                                            <div className="font-semibold text-gray-900">
                                                {typeof effectiveResult.signals?.temp === 'number' ? `${effectiveResult.signals.temp}°C` : '—'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-gray-500">Umidità suolo</div>
                                            <div className="font-semibold text-gray-900">
                                                {typeof effectiveResult.signals?.soilMoisture === 'number' ? `${Math.round(effectiveResult.signals.soilMoisture)}%` : '—'}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded p-3">
                                            <div className="text-gray-500">ET0</div>
                                            <div className="font-semibold text-gray-900">
                                                {typeof et0Signal === 'number' ? `${et0Signal.toFixed(2)} mm/g` : '—'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Membership principali (top-2 per gruppo) */}
                                    <div className="mb-4">
                                        <h5 className="text-xs font-semibold text-gray-600 mb-2">Membership (valori fuzzy)</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            {["soil","rain","ratio","temp","et0"].map(group => {
                                                const g = effectiveResult.tech?.memberships?.[group] || {};
                                                const entries = Object.entries(g).sort((a,b) => b[1]-a[1]).slice(0,2);
                                                if (!entries.length) return null;
                                                return (
                                                    <div key={group} className="bg-gray-50 rounded p-3">
                                                        <div className="text-gray-500 capitalize mb-1">{group}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {entries.map(([k,v]) => (
                                                                <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                                  {k}: <span className="ml-1 font-semibold">{v.toFixed(2)}</span>
                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Regole attive */}
                                    <div className="mb-4">
                                        <h5 className="text-xs font-semibold text-gray-600 mb-2">Regole attive</h5>
                                        <div className="space-y-2">
                                            {(effectiveResult.tech.rules || []).map((r) => (
                                                <div key={r.id} className="flex items-start justify-between bg-white border rounded p-3">
                                                    <div>
                                                        <div className="text-sm font-semibold">
                                                            {r.id} → <span className="uppercase">{r.action}</span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">{r.because}</div>
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        w = {r.weight.toFixed(2)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>



                                    {/* Punteggi per azione */}
                                    <div className="mb-6">
                                        <h5 className="text-xs font-semibold text-gray-600 mb-2">Punteggio azioni</h5>
                                        <div className="space-y-2">
                                            {["irrigate_today","irrigate_tomorrow","skip"].map(a => {
                                                const w = effectiveResult.tech?.actionScores?.[a] ?? 0;
                                                return (
                                                    <div key={a}>
                                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                                            <span className="uppercase">{a}</span>
                                                            <span>{w.toFixed(2)}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-gray-200 rounded">
                                                            <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.round(w*100)}%` }} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/*  Spiegazione AI (LLM) */}
                            {effectiveResult?.explanationMeta?.usedLLM && effectiveResult?.explanationLLM && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Spiegazione AI (modello LLM)</h4>

                                    <div className="text-sm text-gray-600 mb-2">
                                        Modello: <span className="font-mono text-gray-900 font-semibold">{effectiveResult.explanationMeta.model}</span>
                                    </div>

                                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 border border-gray-200 rounded p-4 text-gray-800">
      {effectiveResult.explanationLLM}
    </pre>
                                </div>
                            )}

                            {/* Profilo coltura (FAO-like) */}
                            <div className="mt-6">
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Profilo coltura (FAO-like)</h4>
                                <div className="bg-gray-50 rounded p-3">
                                    <Row label="Kc (stadio)" value={typeof metaProf?.kcStage === 'number' ? metaProf.kcStage.toFixed(2) : metaProf?.kcStage ?? '—'} />
                                    <Row label="Profondità radici (Zr)" value={typeof metaProf?.zr === 'number' ? `${metaProf.zr} m` : metaProf?.zr ?? '—'} />
                                    <Row label="Quota RAW (p)" value={typeof metaProf?.p === 'number' ? metaProf.p.toFixed(2) : metaProf?.p ?? '—'} />
                                    <Row label="Tessitura suolo" value={metaProf?.soilTexture ?? '—'} />
                                    <Row label="Stadio normalizzato" value={metaProf?.stageNorm ?? '—'} />
                                    <Row label="Categoria (default usata)" value={metaProf?.categoryUsed ?? '—'} />
                                </div>
                            </div>

                            {/*  Meteo avanzato (aggregatore)  */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Meteo avanzato (aggregatore)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded p-3">
                                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                                            <Activity className="h-4 w-4 text-purple-600" />
                                            <span>ET0 stimata</span>
                                        </div>
                                        <div className="text-gray-900 font-semibold">
                                            {typeof metaWx?.et0 === 'number' ? `${metaWx.et0.toFixed(2)} mm/g` : '—'}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded p-3">
                                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                                            <SunMedium className="h-4 w-4 text-amber-600" />
                                            <span>Radiazione solare</span>
                                        </div>
                                        <div className="text-gray-900 font-semibold">
                                            {typeof metaWx?.solarRadiation === 'number' ? `${metaWx.solarRadiation.toFixed(1)} MJ/m²·g` : '—'}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded p-3">
                                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                                            <Wind className="h-4 w-4 text-teal-600" />
                                            <span>Vento</span>
                                        </div>
                                        <div className="text-gray-900 font-semibold">
                                            {typeof metaWx?.wind === 'number' ? `${metaWx.wind.toFixed(1)} m/s` : '—'}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded p-3">
                                        <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                                            <CloudRain className="h-4 w-4 text-blue-600" />
                                            <span>Precipitazioni (giorno)</span>
                                        </div>
                                        <div className="text-gray-900 font-semibold">
                                            {typeof metaWx?.precipDaily === 'number' ? `${metaWx.precipDaily.toFixed(1)} mm` : '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    Fonte aggregata: <Badge color="purple">{metaWx?.source || '—'}</Badge>
                  </span>
                                </div>
                            </div>

                            {/*  Fonti dati */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Origine dati (fonti)</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Badge color={metaSources?.nasa ? 'blue' : 'gray'}>
                                        NASA POWER {metaSources?.nasa ? '✓' : '—'}
                                    </Badge>
                                    <Badge color={metaSources?.openmeteo ? 'green' : 'gray'}>
                                        Open-Meteo {metaSources?.openmeteo ? '✓' : '—'}
                                    </Badge>
                                    <Badge color={metaSources?.soil ? 'amber' : 'gray'}>
                                        Copernicus Soil {metaSources?.soil ? '✓' : '—'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Geo  */}
                            {(metaGeo?.lat && metaGeo?.lng) ? (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-800 mb-1">Posizione</h4>
                                    <div className="text-sm text-gray-600">
                                        Lat: <span className="text-gray-900 font-medium">{metaGeo.lat}</span> — Lng: <span className="text-gray-900 font-medium">{metaGeo.lng}</span>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="px-5 py-4 border-t flex items-center gap-3">
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default AIIrrigationCard;