# Developer guidelines

## Requirements

- npm
- Python 3.6+
- Chrome

**All instructions are expected to be run from the top level single-cell-explorer directory unless otherwise specified.**

### Environment

For all `make` commands, `common.mk` automatically checks whether required environment variables are set and, if they are not set, assigns them default values from `environment.default.json`.

You can set these environment variables manually with the `export` shell command, as in `export JEST_ENV=debug`, or you can just pass the variables as part of the command. E.g., `HEADFUL=true make e2e` or `JEST_ENV=debug npm run e2e`

## Running test suite

Client and server tests run on Travis CI for every push, PR, and commit to `main` on github. End to end tests run nightly on `main` only.

### Unit tests

Steps to run the all unit tests:

1. Start in the project root directory
1. `make dev-env`
1. `make unit-test`

To run unit tests for the `client` code only:

1. Start in the project root directory
1. `cd client`
1. `make unit-test`

### End to end tests

To run E2E tests, run `make smoke-test`

#### Flags

1. `JEST_ENV`: This enables the following E2E test options. You can find their corresponding configs in [`jest-puppeteer.config.js`](../client/jest-puppeteer.config.js):

   - `dev` - opens window, runs tests with minimal slowdown, close on exit.
   - `debug` - opens window, runs tests with 100ms slowdown, dev tools open, chrome stays open on exit.
   - `prod`[default] - run headless with no slowdown, window will not open.

2. `HEADFUL`: Default is `false`. When set to `true`, it will launch the Chrome window for visual inspection. E.g., `HEADFUL=true npm run e2e`

3. `HEADLESS`: Default is `true`. When set to `false`, it will launch the Chrome window for visual inspection. E.g., `HEADLESS=false npm run e2e`

#### Run end to end tests interactively during development

1. The Explorer requirements should be installed as [specified in client dev](#install)

1. Follow [launch](#launch) instructions for client dev (defaults to `example-dataset/pbmc3k.cxg` dataset unless otherwise specified)

1. Run `npm run e2e` from the `client` directory

1. To debug a failing test, add `debugger` in any line of JS code as breakpoint, and launch the test again with [`ndb`](https://github.com/GoogleChromeLabs/ndb). E.g., `ndb make e2e` or `ndb npm run e2e`.

   1. Please make sure to install `ndb` via `npm install -g ndb`

   1. Check out [Debugging Tips](e2e_tests.md#debugging-tips) for more ideas!

#### To run end to end tests _exactly_ as they will be run on CI use the following command

```shell
JEST_ENV=prod make dev-env smoke-test
```

## Server dev

### Build

Build the client and put static files in place

```make build-for-server-dev```

### Launch

```./launch_dev_server.sh [dataset] [options]```

### Linter

We use [`flake8`](https://github.com/PyCQA/flake8) to lint python and [`black`](https://pypi.org/project/black/) for auto-formatting.

To auto-format code run `make fmt`. To run lint checks on the code run `make lint`.

### Test

If you would like to run the server tests individually, follow the steps below

1. Install development requirements `make dev-env`
1. Run `make unit-test` in the `server/` directory or `make unit-test-server` in the root directory.

### Tips

- Install in a virtualenv
- May need to rebuild/reinstall when you make client changes

## Client dev

### Install

1. Install prereqs for client: `make dev-env`

### Launch

To launch with hot reloading, you need to launch the server and the client separately. Node's hot reloading starts the client on its own node server and auto-refreshes when changes are made to source files.

1. Launch server (the client relies on the REST API being available): `./launch_dev_server.sh [dataset] [options]`
2. Launch client: in `client/` directory run `make start-frontend`
3. Client will be served on `localhost:3000/d/<dataset>`
   - Default base_url of `d` is hard-coded.
   - The `dataset` will be the argument passed to the server launch script OR will default to example dataset
   - The entire url is automatically copied to the clipboard on MacOS -- simply paste in browser address bar

### Build

To build only the client: `make build-client`

### Linter

We use `eslint` to lint the code and `prettier` as our code formatter.

### Test

If you would like to run the client tests individually, follow the steps below in the `client` directory

1. For unit tests run `make unit-test`
1. For the smoke test run `make smoke-test` for the standard smoke test suite and `make smoke-test-annotations` for the annotations test suite.

If you would like to run the smoke tests against a hot-reloaded version of the client:

1. Start the hot-reloading servers as described in the [Client dev section](#client-dev). If you plan to run the standard test suite (without annotations), you'll have to start the backend server with annotations disabled (e.g. `./launch_dev_server.sh --debug --disable-annotations`).
1. From the project root, `cd client`
1. Run either the standard E2E test suite with `npm run e2e` or the annotations test suite with `npm run e2e-annotations`

### Tips

- You can also launch the server side code from npm scrips (requires python3.6 with virtualenv) with the `scripts/backend_dev` script.

- Check out [e2e Tests](e2e_tests.md) for more details
