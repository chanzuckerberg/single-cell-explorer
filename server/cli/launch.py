import errno
import functools
import os
import sys
import webbrowser
from logging import Logger, getLogger, ERROR
from typing import List

import click

from server.common.config.app_config import AppConfig, ServerConfig
from server.common.errors import DatasetAccessError, ConfigurationError
from server.common.utils.utils import sort_options
from server.default_config import default_config
from server.tests.unit import TestServer

log: Logger = getLogger("werkzeug")
DEFAULT_CONFIG = AppConfig()


def config_args(func):
    @click.option(
        "--max-category-items",
        default=DEFAULT_CONFIG.default_dataset_config.presentation__max_categories,
        metavar="<integer>",
        show_default=True,
        help="Will not display categories with more distinct values than specified.",
    )
    @click.option(
        "--disable-custom-colors",
        is_flag=True,
        default=False,
        show_default=False,
        help="Disable user-defined category-label colors drawn from source data file.",
    )
    @click.option(
        "--diffexp-lfc-cutoff",
        "-de",
        default=DEFAULT_CONFIG.default_dataset_config.diffexp__lfc_cutoff,
        show_default=True,
        metavar="<float>",
        help="Minimum log fold change threshold for differential expression.",
    )
    @click.option(
        "--disable-diffexp",
        is_flag=True,
        default=not DEFAULT_CONFIG.default_dataset_config.diffexp__enable,
        show_default=False,
        help="Disable on-demand differential expression.",
    )
    @click.option(
        "--embedding",
        "-e",
        default=DEFAULT_CONFIG.default_dataset_config.embeddings__names,
        multiple=True,
        show_default=False,
        metavar="<text>",
        help="Embedding name, eg, 'umap'. Repeat option for multiple embeddings. Defaults to all.",
    )
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


def server_args(func):
    @click.option(
        "--debug",
        "-d",
        is_flag=True,
        default=DEFAULT_CONFIG.server_config.app__debug,
        show_default=True,
        help="Run in debug mode. This is helpful for cellxgene developers, "
        "or when you want more information about an error condition.",
    )
    @click.option(
        "--verbose",
        "-v",
        is_flag=True,
        default=DEFAULT_CONFIG.server_config.app__verbose,
        show_default=True,
        help="Provide verbose output, including warnings and all server requests.",
    )
    @click.option(
        "--port",
        "-p",
        metavar="<port>",
        default=DEFAULT_CONFIG.server_config.app__port,
        type=int,
        show_default=True,
        help="Port to run server on. If not specified cellxgene will find an available port.",
    )
    @click.option(
        "--host",
        metavar="<IP address>",
        default=DEFAULT_CONFIG.server_config.app__host,
        show_default=False,
        help="Host IP address. By default cellxgene will use localhost (e.g. 127.0.0.1).",
    )
    @click.option(
        "--scripts",
        "-s",
        default=DEFAULT_CONFIG.default_dataset_config.app__scripts,
        multiple=True,
        metavar="<text>",
        help="Additional script files to include in HTML page. If not specified, "
        "no additional script files will be included.",
        show_default=False,
    )
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


def launch_args(func):
    @config_args
    @server_args
    @click.option(
        "--dataroot",
        default=DEFAULT_CONFIG.server_config.multi_dataset__dataroot,
        metavar="<data directory>",
        help="Enable cellxgene to serve multiple files. Supply path (local directory or URL)"
        " to folder containing CXG datasets.",
        hidden=True,
    )  # TODO, unhide when dataroot is supported)
    @click.argument("dataroot", required=False, metavar="<path to data file>")
    @click.option(
        "--open",
        "-o",
        "open_browser",
        is_flag=True,
        default=DEFAULT_CONFIG.server_config.app__open_browser,
        show_default=True,
        help="Open web browser after launch.",
    )
    @click.option(
        "--config-file",
        "-c",
        "config_file",
        default=None,
        show_default=True,
        help="Location to yaml file with configuration settings",
    )
    @click.option(
        "--dump-default-config",
        "dump_default_config",
        is_flag=True,
        default=False,
        show_default=True,
        help="Print default configuration settings and exit",
    )
    @click.help_option("--help", "-h", help="Show this message and exit.")
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)

    return wrapper


def handle_scripts(scripts):
    if scripts:
        click.echo(
            r"""
    / / /\ \ \__ _ _ __ _ __ (_)_ __   __ _
    \ \/  \/ / _` | '__| '_ \| | '_ \ / _` |
     \  /\  / (_| | |  | | | | | | | | (_| |
      \/  \/ \__,_|_|  |_| |_|_|_| |_|\__, |
                                      |___/
    The --scripts flag is intended for developers to include google analytics etc. You could be opening yourself to a
    security risk by including the --scripts flag. Make sure you trust the scripts that you are including.
            """
        )
        scripts_pretty = ", ".join(scripts)
        click.confirm(f"Are you sure you want to inject these scripts: {scripts_pretty}?", abort=True)


