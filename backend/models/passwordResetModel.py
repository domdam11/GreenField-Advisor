from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class PasswordResetRequest(BaseModel):
    """Schema per richiesta reset password"""
    email: EmailStr

class PasswordResetToken(BaseModel):
    """Schema per token reset password"""
    token: str
    userId: str
    createdAt: datetime
    expiresAt: datetime
    used: bool = False

class PasswordResetConfirm(BaseModel):
    """Schema per conferma reset password"""
    token: str
    newPassword: str
