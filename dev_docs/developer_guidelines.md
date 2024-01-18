# Developer guidelines

## Requirements

- npm
- Python 3.6+
- Chrome

**All instructions are expected to be run from the top level single-cell-explorer directory unless otherwise specified.**

### Environment

For all `make` commands, `common.mk` automatically checks whether required environment variables are set and, if they are not set, assigns them default values from `environment.default.json`.

You can set these environment variables manually with the `export` shell command, as in `export JEST_ENV=debug`, or you can just pass the variables as part of the command. E.g., `HEADFUL=true make e2e` or `JEST_ENV=debug npm run e2e`

## Start developing locally

1. Ensure that you have a [Python virtual environment](https://docs.python.org/3/library/venv.html) set up and activated (`source venv/bin/activate`).
1. Run `make dev-env` to install the appropriate dependencies for both the frontend and backend.

### If you are only developing for the server...

1. Run `make build-for-server-dev`. This will build the client and put static files in place.
1. Run `./launch_dev_server.sh [dataset] [options]`. This will launch at server at http://localhost:5005.
   1. Note: you will need to ensure that the dataset format is in CXG. A small dataset is included in this repository [here](https://github.com/chanzuckerberg/single-cell-explorer/tree/main/example-dataset/pbmc3k.cxg). To use this dataset, you would run `./launch_dev_server.sh example-dataset/ [options]`. Note that the `pbmc3k.cxg` is not specified in the command because the program expects a directory of datasets.
1. You may navigate to http://localhost:5005/d/{dataset_name} to view the dataset. Note that there will not be hot-loading for the frontend if you make changes to the client.

If you make changes to the server, you will need to restart the server in order for the changes to take.

### If you are also developing for the frontend...

To launch with hot reloading, you need to launch the server and the client separately. Node's hot reloading starts the client on its own node server and auto-refreshes when changes are made to source files.

1. First, ensure that you have a server running.
1. Run `cd client/` and then `make start-frontend`.
1. Navigate to `localhost:3000/d/<dataset>` in your web browser. This is where your client will be served.
   - Default base_url of `d` is hard-coded.
   - The `dataset` will be the argument passed to the server launch script OR will default to example dataset.
   - The entire url is automatically copied to the clipboard on MacOS -- simply paste in browser address bar.

Note: in case you need to just build the client alone, you can run `make build-client`.

### If you have an M1 or M2 chip...

Attempting to run Explorer locally (server and/or client) will fail with something that looks like:

```
npm ERR! The chromium binary is not available for arm64.
npm ERR! If you are on Ubuntu, you can install with:
npm ERR!
npm ERR!  sudo apt install chromium
npm ERR!
npm ERR!
npm ERR!  sudo apt install chromium-browser
```

Puppeteer is a dependency for e2e tests, but it's not used for running Explorer locally. If you want to run Explorer locally, you can get around this by setting `export PUPPETEER_SKIP_DOWNLOAD=true` in your virtual environment. That will skip the Puppeteer installation.

If you want to actually run e2e tests, then you'll need to set up Chromium to enable Puppeteer. [This blog post](https://broddin.be/2022/09/19/fixing-the-chromium-binary-is-not-available-for-arm64/) should show you how to do that on an M1/M2 machine.

### Mocking the dataset-metadata endpoint

The dataset-metadata endpoint requires using data-portal. A true local build would require running an instance of data-portal locally. An easier solution that works for most use cases is to just mock the response of dataset-metadata. To do this, you can update the `DatasetMetadataAPI` class in `server/app/api/v3.py` to:

```
class DatasetMetadataAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    @rest_get_dataset_explorer_location_data_adaptor
    def get(self, data_adaptor):
        with open("server/tests/fixtures/liver_dataset_metadata_response.json", "r") as file:
            mock_response = json.load(file)

        json_response = json.dumps(mock_response)
        return Response(json_response, content_type='application/json')
```

Note that you'll need to `import json` and also add `Response` to the `flask` import. This will mock the expected response to the `liver.cxg` dataset that is in the `example-dataset/` directory. After updating the mock response, you can build the backend + frontend the same way you normally would.

### Before you request a PR review...

Please lint and format your code before requesting a PR review.

We use [`flake8`](https://github.com/PyCQA/flake8) to lint Python and [`black`](https://pypi.org/project/black/) for auto-formatting Python. The frontend Javascript/Typescript code is linted by `eslint` and formatted by `prettier`.

1. Format your code by running `make fmt`. Note that this command will make changes to your files that you will need to commit to your branch.
1. Lint your code by running `make lint`. This command will only emit errors and warnings and will not make changes to your files. You will have to manually address the issues.

## How to run tests

Client and server tests run on [Github Actions](https://github.com/chanzuckerberg/single-cell-explorer/actions/workflows/push_tests.yml) for every push, PR, and commit to `main` on Github. Smoke tests are run upon every dev deployment which occurs automatically every time a PR merged into `main`.

### Pre-requisites

1. Start in the project root directory
1. Run `make dev-env`

### Testing Command Cheat Sheet

| What are you testing                                                  | Command                    |
| --------------------------------------------------------------------- | -------------------------- |
| I want to run unit tests for the backend only.                        | `make unit-test-server`    |
| I want to run unit tests for the frontend only.                       | `make unit-test-client`    |
| I want to run unit and smoke tests for the backend.                   | `make test-server`         |
| I want to only run smoke tests.                                       | `make smoke-test`          |
| I want to run smoke tests against my hot-loaded verion of the client. | `cd client && npm run e2e` |

### Flags

1. `JEST_ENV`: This enables the following E2E test options. You can find their corresponding configs in [`jest-puppeteer.config.js`](../client/jest-puppeteer.config.js):

   - `dev` - opens window, runs tests with minimal slowdown, close on exit.
   - `debug` - opens window, runs tests with 100ms slowdown, dev tools open, chrome stays open on exit.
   - `prod`[default] - run headless with no slowdown, window will not open.

1. `HEADFUL`: Default is `false`. When set to `true`, it will launch the Chrome window for visual inspection. E.g., `HEADFUL=true npm run e2e`

1. `HEADLESS`: Default is `true`. When set to `false`, it will launch the Chrome window for visual inspection. E.g., `HEADLESS=false npm run e2e`

### Run end to end tests interactively during development

1. The Explorer requirements should be installed as [specified in client dev](#Start-developing-locally)
1. Follow [launch](#If-you-are-also-developing-for-the-frontend...) instructions for client dev (defaults to `example-dataset/pbmc3k.cxg` dataset unless otherwise specified)
1. Run `npm run e2e` from the `client` directory
1. To debug a failing test, add `debugger` in any line of JS code as breakpoint, and launch the test again with [`ndb`](https://github.com/GoogleChromeLabs/ndb). E.g., `ndb make e2e` or `ndb npm run e2e`.

   1. Please make sure to install `ndb` via `npm install -g ndb`
   1. Check out [Debugging Tips](e2e_tests.md#debugging-tips) for more ideas!

**See more** on E2E testing [here](e2e_tests.md).

#### To run end to end tests _exactly_ as they will be run on CI use the following command

```shell
JEST_ENV=prod make dev-env smoke-test
```
