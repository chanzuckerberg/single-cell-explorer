import logging

import boto3
from flask import json

from server.common.errors import SecretKeyRetrievalError  # type: ignore


def get_secret_key(secret_name, region_name="us-west-2"):  # type: ignore
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region_name)

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
        if "SecretString" in get_secret_value_response:
            var = get_secret_value_response["SecretString"]
            secret = json.loads(var)
            return secret
    except Exception as e:
        logging.critical(f"Caught exception during get_secret_key, {e}", exc_info=True)
        raise SecretKeyRetrievalError(str(e)) from None

    return None
