# 🌱 GreenField-Advisor

**Piattaforma DSS (Decision Support System) per Agricoltura di Precisione basata su AI Ibrida.**

> Integrazione di **ANFIS (MLP)**, **CNN (MobileNetV2)** e **LLM** per raccomandazioni irrigue, diagnosi malattie e analisi predittiva.

---

## 📋 Indice

- [Architettura](#-architettura)
- [Stack Tecnologico](#-stack-tecnologico)
- [Prerequisiti](#-prerequisiti)
- [Installazione](#-installazione)
- [Configurazione](#-configurazione)
- [Avvio Applicazione](#-avvio-applicazione)
- [Dataset](#-dataset)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Autori](#-autori)

---

## 🏗️ Architettura

Struttura del progetto e organizzazione delle directory:

```text
GreenField-Advisor/
├── backend/   # FastAPI + Python (AI Services, Pipeline, Controllers)
├── frontend/  # React + TailwindCSS (Dashboard SPA)
└── README.md

---


**Pattern Implementati:**
- **Strategy**: Algoritmi intercambiabili per stima irrigazione (TomatoStrategy, PotatoStrategy, etc.)
- **Chain of Responsibility**: Pipeline modulare (DataValidator → FeatureEngineer → IrrigationEstimator)
- **Adapter**: Normalizzazione immagini eterogenee (EXIF, GPS, thumbnail)

---

## 🛠️ Stack Tecnologico

### Backend
- **Framework**: FastAPI 0.116.1
- **Database**: MongoDB (Motor async driver)
- **AI/ML**: 
  - scikit-learn (ANFIS/MLP)
  - TensorFlow + Keras (CNN MobileNetV2)
  - OpenRouter API (LLM - Gemini, Llama, Mistral)
- **Librerie Agro**: pyfao56 (coefficienti colturali FAO56)

### Frontend
- **Framework**: React 18.x
- **Styling**: TailwindCSS
- **HTTP Client**: Axios
- **Routing**: React Router

---

## ✅ Prerequisiti

### Requisiti di Sistema
- **Python**: 3.10 o superiore
- **Node.js**: 16.x o superiore
- **npm**: 8.x o superiore
- **MongoDB**: 4.4 o superiore (locale o Atlas)

### Verifica Installazione
```bash
# Verifica Python
python --version   # oppure python3 --version

# Verifica Node.js e npm
node --version
npm --version

# Verifica MongoDB (se locale)
mongod --version
