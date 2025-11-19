import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Users, Leaf, Lock, Eye, EyeOff, MapPin } from 'lucide-react';
import { api } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;


const RegisterPage = () => {
  const navigate = useNavigate();
  const { setAccessToken, setUser } = useAuth();

  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    username: '',
    dataNascita: '',
    sesso: '',
    password: '',
    confirmPassword: '',
    location: ''
  });

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setErrorMsg('');
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const f = formData;
    if (!f.nome || !f.cognome || !f.email || !f.username || !f.dataNascita || !f.sesso || !f.password || !f.location) {
      setErrorMsg('Compila tutti i campi obbligatori (*)');
      return false;
    }
    if (f.password.length < 8) {
      setErrorMsg('La password deve avere almeno 8 caratteri');
      return false;
    }
    if (f.password !== f.confirmPassword) {
      setErrorMsg('Le password non coincidono');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/api/utenti/register', {
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        dataNascita: formData.dataNascita,
        sesso: formData.sesso,
        location: formData.location
      });

      const res = await api.post('/api/utenti/login', {
        email: formData.email,
        password: formData.password
      });

      const token = res?.data?.accessToken;
      if (!token) throw new Error('Token mancante nella risposta di login');

      setAccessToken(token);
      setUser(res.data?.utente || null);
      navigate('/', { replace: true });
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message ||
        'Errore registrazione';
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-green-600 p-4 rounded-full">
              <Leaf className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Crea il tuo account</h2>
          <p className="text-gray-600">Unisciti alla community di Home Gardening e inizia a coltivare!</p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg">
          {errorMsg && (
            <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome */}
            <InputField name="nome" label="Nome *" icon={<User />} value={formData.nome} onChange={handleChange} />

            {/* Cognome */}
            <InputField name="cognome" label="Cognome *" icon={<User />} value={formData.cognome} onChange={handleChange} />

            {/* Email */}
            <InputField name="email" label="Email *" icon={<Mail />} type="email" value={formData.email} onChange={handleChange} />

            {/* Username */}
            <InputField name="username" label="Username *" icon={<User />} value={formData.username} onChange={handleChange} />

            {/* Data di nascita */}
            <InputField name="dataNascita" label="Data di nascita *" icon={<Calendar />} type="date" value={formData.dataNascita} onChange={handleChange} />

            {/* Sesso */}
            <div>
              <label htmlFor="sesso" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="h-4 w-4" />
                <span>Sesso *</span>
              </label>
              <select
                id="sesso"
                name="sesso"
                value={formData.sesso}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              >
                <option value="">Seleziona</option>
                <option value="M">Maschio</option>
                <option value="F">Femmina</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            {/* Località */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4" />
                <span>Località *</span>
              </label>
              <PlaceAutocomplete
  value={formData.location}
  onChangeText={(val) =>
    setFormData((prev) => ({
      ...prev,
      location: val,
    }))
  }
  onSelectPlace={({ formattedAddress, addrParts }) =>
    setFormData((prev) => ({
      ...prev,
      location: addrParts?.display || formattedAddress || prev.location,
    }))
  }
  placeholder="Es: Bari, IT"
  apiKey={GOOGLE_API_KEY}
/>
            </div>

            {/* Password */}
            <PasswordField
              name="password"
              label="Password *"
              show={showPw}
              toggle={() => setShowPw(s => !s)}
              value={formData.password}
              onChange={handleChange}
            />

            {/* Conferma Password */}
            <PasswordField
              name="confirmPassword"
              label="Conferma Password *"
              show={showPw2}
              toggle={() => setShowPw2(s => !s)}
              value={formData.confirmPassword}
              onChange={handleChange}
            />

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${loading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} text-white py-3 px-6 rounded-lg transition-colors font-medium`}
            >
              {loading ? 'Registrazione...' : 'Registrati'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Hai già un account?{' '}
              <Link to="/login" className="text-green-600 hover:text-green-500 font-medium">
                Accedi qui
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ name, label, icon, type = 'text', value, onChange }) => (
  <div>
    <label htmlFor={name} className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
      {icon}
      <span>{label}</span>
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
    />
  </div>
);

const PasswordField = ({ name, label, show, toggle, value, onChange }) => (
  <div>
    <label htmlFor={name} className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
      <Lock className="h-4 w-4" />
      <span>{label}</span>
    </label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
);

export default RegisterPage;