import React, { useEffect, useState } from 'react';
import {
  MapPin, Cloud, Droplets, Leaf
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/axiosInstance';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const Dashboard = () => {
  const { accessToken, updateUser } = useAuth(); // updateUser se disponibile nel contesto
  const [userData, setUserData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [recentInterventions, setRecentInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const now = new Date();

  useEffect(() => {
    if (accessToken) {
      loadDashboardData();
    }
  }, [accessToken]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Recupera dati aggiornati utente
      const resUser = await api.get('/api/utenti/me');
      const user = resUser.data.utente;
      setUserData(user);
      updateUser?.(user); // opzionale: aggiorna contesto globale

      //  Meteo
      if (user?.location) {
        const resWeather = await api.get(`/api/weather?city=${encodeURIComponent(user.location)}`);
        setWeather(resWeather.data);
      }

      // Consiglio AI
      if (user?.piante?.length > 0) {
        const firstPlantId = user.piante[0];
        const resAI = await api.post(`/api/piante/${firstPlantId}/ai/irrigazione`);
        setAiAdvice(resAI.data?.explanationLLM || '—');
      }

      // Interventi recenti globali
      const resInterv = await api.get(`/api/piante/utente/interventi-recenti`);
      setRecentInterventions(resInterv.data || []);

      setError(null);
    } catch (err) {
      console.error('Errore nel caricamento dashboard:', err);
      setError(err.response?.data?.detail || err.message || 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-green-600 text-center">Caricamento...</div>;
  if (error) return <div className="p-8 text-red-600 text-center">Errore: {error}</div>;
  if (!userData) return null;

  return (
    <div className="bg-green-50 min-h-screen p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl p-6 mb-8">
        <h1 className="text-3xl font-bold mb-2">Ciao {userData.nome} 🌱</h1>
        <p className="text-green-100 mb-1">{format(now, 'EEEE d MMMM yyyy', { locale: it })}</p>
        <p className="text-green-200 italic">"Coltiva il tuo benessere ogni giorno"</p>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard title="Piante registrate" value={userData.plantCount || 0} icon={<Leaf />} color="green" />
        <StatCard title="Irrigazioni oggi" value={userData.interventionsToday || 0} icon={<Droplets />} color="blue" />
        <StatCard title="Località" value={`${userData.location?.split(',')[0] || '—'}, Italia`} icon={<MapPin />} color="gray" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ultimi interventi */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl shadow space-y-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Ultimi interventi completati</h2>
          {recentInterventions.length === 0 ? (
            <p className="text-gray-500 text-sm">Nessun intervento disponibile.</p>
          ) : (
            <ul className="space-y-3">
              {recentInterventions.map((intv) => (
                <li key={intv.id} className="border p-4 rounded">
                  <div className="text-sm text-gray-600 mb-1">
                    {format(new Date(new Date(intv.executedAt || intv.createdAt).getTime() + 2 * 60 * 60 * 1000), 'PPPpp', { locale: it })}
                  </div>
                  <div className="font-semibold text-green-700 capitalize">{intv.type}</div>
                  {intv.notes && <p className="text-sm text-gray-700">Note: {intv.notes}</p>}
                  {intv.liters && <p className="text-sm text-gray-700">Litri: {intv.liters}L</p>}
                  {intv.fertilizerType && <p className="text-sm text-gray-700">Fertilizzante: {intv.fertilizerType}</p>}
                  {intv.dose && <p className="text-sm text-gray-700">Dose: {intv.dose}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Meteo + AI */}
        <div className="space-y-6">
          {/* Meteo */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Meteo</h2>
            {weather ? (
              <div className="bg-blue-100 p-4 rounded flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">{userData.location?.split(',')[0]}, Italia</p>
                  <p className="text-2xl font-bold">{weather.temp}°C</p>
                  <p className="text-sm text-gray-600">Precipitazioni: {weather.rainNext24h} mm</p>
                </div>
                <Cloud className="h-10 w-10 text-blue-400" />
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nessun dato disponibile</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-500',
    gray: 'text-gray-800'
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <div className={`text-3xl font-bold ${colors[color] || 'text-black'} flex items-center space-x-2`}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
};

export default Dashboard;