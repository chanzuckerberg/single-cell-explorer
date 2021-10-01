import errno
import sys

from server.common.config.app_config import AppConfig
from server.common.config.server_config import ServerConfig
from server.tests.unit import TestServer

PROJECT_ROOT: str = sys.argv[1]

TEST_CONFIG_FILE = f"{PROJECT_ROOT}/client/__tests__/e2e/test_config.yaml"
DATASET_DATAPATH = f"{PROJECT_ROOT}/example-dataset"
DATASET = "pbmc3k.h5ad"

# Create AppConfig and update ServerConfig for test server instance
app_config: AppConfig = AppConfig()
app_config.update_from_config_file(TEST_CONFIG_FILE)
server_config: ServerConfig = app_config.server_config

app_config.update_server_config(
                app__flask_secret_key="SparkleAndShine",
                multi_dataset__dataroot=DATASET_DATAPATH
            )
app_config.complete_config()

server: TestServer = TestServer(app_config)

try:
    server.app.run(
        host=server_config.app__host,
        debug=server_config.app__debug,
        port=server_config.app__port,
        threaded=not server_config.app__debug,
        use_reloader=False,
    )
except OSError as e:
    if e.errno == errno.EADDRINUSE:
        raise Exception("Port is in use, please specify an open port using the --port flag.") from e
    raise
