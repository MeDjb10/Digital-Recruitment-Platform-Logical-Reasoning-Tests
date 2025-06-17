#!/usr/bin/env python3
"""
Test script to verify OpenRouter API connection
"""
import os
import sys
import requests
import json

def test_openrouter_with_requests():
    """Test OpenRouter API using direct requests"""
    print("\n=== Testing with direct requests ===")
    
    api_key = os.getenv('OPENROUTER_API_KEY', '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')
    print(f"Using API key: {api_key[:20]}...")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "https://localhost:3000",
        "X-Title": "Digital Recruitment Platform - Test",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "meta-llama/llama-3.1-8b-instruct:free",
        "messages": [
            {
                "role": "user",
                "content": "Hello, this is a test. Please respond with 'API connection successful'."
            }
        ],
        "max_tokens": 20
    }
    
    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(data)
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS: OpenRouter API connection successful!")
            print(f"Response: {result['choices'][0]['message']['content']}")
            return True
        else:
            print(f"❌ FAILED: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        return False

def test_openrouter_with_openai():
    """Test OpenRouter API using OpenAI SDK"""
    print("\n=== Testing with OpenAI SDK ===")
    
    try:
        from openai import OpenAI
        
        api_key = os.getenv('OPENROUTER_API_KEY', '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')
        print(f"Using API key: {api_key[:20]}...")
        
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
        
        response = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://localhost:3000",
                "X-Title": "Digital Recruitment Platform - Test",
            },
            model="meta-llama/llama-3.1-8b-instruct:free",
            messages=[
                {"role": "user", "content": "Hello, this is a test. Please respond with 'API connection successful'."}
            ],
            max_tokens=20
        )
        
        print("✅ SUCCESS: OpenRouter API connection successful!")
        print(f"Response: {response.choices[0].message.content}")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: OpenRouter API connection failed!")
        print(f"Error: {e}")
        return False

def test_openrouter_connection():
    """Test OpenRouter API connection with various scenarios"""
    
    print("=== OpenRouter API Connection Test ===")
    
    # Check environment variable
    env_key = os.getenv('OPENROUTER_API_KEY')
    print(f"Environment variable OPENROUTER_API_KEY: {'SET' if env_key else 'NOT SET'}")
    if env_key:
        print(f"Key starts with: {env_key[:20]}...")
    
    # Test with both methods
    success1 = test_openrouter_with_requests()
    success2 = test_openrouter_with_openai()
    
    return success1 or success2

if __name__ == "__main__":
    success = test_openrouter_connection()
    sys.exit(0 if success else 1)
