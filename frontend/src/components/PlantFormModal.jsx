import React, { useEffect, useRef, useState } from 'react';
import { X, MapPin, Calendar, Camera, Trash2, Sprout } from 'lucide-react';
import { api } from '../api/axiosInstance';
import PlaceAutocomplete from './PlaceAutocomplete';

// 🌿 LISTA DELLE SPECIE SUPPORTATE
const SUPPORTED_SPECIES = [
    { id: 'tomato', label: 'Pomodoro (Tomato)' },
    { id: 'lettuce', label: 'Lattuga (Lettuce)' },
    { id: 'basil', label: 'Basilico (Basil)' },
    { id: 'pepper', label: 'Peperone (Pepper)' },
    { id: 'cucumber', label: 'Cetriolo (Cucumber)' },
    { id: 'potato', label: 'Patata (Potato)' },
    { id: 'generic', label: 'Altra Specie (Generica)' }
];

export default function PlantFormModal({
  open,
  onClose,
  initialData = null,
  onSubmit,
  mode = 'create',
}) {
  const isEdit = mode === 'edit';

  // --- STATI DEL FORM ---
  const [name, setName] = useState(initialData?.name || '');
  const [selectedSpecies, setSelectedSpecies] = useState(initialData?.species || '');
  const [placeText, setPlaceText] = useState(initialData?.location || '');
  
  // Gestione coordinate (fondamentale per il meteo e la pipeline)
  const [geo, setGeo] = useState(() => {
    if (!initialData) return null;
    const { geoLat, geoLng, placeId } = initialData;
    if (geoLat && geoLng) {
      return { lat: geoLat, lng: geoLng, placeId: placeId || null, addrParts: {} };
    }
    return null;
  });

  const [description, setDescription] = useState(initialData?.description || '');
  const [stage, setStage] = useState(initialData?.stage || '');
  const [soil, setSoil] = useState(initialData?.soil || ''); // 🟢 NUOVO STATO TERRENO
  const [errors, setErrors] = useState({});

  // --- STATI IMMAGINE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(initialData?.imageUrl || initialData?.imageThumbUrl || null);
  const fileInputRef = useRef(null);

  // Reset quando chiudi il modale
  useEffect(() => {
    if (!open) {
      setErrors({});
      setSelectedFile(null);
      setPreview(null);
      if (!isEdit) {
        setName('');
        setSelectedSpecies('');
        setPlaceText('');
        setGeo(null);
        setDescription('');
        setStage('');
        setSoil(''); // 🟢 RESET STATO TERRENO
      }
    }
  }, [open, isEdit]);

  // Gestione Selezione File
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validazione
  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Il nome è obbligatorio';
    if (!selectedSpecies) next.species = 'Seleziona una specie dalla lista';
    if (!placeText) next.location = 'La posizione è obbligatoria';
    if (!stage) next.stage = 'La fase è obbligatoria';
    
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // SUBMIT DEL FORM
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      species: selectedSpecies, 
      location: placeText || undefined,
      description: description || undefined,
      stage: stage || undefined,
      soil: soil || undefined, // 🟢 AGGIUNTO AL PAYLOAD
    };

    // Aggiungi coordinate per il meteo
    if (geo) {
      payload.geoLat = geo.lat;
      payload.geoLng = geo.lng;
      payload.placeId = geo.placeId || undefined;
    }

    try {
      // Passiamo payload E file immagine al componente genitore
      await onSubmit(payload, selectedFile);
      onClose?.();
    } catch (err) {
      console.error('Errore submit:', err);
      alert('Errore nel salvataggio');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-green-600 text-white flex-shrink-0">
          <h3 className="text-lg font-bold">
            {isEdit ? 'Modifica Pianta' : 'Aggiungi Pianta'}
          </h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Scrollable */}
        <div className="overflow-y-auto p-6">
          <form onSubmit={handleSubmit} id="plantForm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* --- SEZIONE FOTO --- */}
              <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center mb-2">
                <div className="relative group cursor-pointer" onClick={() => !preview && fileInputRef.current.click()}>
                  <div className={`w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden bg-green-50 transition-all
                    ${preview ? 'border-green-600 shadow-md' : 'border-green-300 hover:bg-green-100 hover:border-green-400'}`}>
                    
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <Camera className="h-8 w-8 text-green-500 mx-auto mb-1" />
                        <span className="text-xs text-green-700 font-medium">Aggiungi Foto</span>
                      </div>
                    )}
                  </div>

                  {/* Bottone Rimuovi Foto */}
                  {preview && (
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
                      className="absolute top-0 right-0 bg-red-500 text-white p-1.5 rounded-full shadow hover:bg-red-600 transform translate-x-1/4 -translate-y-1/4"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Foto della pianta (Opzionale)</p>
              </div>

              {/* --- CAMPO NOME --- */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-600">*</span></label>
                <input 
                  type="text" value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Es. Il mio Pomodoro"
                  required 
                />
              </div>

              {/* --- CAMPO SPECIE (SELECT) --- */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Specie <span className="text-red-600">*</span></label>
                <div className="relative">
                    <select
                        value={selectedSpecies}
                        onChange={(e) => { setSelectedSpecies(e.target.value); setErrors(p => ({...p, species:null})); }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white ${errors.species ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        <option value="">Seleziona una specie...</option>
                        {SUPPORTED_SPECIES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                    <Sprout className="h-4 w-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                {errors.species && <p className="text-xs text-red-600 mt-1">{errors.species}</p>}
              </div>

              {/* --- CAMPO POSIZIONE (con Autocomplete) --- */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Posizione <span className="text-red-600">*</span></label>
                <div className="relative">
                    <PlaceAutocomplete 
                        value={placeText}
                        onChangeText={setPlaceText}
                        onSelectPlace={(p) => { setPlaceText(p.formattedAddress); setGeo(p); }}
                        className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <MapPin className="h-4 w-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
              </div>

            {/* --- CAMPO TERRENO (NUOVO JSX) --- */}
            <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipologia Terreno</label>
                <div className="relative">
                    <select
                        value={soil}
                        onChange={(e) => setSoil(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white"
                    >
                        <option value="">Seleziona terreno...</option>
                        <option value="universale">Universale (Standard)</option>
                        <option value="argilloso">Argilloso (Pesante)</option>
                        <option value="sabbioso">Sabbioso (Drenante)</option>
                        <option value="franco">Lavorabile (Medio impasto)</option>
                        <option value="acido">Acido (per es. Mirtilli)</option>
                        <option value="torboso">Torboso</option>
                    </select>
                    {/* Icona opzionale per il select */}
                    <div className="absolute right-3 top-2.5 pointer-events-none text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4H2v16z"></path></svg>
                    </div>
                </div>
            </div>  

              {/* --- CAMPO FASE --- */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fase <span className="text-red-600">*</span></label>
                <div className="relative">
                    <select value={stage} onChange={e => setStage(e.target.value)} className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none bg-white">
                        <option value="">Seleziona fase...</option>
                        <option value="semina">Semina</option>
                        <option value="crescita">Crescita</option>
                        <option value="fioritura">Fioritura</option>
                        <option value="raccolta">Raccolta</option>
                    </select>
                    <Calendar className="h-4 w-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                {errors.stage && <p className="text-xs text-red-600 mt-1">{errors.stage}</p>}
              </div>

              {/* --- CAMPO DESCRIZIONE --- */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea 
                    rows={3} value={description} 
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Note aggiuntive..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500"
                />
              </div>

            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium">
            Annulla
          </button>
          <button type="submit" form="plantForm" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm font-medium">
            {isEdit ? 'Salva Modifiche' : 'Crea Pianta'}
          </button>
        </div>
      </div>
    </div>
  );
}