@sort_options
@click.command(
    short_help="Launch the cellxgene data viewer. " "Run `cellxgene launch --help` for more information.",
    options_metavar="<options>",
)
@launch_args
def launch(
    dataroot,
    verbose,
    debug,
    open_browser,
    port,
    host,
    embedding,
    max_category_items,
    disable_custom_colors,
    diffexp_lfc_cutoff,
    scripts,
    disable_diffexp,
    config_file,
    dump_default_config,
):
    """Launch the cellxgene data viewer.
    This web app lets you explore single-cell expression data.
    Data must be in a format that cellxgene expects.

    Examples:

    Use default dataroot with specific config file via config option:
    > python -m server.cli.launch -c config/config_file.yaml

    Specify dataroot via argument:
    > python -m server.cli.launch data/other_data_root/

    """

    project_root = os.getenv("PROJECT_ROOT") or os.getcwd()
    test_dataset_dir: str = os.path.join(project_root, "example-dataset/")
    test_config_file: str = os.path.join(project_root, "client/__tests__/e2e/test_config.yaml")

    dataroot: str = dataroot if dataroot else test_dataset_dir
    config_file: str = config_file if config_file else test_config_file

    if not os.path.isdir(dataroot):
        log.error(f"{dataroot} is not a directory -- please provide the root directory for your dataset(s)")
        sys.exit(1)

    if dump_default_config:
        print(default_config)
        sys.exit(0)
    # Startup message
    click.echo("[cellxgene] Starting the development server...")

    # app config
    app_config: AppConfig = AppConfig()
    server_config: ServerConfig = app_config.server_config

    try:
        if config_file:
            app_config.update_from_config_file(config_file)

        # Determine which config options were give on the command line.
        # Those will override the ones provided in the config file (if provided).
        cli_config: AppConfig = AppConfig()
        cli_config.update_server_config(
            app__verbose=verbose,
            app__debug=debug,
            app__host=host,
            app__port=port,
            app__open_browser=open_browser,
            multi_dataset__dataroot=dataroot,
        )
        cli_config.update_default_dataset_config(
            app__scripts=scripts,
            presentation__max_categories=max_category_items,
            presentation__custom_colors=not disable_custom_colors,
            embeddings__names=embedding,
            diffexp__enable=not disable_diffexp,
            diffexp__lfc_cutoff=diffexp_lfc_cutoff,
        )

        diff: List[tuple] = cli_config.server_config.changes_from_default()
        changes = {key: val for key, val, _ in diff}
        app_config.update_server_config(**changes)

        diff: List[tuple] = cli_config.default_dataset_config.changes_from_default()
        changes = {key: val for key, val, _ in diff}
        app_config.update_default_dataset_config(**changes)

        # process the configuration
        #  any errors will be thrown as an exception.
        #  any info messages will be passed to the messagefn function.

        def messagefn(message):
            click.echo("[cellxgene] " + message)

        # Use a default secret if one is not provided
        if not server_config.app__flask_secret_key:
            app_config.update_server_config(app__flask_secret_key="SparkleAndShine")

        app_config.complete_config(messagefn)

    except (ConfigurationError, DatasetAccessError) as e:
        raise click.ClickException(e)

    handle_scripts(scripts)

    # create the server
    server: TestServer = TestServer(app_config)

    if not server_config.app__verbose:
        log.setLevel(ERROR)

    cellxgene_url: str = f"http://{app_config.server_config.app__host}:{app_config.server_config.app__port}"
    if server_config.app__open_browser:
        click.echo(f"[cellxgene] Launching! Opening your browser to {cellxgene_url} now.")
        webbrowser.open(cellxgene_url)
    else:
        click.echo(f"[cellxgene] Launching! Please go to {cellxgene_url} in your browser.")

    click.echo("[cellxgene] Type CTRL-C at any time to exit.")

    if not server_config.app__verbose:
        f = open(os.devnull, "w")
        sys.stdout = f

    try:
        server.app.run(
            host=server_config.app__host,
            debug=server_config.app__debug,
            port=server_config.app__port,
            threaded=not server_config.app__debug,
            use_debugger=False,
            use_reloader=False,
        )
    except OSError as e:
        if e.errno == errno.EADDRINUSE:
            raise click.ClickException("Port is in use, please specify an open port using the --port flag.") from e
        raise


if __name__ == "__main__":
    launch()
