"""
Base Agent class with OpenRouter integration
"""
import json
import requests
import logging
from typing import Dict, Any, Optional, List
from config import Config

logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL))
logger = logging.getLogger(__name__)


class BaseAgent:
    """Base class for all AI agents with OpenRouter integration"""
    
    def __init__(self, name: str, role: str, instructions: str):
        """
        Initialize agent
        
        Args:
            name: Agent name
            role: Agent role description
            instructions: System instructions for the agent
        """
        self.name = name
        self.role = role
        self.instructions = instructions
        self.config = Config
        
        if not self.config.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY not set in environment variables")
        
        # Ensure API key is trimmed
        if self.config.OPENROUTER_API_KEY:
            self.config.OPENROUTER_API_KEY = self.config.OPENROUTER_API_KEY.strip()
    
    def call_llm(self, prompt: str, context: Optional[List[Dict[str, str]]] = None) -> str:
        """
        Call OpenRouter API with the specified model
        
        Args:
            prompt: The user prompt
            context: Optional conversation history
            
        Returns:
            Response text from the model
        """
        headers = {
            "Authorization": f"Bearer {self.config.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/testing-agents",  # Optional
            "X-Title": "AI Agent Workflow"  # Optional
        }
        
        messages = []
        
        # Add system instruction
        if self.instructions:
            messages.append({
                "role": "system",
                "content": self.instructions
            })
        
        # Add context if provided
        if context:
            messages.extend(context)
        
        # Add current prompt
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        payload = {
            "model": self.config.MODEL_NAME,
            "messages": messages,
            "max_tokens": self.config.MAX_TOKENS,
            "temperature": self.config.TEMPERATURE
        }
        
        try:
            logger.info(f"{self.name} calling OpenRouter API with model {self.config.MODEL_NAME}")
            
            # Validate API key is present
            if not self.config.OPENROUTER_API_KEY or not self.config.OPENROUTER_API_KEY.strip():
                raise ValueError("OPENROUTER_API_KEY is missing or empty")
            
            response = requests.post(
                f"{self.config.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
                timeout=self.config.TIMEOUT
            )
            
            # Handle 401 Unauthorized specifically
            if response.status_code == 401:
                error_msg = (
                    "401 Unauthorized: Authentication failed.\n"
                    "Possible causes:\n"
                    "  1. Invalid or expired API key\n"
                    "  2. API key doesn't have access to this model\n"
                    "  3. API key format is incorrect\n\n"
                    f"Please verify your API key at: https://openrouter.ai/keys\n"
                    f"Current API key (first 10 chars): {self.config.OPENROUTER_API_KEY[:10]}...\n"
                    f"Model: {self.config.MODEL_NAME}"
                )
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            response.raise_for_status()
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                logger.debug(f"{self.name} received response: {content[:100]}...")
                return content
            else:
                raise ValueError("Unexpected response format from OpenRouter API")
                
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 401:
                error_msg = (
                    "401 Unauthorized: Authentication failed.\n"
                    "Possible causes:\n"
                    "  1. Invalid or expired API key\n"
                    "  2. API key doesn't have access to this model\n"
                    "  3. API key format is incorrect\n\n"
                    f"Please verify your API key at: https://openrouter.ai/keys\n"
                    f"Current API key (first 10 chars): {self.config.OPENROUTER_API_KEY[:10]}...\n"
                    f"Model: {self.config.MODEL_NAME}"
                )
                logger.error(error_msg)
                raise ValueError(error_msg) from e
            else:
                logger.error(f"{self.name} API call failed with status {e.response.status_code}: {str(e)}")
                raise Exception(f"Failed to call OpenRouter API (HTTP {e.response.status_code}): {str(e)}")
        except requests.exceptions.RequestException as e:
            logger.error(f"{self.name} API call failed: {str(e)}")
            raise Exception(f"Failed to call OpenRouter API: {str(e)}")
        except ValueError as e:
            # Re-raise ValueError as-is
            raise
    
    def process(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a task - to be implemented by subclasses
        
        Args:
            task: The task description
            context: Additional context from previous steps
            
        Returns:
            Dictionary with results
        """
        raise NotImplementedError("Subclasses must implement process method")
    
    def format_output(self, result: Any) -> Dict[str, Any]:
        """Format agent output in a standard structure"""
        return {
            "agent": self.name,
            "role": self.role,
            "result": result,
            "status": "completed"
        }
