import os

from flask import current_app

from server.common.utils.aws_secret_utils import get_secret_key


def get_anthropic_api_key():
    deployment_stage = os.getenv("DEPLOYMENT_STAGE", "test")
    if deployment_stage == "test":
        return os.getenv("ANTHROPIC_API_KEY")
    
    secret = get_secret_key(f"{deployment_stage}/explorer/agent", region_name="us-west-2")
    if secret is None:
        raise ValueError(f"Failed to retrieve secret for deployment stage: {deployment_stage}")
    
    return secret["ANTHROPIC_API_KEY"]


def get_cached_anthropic_api_key():
    """Get Anthropic API key from cache or fetch it if not cached"""
    if not hasattr(current_app, "anthropic_api_key"):
        current_app.anthropic_api_key = get_anthropic_api_key()
    return current_app.anthropic_api_key

