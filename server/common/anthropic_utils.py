import os


def get_anthropic_api_key():
    """Get Anthropic API key from environment variables"""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key is None:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
    return api_key
