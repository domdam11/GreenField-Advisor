from fastapi import HTTPException
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import hashlib
from database import db
from controllers.userController import hash_password
from utils.email_service import send_email, get_password_reset_email_template
import os

users_collection = db["utenti"]
password_reset_tokens_collection = db["password_reset_tokens"]

# Configurazione
RESET_TOKEN_EXPIRATION_HOURS = 1
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def generate_reset_token() -> str:
    """
    Genera un token sicuro per il reset password.
    
    Returns:
        Token unico e sicuro (64 caratteri hex)
    """
    # Genera 32 bytes casuali (256 bit)
    random_bytes = secrets.token_bytes(32)
    # Hash SHA256 per maggiore sicurezza
    token = hashlib.sha256(random_bytes).hexdigest()
    return token


async def request_password_reset(email: str) -> dict:
    """
    Fase 1: Gestisce la richiesta di reset password.
   
    Args:
        email: Email dell'utente
    
    Returns:
        Messaggio di conferma (generico per sicurezza)
    
    Raises:
        HTTPException: Solo per errori del server, non per utente non trovato
    """
    # Query utente nel database
    user = users_collection.find_one({"email": email})
    
    # SECURITY: Ritorna sempre lo stesso messaggio, anche se l'utente non esiste
    # Questo previene attacchi di enumerazione email
    generic_response = {
        "message": "Se l'email esiste nel nostro sistema, riceverai un link per reimpostare la password."
    }
    
    # Se l'utente non esiste, ritorna comunque successo (per sicurezza)
    if not user:
        return generic_response
    
    # Genera token sicuro
    reset_token = generate_reset_token()
    
    # Calcola scadenza (1 ora)
    expires_at = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRATION_HOURS)
    
    # Salva token nel database
    password_reset_tokens_collection.insert_one({
        "token": reset_token,
        "userId": str(user["_id"]),
        "email": email,
        "createdAt": datetime.utcnow(),
        "expiresAt": expires_at,
        "used": False
    })
    
    # Crea link di reset
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Prepara email
    username = user.get("username", user.get("nome", "Utente"))
    html_content = get_password_reset_email_template(reset_link, username)
    
    # Invia email
    email_sent = await send_email(
        to_email=email,
        subject="🔐 Reimposta la tua password - GreenField Advisor",
        html_content=html_content
    )
    
    if not email_sent:
        # Log errore ma non rivelare all'utente per sicurezza
        print(f"⚠️ Failed to send reset email to {email}")
    
    return generic_response


async def reset_password(token: str, new_password: str) -> dict:
    """
    Fase 2: Gestisce il reset effettivo della password.
    
    Args:
        token: Token ricevuto via email
        new_password: Nuova password scelta dall'utente
    
    Returns:
        Messaggio di conferma
    
    Raises:
        HTTPException: Se token non valido o scaduto
    """
    # Validazione lunghezza password (come in register)
    if len(new_password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=400, 
            detail="La password non può superare i 72 caratteri."
        )
    
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="La password deve contenere almeno 8 caratteri."
        )
    
    # Query token nel database
    token_doc = password_reset_tokens_collection.find_one({"token": token})
    
    # Verifica esistenza token
    if not token_doc:
        raise HTTPException(
            status_code=400, 
            detail="Token non valido o scaduto."
        )
    
    # Verifica che il token non sia già stato usato
    if token_doc.get("used"):
        raise HTTPException(
            status_code=400, 
            detail="Questo link è già stato utilizzato. Richiedi un nuovo reset."
        )
    
    # Verifica scadenza token
    if datetime.utcnow() > token_doc["expiresAt"]:
        raise HTTPException(
            status_code=400, 
            detail="Il link è scaduto. Richiedi un nuovo reset."
        )
    
    # Hash della nuova password
    hashed_password = hash_password(new_password)
    
    # Aggiorna password utente
    user_id = token_doc["userId"]
    update_result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "password": hashed_password,
                "updatedAt": datetime.utcnow()
            }
        }
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=404, 
            detail="Utente non trovato."
        )
    
    # Marca token come usato
    password_reset_tokens_collection.update_one(
        {"_id": token_doc["_id"]},
        {
            "$set": {
                "used": True,
                "usedAt": datetime.utcnow()
            }
        }
    )
    
    # Invalida tutti i refresh token esistenti per questo utente (sicurezza)
    refresh_tokens_collection = db["refresh_tokens"]
    refresh_tokens_collection.delete_many({"userId": user_id})
    
    return {
        "message": "Password reimpostata con successo! Puoi ora effettuare il login."
    }


async def validate_reset_token(token: str) -> dict:
    """
    Valida un token senza usarlo (per UI feedback).
    Utile per mostrare messaggi di errore prima che l'utente inserisca la nuova password.
    
    Args:
        token: Token da validare
    
    Returns:
        Dict con 'valid' (bool) e 'reason' (str) se non valido
    """
    token_doc = password_reset_tokens_collection.find_one({"token": token})
    
    if not token_doc:
        return {
            "valid": False, 
            "reason": "Token non trovato"
        }
    
    if token_doc.get("used"):
        return {
            "valid": False, 
            "reason": "Token già utilizzato"
        }
    
    if datetime.utcnow() > token_doc["expiresAt"]:
        return {
            "valid": False, 
            "reason": "Token scaduto"
        }
    
    # Calcola tempo rimanente
    time_left = token_doc["expiresAt"] - datetime.utcnow()
    minutes_left = int(time_left.total_seconds() / 60)
    
    return {
        "valid": True,
        "expiresAt": token_doc["expiresAt"].isoformat(),
        "minutesLeft": minutes_left
    }


async def cleanup_expired_tokens() -> dict:
    """
    Funzione di manutenzione per rimuovere token scaduti o usati.
    Può essere chiamata periodicamente da un cron job.
    
    Returns:
        Numero di token eliminati
    """
    result = password_reset_tokens_collection.delete_many({
        "$or": [
            {"expiresAt": {"$lt": datetime.utcnow()}},
            {"used": True}
        ]
    })
    
    return {
        "deleted": result.deleted_count,
        "message": f"Eliminati {result.deleted_count} token scaduti/usati"
    }
