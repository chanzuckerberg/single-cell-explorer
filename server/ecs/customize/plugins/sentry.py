import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn="https://90fcc541642548e19559232a1f90d6d4@sentry.prod.si.czi.technology/35",
    release="cellxgene@89e398bd.32384b9",
    environment="staging",
    integrations=[FlaskIntegration()],
)
