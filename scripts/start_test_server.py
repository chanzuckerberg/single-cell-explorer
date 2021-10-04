import errno
import os
from argparse import ArgumentParser

from server.common.config.app_config import AppConfig
from server.common.config.server_config import ServerConfig
from server.tests.unit import TestServer

# Allow user to set dataset and config files for development
arg_parser: ArgumentParser = ArgumentParser()
arg_parser: ArgumentParser = ArgumentParser()
arg_parser.add_argument("project_root", nargs="?")
[arg_parser.add_argument(arg, required=False, default="") for arg in ("--dataset", "--config")]
args = arg_parser.parse_args()
project_root: str = args.project_root
dataset_file: str = args.dataset
config_file: str = args.config

# Default settings for tests
DATASET_DIR: str = f"{os.path.join(project_root, 'example-dataset/')}"
CONFIG_FILE: str = f"{os.path.join(project_root, 'client/__tests__/e2e/test_config.yaml')}"

if dataset_file:
    dataset_file: str = dataset_file if os.path.isabs(dataset_file) else os.path.abspath(dataset_file)
    DATASET_DIR: str = os.path.dirname(dataset_file)
if config_file:
    CONFIG_FILE: str = config_file if os.path.isabs(config_file) else os.path.join(os.getcwd(), config_file)

# Create AppConfig and update ServerConfig for test server instance
app_config: AppConfig = AppConfig()
app_config.update_from_config_file(CONFIG_FILE)
server_config: ServerConfig = app_config.server_config

app_config.update_server_config(
                app__flask_secret_key="SparkleAndShine",
                multi_dataset__dataroot=DATASET_DIR
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
