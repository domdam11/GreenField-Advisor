import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Leaf, MapPin, Calendar, Info } from 'lucide-react';
import { api } from '../api/axiosInstance';
import PlaceAutocomplete from './PlaceAutocomplete';

export default function PlantFormModal({
  open,
  onClose,
  initialData = null,
  onSubmit,
  mode = 'create',
}) {
  const isEdit = mode === 'edit';

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [speciesQuery, setSpeciesQuery] = useState(initialData?.species || '');
  const [selectedSpecies, setSelectedSpecies] = useState(null);

  // Posizione (testo + geo)
  const [placeText, setPlaceText] = useState(initialData?.location || '');
  const [geo, setGeo] = useState(() => {
    if (!initialData) return null;
    const {
      geoLat, geoLng, placeId,
      addressLocality, addressAdmin2, addressAdmin1,
      addressCountry, addressCountryCode
    } = initialData;
    if (geoLat && geoLng) {
      return {
        lat: geoLat,
        lng: geoLng,
        placeId: placeId || null,
        addrParts: {
          locality: addressLocality || '',
          admin2: addressAdmin2 || '',
          admin1: addressAdmin1 || '',
          country: addressCountry || '',
          countryCode: addressCountryCode || ''
        }
      };
    }
    return null;
  });

  const [description, setDescription] = useState(initialData?.description || '');
  const [stage, setStage] = useState(initialData?.stage || '');

  //Errori form
  const [errors, setErrors] = useState({}); // { name, species, location, stage, description }

  //Trefle Search State
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Trefle Preview
  const [treflePreview, setTreflePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // Refs utili
  const dropdownRef = useRef(null);
  const abortRef = useRef(null);
  const cacheRef = useRef(new Map());         // cache query → risultati
  const previewCacheRef = useRef(new Map());  // cache trefleId → preview

  // click-outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    if (open && showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, showDropdown]);


  const debounce = (fn, delay) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  const normalizeSearchItem = (item) => ({
    trefleId: item?.trefleId ?? item?.id ?? null,
    trefleSlug: item?.trefleSlug ?? item?.slug ?? null,
    trefleScientificName: item?.trefleScientificName ?? item?.scientific_name ?? null,
    trefleCommonName: item?.trefleCommonName ?? item?.common_name ?? null,
    imageUrl: item?.imageUrl ?? item?.image_url ?? null,
    _label:
      item?.trefleCommonName || item?.common_name
        ? `${item?.trefleCommonName || item?.common_name} (${item?.trefleScientificName || item?.scientific_name || ''})`
        : (item?.trefleScientificName || item?.scientific_name || ''),
  });

  const performSearch = async (q) => {
    // cancelliamo la richiesta precedente
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const key = q.trim().toLowerCase();
    if (cacheRef.current.has(key)) {
      setResults(cacheRef.current.get(key));
      setShowDropdown(true);
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      const { data } = await api.get('/api/trefle/search', {
        params: { q },
        signal: ctrl.signal,
      });
      const arr = (Array.isArray(data) ? data : data?.data || [])
        .map(normalizeSearchItem)
        .slice(0, 8); // limita a 8
      cacheRef.current.set(key, arr);
      setResults(arr);
      setShowDropdown(true);
    } catch (e) {
      if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
        console.error('Trefle search error:', e);
        setSearchError('Errore durante la ricerca specie');
      }
    } finally {
      setSearching(false);
      setHighlightIndex(-1);
    }
  };

  const debouncedFetch = useMemo(
    () => debounce((q) => {
      if (!q || q.trim().length < 2) {
        setResults([]);
        setSearching(false);
        setSearchError(null);
        setShowDropdown(false);
        return;
      }
      performSearch(q);
    }, 600),
    []
  );

  // Ricerca (solo in create)
  useEffect(() => {
    if (!open) return;
    if (isEdit) return;
    if (isFocused) {
      debouncedFetch(speciesQuery);
    }
  }, [speciesQuery, open, isEdit, debouncedFetch, isFocused]);

  // Reset quando chiudi
  useEffect(() => {
    if (!open) {
      setResults([]);
      setShowDropdown(false);
      setSelectedSpecies(null);
      setTreflePreview(null);
      setSearchError(null);
      setPreviewError(null);
      setPreviewLoading(false);
      setHighlightIndex(-1);
      setErrors({});
      if (!isEdit) {
        setName('');
        setSpeciesQuery('');
        setPlaceText('');
        setGeo(null);
        setDescription('');
        setStage('');
      }
    }
  }, [open, isEdit]);

  const fetchTreflePreview = async (trefleId) => {
    if (!trefleId) return;

    if (previewCacheRef.current.has(trefleId)) {
      setTreflePreview(previewCacheRef.current.get(trefleId));
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      // Usa l'endpoint che hai nel backend: /api/trefle/species/{id}
      const { data } = await api.get(`/api/trefle/species/${trefleId}`);
      previewCacheRef.current.set(trefleId, data);
      setTreflePreview(data || null);
    } catch (e) {
      console.error('Trefle detail error:', e);
      setPreviewError('Impossibile caricare i dettagli Trefle');
      setTreflePreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSelectSpecies = (item) => {
    const norm = normalizeSearchItem(item);
    setSelectedSpecies(norm);
    setSpeciesQuery(norm._label || '');
    setShowDropdown(false);
    setErrors((prev) => ({ ...prev, species: null }));
    setHighlightIndex(-1);

    if (norm?.trefleId) {
      fetchTreflePreview(norm.trefleId);
    } else {
      setTreflePreview(null);
    }
  };

  // Navigazione con tastiera nella dropdown
  const handleSpeciesKeyDown = (e) => {
    if (isEdit) return;
    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((idx) => (idx + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((idx) => (idx <= 0 ? results.length - 1 : idx - 1));
    } else if (e.key === 'Enter') {
      if (highlightIndex >= 0 && highlightIndex < results.length) {
        e.preventDefault();
        handleSelectSpecies(results[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Validazione client
  const validate = () => {
    const next = {};

    if (!name || name.trim().length === 0) next.name = 'Il nome è obbligatorio';

    if (!isEdit) {
      if (!selectedSpecies?.trefleId) {
        next.species = 'Seleziona una specie dalla ricerca (Trefle)';
      }
    } else {
      if (!speciesQuery || speciesQuery.trim().length < 2) {
        next.species = 'Specie non valida';
      }
    }

    if (!geo || !geo.lat || !geo.lng) {
      next.location = 'Seleziona una località dalla lista (Google Places)';
    }

    if (!stage || stage.trim().length === 0) {
      next.stage = 'La fase è obbligatoria';
    }

    if (!description || description.trim().length < 3) {
      next.description = 'La descrizione è obbligatoria (almeno 3 caratteri)';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    let speciesFinal = '';
    let treflePayload = null;

    if (!isEdit) {
      if (selectedSpecies?.trefleId) {
        speciesFinal =
          selectedSpecies.trefleScientificName ||
          selectedSpecies.trefleCommonName ||
          speciesQuery;
        treflePayload = {
          trefleId: selectedSpecies.trefleId,
          trefleSlug: selectedSpecies.trefleSlug || null,
          trefleScientificName: selectedSpecies.trefleScientificName || null,
          trefleCommonName: selectedSpecies.trefleCommonName || null,
        };
      } else {
        speciesFinal = speciesQuery.trim(); // non dovrebbe accadere grazie a validate()
      }
    } else {
      speciesFinal = initialData?.species || speciesQuery || '';
    }

    const payload = {
      name: name.trim(),
      species: speciesFinal,
      location: placeText || undefined,
      description: description || undefined,
      stage: stage || undefined,
      ...(treflePayload || {}),
        trefleImageUrl: treflePreview?.image_url || treflePreview?.imageUrl || undefined,
    };

    if (geo) {
      payload.geoLat = geo.lat;
      payload.geoLng = geo.lng;
      payload.placeId = geo.placeId || undefined;
      payload.addressLocality = geo.addrParts?.locality || undefined;
      payload.addressAdmin2 = geo.addrParts?.admin2 || undefined;
      payload.addressAdmin1 = geo.addrParts?.admin1 || undefined;
      payload.addressCountry = geo.addrParts?.country || undefined;
      payload.addressCountryCode = geo.addrParts?.countryCode || undefined;
    }

    try {
      await onSubmit(payload);
      onClose?.();
    } catch (err) {
      console.error('Errore submit PlantFormModal:', err);
      alert('Errore nel salvataggio della pianta');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden">
        {/* Header verde */}
        <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white">
          <h3 className="text-lg font-bold">
            {isEdit ? 'Modifica Pianta' : 'Aggiungi Pianta'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 text-red-200 hover:text-red-300"
            aria-label="Chiudi"
            title="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-1">
              <label className="block text-sm mb-1">
                Nome <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.currentTarget.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: null }));
                }}
                placeholder="Es. 'Pomodoro terrazzo'"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                required
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Specie (Trefle) */}
            <div className="col-span-1 relative" ref={dropdownRef}>
              <label className="block text-sm mb-1">
                Specie {isEdit ? '' : <span className="text-red-600">*</span>}
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={speciesQuery}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleSpeciesKeyDown}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setSpeciesQuery(v);
                    if (!isEdit) {
                      setShowDropdown(true);
                      setSelectedSpecies(null);
                      setTreflePreview(null);
                      setPreviewError(null);
                      if (errors.species) setErrors((p) => ({ ...p, species: null }));
                    }
                  }}
                  placeholder={isEdit ? 'Specie' : 'Cerca specie in inglese'}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                    isEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                  } ${errors.species ? 'border-red-400' : 'border-gray-300'}`}
                  autoComplete="off"
                  disabled={isEdit}
                />
                <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
              </div>
              {errors.species && <p className="text-xs text-red-600 mt-1">{errors.species}</p>}

              {!isEdit && showDropdown && (
                <div className="absolute z-[9999] mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
                  {searching && (
                    <div className="px-3 py-2 text-sm text-gray-500">Ricerca in corso…</div>
                  )}
                  {searchError && (
                    <div className="px-3 py-2 text-sm text-red-600">{searchError}</div>
                  )}
                  {!searching && !searchError && results.length === 0 && speciesQuery.trim().length >= 2 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Nessun risultato</div>
                  )}
                  {results.map((item, idx) => (
                    <button
                      key={`${item.trefleId}-${item.trefleSlug}`}
                      type="button"
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseLeave={() => setHighlightIndex(-1)}
                      onClick={() => handleSelectSpecies(item)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                        idx === highlightIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Leaf className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.trefleCommonName || '(No common name)'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {item.trefleScientificName || ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Posizione */}
            <div className="col-span-1 md:col-span-1">
              <label className="block text-sm mb-1">
                Posizione <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <PlaceAutocomplete
                  value={placeText}
                  onChangeText={(txt) => {
                    setPlaceText(txt);
                    if (errors.location) setErrors((p) => ({ ...p, location: null }));
                  }}
                  restrictCountry="it"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${errors.location ? 'border-red-400' : 'border-gray-300'}`}
                  onSelectPlace={({ formattedAddress, placeId, lat, lng, addrParts }) => {
                    setPlaceText(formattedAddress || '');
                    setGeo({
                      placeId: placeId || null,
                      lat: lat ?? null,
                      lng: lng ?? null,
                      addrParts: addrParts || {}
                    });
                    if (errors.location) setErrors((p) => ({ ...p, location: null }));
                  }}
                />
                <MapPin className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Seleziona dalla lista per salvare la posizione precisa (lat/lng).
              </p>
            </div>

            {/* Fase */}
            <div className="col-span-1">
              <label className="block text-sm mb-1">
                Fase <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <select
                  value={stage}
                  onChange={(e) => {
                    setStage(e.target.value);
                    if (errors.stage) setErrors((p) => ({ ...p, stage: null }));
                  }}
                  className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${errors.stage ? 'border-red-400' : 'border-gray-300'}`}
                  required
                >
                  <option value="">—</option>
                  <option value="semina">Semina</option>
                  <option value="crescita">Crescita</option>
                  <option value="fioritura">Fioritura</option>
                  <option value="raccolta">Raccolta</option>
                </select>
                <Calendar className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              {errors.stage && <p className="text-xs text-red-600 mt-1">{errors.stage}</p>}
            </div>

            {/* Descrizione */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm mb-1">
                Descrizione/Note <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.currentTarget.value);
                  if (errors.description) setErrors((p) => ({ ...p, description: null }));
                }}
                placeholder="Note sulla pianta, varietà, vaso, esposizione reale, ecc."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none ${errors.description ? 'border-red-400' : 'border-gray-300'}`}
                required
              />
              {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
            </div>

            {/* PREVIEW TREFLE */}
            {!isEdit && selectedSpecies?.trefleId && (
              <div className="col-span-1 md:col-span-2">
                <div className="border rounded-lg p-3 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-green-700" />
                    <p className="text-sm font-medium text-green-800">
                      Consigli Trefle per la specie selezionata
                    </p>
                  </div>

                  {previewLoading && (
                    <p className="text-sm text-gray-600">Caricamento consigli…</p>
                  )}

                  {previewError && (
                    <p className="text-sm text-red-600">{previewError}</p>
                  )}

                  {treflePreview?.recommendations && !previewLoading && !previewError && (
                    <div className="text-sm text-gray-800 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <b>Irrigazione (stima):</b>{' '}
                        {treflePreview.recommendations.recommendedWateringIntervalDays
                          ? `${treflePreview.recommendations.recommendedWateringIntervalDays} giorni`
                          : 'n/d'}
                      </div>
                      <div>
                        <b>Esposizione:</b>{' '}
                        {treflePreview.recommendations.recommendedSunlight || 'n/d'}
                      </div>
                      <div>
                        <b>Suolo:</b>{' '}
                        {treflePreview.recommendations.recommendedSoil || 'n/d'}
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-gray-600">
                    Questi valori saranno applicati automaticamente alla pianta quando confermi.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {isEdit ? 'Salva' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}