// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Leaf, Brain, } from 'lucide-react';
import { Sliders } from 'lucide-react';

const HomePage = () => {
    const location = useLocation();
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        if (location.state?.reason === "not-authorized") {
            setShowBanner(true);
            // Nasconde automaticamente il banner dopo 4s
            const t = setTimeout(() => setShowBanner(false), 4000);
            return () => clearTimeout(t);
        }
    }, [location.state]);

    return (
        <div className="bg-green-50 min-h-screen">

            {/* Banner non autorizzato */}
            {showBanner && (
                <div className="mx-auto max-w-3xl px-4 pt-6">
                    <div className="rounded-md bg-red-50 px-4 py-3 text-red-700 text-sm shadow">
                        Non sei autorizzato ad accedere a quella pagina.
                    </div>
                </div>
            )}

            {/* Welcome Section with Background */}
            <div className="relative mb-16 min-h-[60vh] md:min-h-[70vh]">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage:
                            'url(https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1280&fit=crop)',
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto pt-28 md:pt-36">
                    <div className="flex justify-center mb-6">
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm p-4 rounded-full">
                            <Leaf className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Benvenuto in Home Gardening
                    </h1>
                    <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
                        La piattaforma completa per gestire il tuo giardino con intelligenza artificiale
                        e strumenti innovativi. Coltiva il futuro, oggi.
                    </p>
                </div>
            </div>

            {/* Main Content */}
<div id="funzionalita" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Features Cards */}
                <div  className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                        <div className="flex justify-center mb-4">
                            <Leaf className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Monitoraggio Piante</h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                            Tieni traccia della salute delle tue piante con sensori intelligenti e notifiche personalizzate.
                        </p>

                    </div>

                    <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                        <div className="flex justify-center mb-4">
                            <Brain className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Consigli AI</h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                            Ricevi suggerimenti personalizzati basati su intelligenza artificiale per ottimizzare la crescita.
                        </p>

                    </div>

                    <div className="text-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                        <div className="flex justify-center mb-4">
                            <Sliders className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Consigli Fuzzy</h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                            Ottieni raccomandazioni basate su logica fuzzy per irrigazione e fertilizzazione,
                            adattate dinamicamente ai dati della pianta.
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="text-center mb-16 px-4 max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        🌱 Tecnologia e natura si incontrano
                    </h2>
                    <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                        Scopri come l’intelligenza artificiale può aiutarti a coltivare meglio, ogni giorno.
                        Con strumenti avanzati e consigli intelligenti, prendersi cura del tuo giardino
                        non è mai stato così semplice.
                    </p>
                    <div className="space-y-2 italic text-gray-700">
                        <p>✔️ Monitoraggio automatico delle piante</p>
                        <p>✔️ Consigli personalizzati con AI</p>
                        <p>✔️ Raccomandazioni fuzzy per irrigazione e nutrizione</p>
                    </div>
                </div>
                {/* Call to Action */}
                <div className="bg-green-600 text-white rounded-2xl p-8 md:p-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Pronto a trasformare il tuo giardino?
                    </h2>
                    <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
                        Scopri tutte le funzionalità della nostra piattaforma e inizia
                        a coltivare in modo più intelligente e sostenibile.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => {
                                const section = document.getElementById('funzionalita');
                                section?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-white text-green-600 px-8 py-3 rounded-lg hover:bg-green-50 transition-colors font-medium"
                        >
                            Esplora le Funzionalità
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;