import os

from flask import current_app

from server.common.utils.aws_secret_utils import get_secret_key


def get_openai_api_key():
    deployment_stage = os.getenv("DEPLOYMENT_STAGE", "test")
    if deployment_stage == "test":
        return os.getenv("OPENAI_API_KEY")
    return get_secret_key(f"{deployment_stage}/explorer/agent", region_name="us-west-2")["OPENAI_API_KEY"]


def get_cached_openai_api_key():
    """Get OpenAI API key from cache or fetch it if not cached"""
    if not hasattr(current_app, "openai_api_key"):
        current_app.openai_api_key = get_openai_api_key()
    return current_app.openai_api_key
