"""
Test script to verify OpenRouter API connection
"""
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

def test_connection():
    """Test OpenRouter API connection"""
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    model = "xiaomi/mimo-v2-flash:free"
    
    print("🔍 Testing OpenRouter API Connection")
    print("=" * 50)
    
    # Check API key
    if not api_key:
        print("❌ ERROR: OPENROUTER_API_KEY not found in environment")
        print("\nPlease set your API key:")
        print("  export OPENROUTER_API_KEY='your-api-key-here'")
        print("\nOr create a .env file with:")
        print("  OPENROUTER_API_KEY=your-api-key-here")
        return False
    
    print(f"✅ API Key found: {api_key[:10]}...{api_key[-4:]}")
    
    # Check API key format
    if not api_key.startswith("sk-or-"):
        print("⚠️  WARNING: API key doesn't start with 'sk-or-'")
        print("   Make sure you're using a valid OpenRouter API key")
    
    print(f"\n📡 Testing connection to OpenRouter API...")
    print(f"   Model: {model}")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # First, try to list available models (optional endpoint)
    try:
        print("\n1. Testing API accessibility...")
        response = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print("   ✅ API is accessible")
            models = response.json().get("data", [])
            model_ids = [m.get("id", "") for m in models]
            
            # Check if our model is available
            if any(model in m for m in model_ids):
                print(f"   ✅ Model '{model}' found in available models")
            else:
                print(f"   ⚠️  Model '{model}' not found in available models")
                print(f"   Available models (first 10):")
                for m in model_ids[:10]:
                    print(f"      - {m}")
        else:
            print(f"   ⚠️  Status {response.status_code}: {response.text[:100]}")
    
    except Exception as e:
        print(f"   ⚠️  Could not check models: {str(e)}")
    
    # Test actual API call
    print("\n2. Testing chat completion...")
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Say 'Hello, World!' if you can read this."
            }
        ],
        "max_tokens": 50
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("\n❌ 401 Unauthorized Error")
            print("\nPossible issues:")
            print("  1. Invalid API key")
            print("  2. API key expired or revoked")
            print("  3. API key doesn't have access to this model")
            print("  4. Incorrect API key format")
            print(f"\nPlease verify your API key at: https://openrouter.ai/keys")
            print(f"   Current key starts with: {api_key[:10]}...")
            return False
        
        elif response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                print(f"   ✅ Success! Response: {content}")
                return True
            else:
                print(f"   ⚠️  Unexpected response format: {result}")
                return False
        
        else:
            print(f"\n❌ Error {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {error_data}")
            except:
                print(f"   Response: {response.text[:200]}")
            return False
    
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Connection error: {str(e)}")
        print("\nPossible issues:")
        print("  1. No internet connection")
        print("  2. OpenRouter API is down")
        print("  3. Firewall blocking the connection")
        return False


if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
