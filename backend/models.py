from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict

class ActivityCreate(BaseModel):
    platform: Optional[str] = "System"
    text: Optional[str] = "Activity logged"
    countBadge: Optional[str] = "Logged"
    iconType: Optional[str] = "bot"

class AuthLogin(BaseModel):
    email: str
    password: str

class AuthRegister(BaseModel):
    name: str
    email: str
    password: str
    avatar: Optional[str] = "avatar_1"

class AuthGoogle(BaseModel):
    email: str
    name: Optional[str] = "User"
    avatar: Optional[str] = "avatar_1"

class AuthForgotPassword(BaseModel):
    email: str

class AuthAvatarUpdate(BaseModel):
    avatar: str

class AiSettingsUpdate(BaseModel):
    openai_key: Optional[str] = None
    openai_model: Optional[str] = "gpt-4o"
    gemini_key: Optional[str] = None
    gemini_model: Optional[str] = "gemini-1.5-pro"
    claude_key: Optional[str] = None
    claude_model: Optional[str] = "claude-3-5-sonnet"
    mcp_servers: Optional[List[Dict[str, Any]]] = None

class FeedbackCreate(BaseModel):
    category: Optional[str] = "General"
    rating: Optional[int] = 5
    message: str
    email: Optional[str] = None

class FactoryResetRequest(BaseModel):
    projectName: str

class MenuItem(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    enabled: bool = True

class MenuSettingsUpdate(BaseModel):
    items: List[MenuItem]

class CandidateProfileCreate(BaseModel):
    name: str
    data: Optional[Dict[str, Any]] = None

class CandidateProfileUpdate(BaseModel):
    name: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class KeywordsGenerateRequest(BaseModel):
    primarySkill: Optional[str] = None
    skillsList: Optional[List[str]] = None
    selectedRoles: Optional[List[str]] = None

class KeywordsUpdateRequest(BaseModel):
    keywords: List[Dict[str, Any]]

class ExplorerRunRequest(BaseModel):
    profileId: Optional[str] = None


