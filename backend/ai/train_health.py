#ATTENZIONE, COSA FA: Legge le immagini dal nostro Desktop, impara a riconoscerle e salva il "cervello" (.h5) dentro la cartella del tuo progetto backend.

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
import os
import json

# --- 1. CONFIGURAZIONE PERCORSI ---
DATASET_DIR = "/Users/maure/Desktop/PROGETTO MONGIELLO /PlantVillage"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_NAME = "plant_disease_model.h5"
CLASS_MAP_NAME = "disease_classes.json"

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10  

def train():
    # Verifica che il dataset esista
    if not os.path.exists(DATASET_DIR):
        print(f" ERRORE CRITICO: Il percorso del dataset non esiste!")
        print(f"   Path cercato: {DATASET_DIR}")
        return

    # Verifica che ci siano cartelle dentro
    subdirs = [d for d in os.listdir(DATASET_DIR) if os.path.isdir(os.path.join(DATASET_DIR, d))]
    if not subdirs:
        print(f"ERRORE: La cartella sembra vuota o non contiene le sottocartelle delle piante.")
        return
    
    print(f"Dataset trovato! Rilevate {len(subdirs)} classi.")
    print(f"   Esempio classi: {subdirs[:3]}...")

    # 2. Preparazione Dati (Data Augmentation)
    print(" Preparazione generatori di immagini...")
    train_datagen = ImageDataGenerator(
        rescale=1./255,         # Normalizza i pixel (0-1)
        rotation_range=25,      # Ruota leggermente le immagini
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.3    # Usa il 20% delle foto per testare la precisione
    )

    # Caricamento Training Set
    train_generator = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    # Caricamento Validation Set
    validation_generator = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    # 3. Salvataggio Mappa Classi
    # Questo serve al backend per sapere che "Indice 0" significa "Apple___Black_rot"
    class_indices = train_generator.class_indices
    idx_to_class = {v: k for k, v in class_indices.items()}
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(os.path.join(MODEL_DIR, CLASS_MAP_NAME), 'w') as f:
        json.dump(idx_to_class, f)
    print(f" Mappa classi salvata in: {CLASS_MAP_NAME}")

    num_classes = len(class_indices)

    # 4. Creazione Modello (MobileNetV2)
    # Scarica la struttura di una rete neurale potente ma leggera
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    base_model.trainable = False # Congela la base per non distruggerla subito

    # Aggiunge la "testa" personalizzata per le tue piante
    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dense(128, activation='relu')(x)
    x = Dropout(0.5)(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)

    # Compilazione
    model.compile(optimizer=Adam(learning_rate=0.0001),
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])

    # 5. Avvio Addestramento
    print("\n AVVIO TRAINING (Questo processo richiederà tempo)...")
    model.fit(
        train_generator,
        steps_per_epoch=train_generator.samples // BATCH_SIZE,
        validation_data=validation_generator,
        validation_steps=validation_generator.samples // BATCH_SIZE,
        epochs=EPOCHS
    )

    # 6. Salvataggio Finale
    save_path = os.path.join(MODEL_DIR, MODEL_NAME)
    model.save(save_path)
    print(f"\n COMPLETATO! Modello salvato in: {save_path}")
    print(" Ora puoi riavviare il backend per caricare il nuovo modello.")

if __name__ == "__main__":
    train()