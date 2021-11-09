def get_data_adaptor(s3_uri: str = None):
    app_config = current_app.app_config
    return MatrixDataLoader(location=s3_uri, app_config=app_config).validate_and_open()


def rest_get_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, s3_uri=None):
        try:
            s3_uri = unquote(s3_uri) if s3_uri else s3_uri
            data_adaptor = get_data_adaptor(s3_uri)
            return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            return common_rest.abort_and_log(
                e.status_code, f"Invalid s3_uri {s3_uri}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )

    return wrapped_function
