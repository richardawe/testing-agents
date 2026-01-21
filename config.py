"""
Configuration settings for AI Agent Workflow
"""
import os
from typing import Optional

class Config:
    """Configuration class for agent system"""
    
    # OpenRouter API Configuration
    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    MODEL_NAME: str = "xiaomi/mimo-v2-flash:free"
    
    # API Settings
    MAX_RETRIES: int = 3
    TIMEOUT: int = 60
    MAX_TOKENS: int = 4000
    TEMPERATURE: float = 0.7
    
    # Agent Settings
    ENABLE_LOGGING: bool = True
    LOG_LEVEL: str = "INFO"
    
    @classmethod
    def validate(cls) -> bool:
        """Validate configuration"""
        if not cls.OPENROUTER_API_KEY:
            raise ValueError(
                "OPENROUTER_API_KEY environment variable is required. "
                "Get your API key from https://openrouter.ai/keys"
            )
        
        # Strip whitespace and check if empty
        cls.OPENROUTER_API_KEY = cls.OPENROUTER_API_KEY.strip()
        if not cls.OPENROUTER_API_KEY:
            raise ValueError(
                "OPENROUTER_API_KEY is empty or whitespace. "
                "Please set a valid API key from https://openrouter.ai/keys"
            )
        
        # Check if it looks like a valid key (starts with sk-or-)
        if not cls.OPENROUTER_API_KEY.startswith("sk-or-"):
            print("⚠️  Warning: API key doesn't start with 'sk-or-'. Make sure you're using a valid OpenRouter API key.")
        
        return True
