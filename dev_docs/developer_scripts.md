# Developer convenience scripts

This document describes scripts for accelerating explorer development.

Paths are relative to the root project directory. If you need to know what
this is, run `PROJECT_ROOT=$(git rev-parse --show-toplevel); echo
$PROJECT_ROOT`.

## Project-level scripts

### Build

**Usage:** from the `$PROJECT_ROOT` directory run:
* `make build` builds whole app client and server
* `make build-client` runs webpack build
* `make build-for-server-dev` builds client and copies output directly into
  source tree (only for server devlopment)

### Clean

Deletes generated files.

**Usage:** from the `$PROJECT_ROOT` directory run:
* `make clean` cleans everything including node modules (means build with take
  a while
* `make clean-lite` cleans built directories
* `make clean-server` cleans source tree

### Release

See `release_process.md`.

### Development environment

Installs requirements files.

**Usage:** from the `$PROJECT_ROOT` directory run:
* `make dev-env` installs requirements and requirements-dev (for building code)

## Client-level scripts

### Running the client

#### start-frontend

**About** Serve the current client javascript independently from the `server` code.

**Requires**
* The server to be running. Best way to do this is with [backend_dev](#backend_dev).
* `make ci` to install the necessary node modules

**Usage:** from the `$PROJECT_ROOT/client` directory run `make start-frontend`

NB: the frontend server reads in the desired base_url and dataset name to form the complete url base for API calls. *In 
order to use an arbitrary dataset successfully, the frontend server must be started **after** the backend server*, which 
writes out the given base_url and dataset anew each time.

#### backend_dev

**About** This script enables FE developers to run the REST API necessary to
back the development server for the front end. It is intended to ensure that
the FE developer gets the current version of the backend with a single command
and no knowledge of python necessary. It creates and activates a virtual
environment and installs explorer requirements from the current branch.

**Requires** `Python3.6+`, `virtual-env`, `pip`

**Usage:** from the `$PROJECT_ROOT` directory run `./scripts/backend_dev`

**Options:**
* In parallel, you can then launch the node development server to serve the
  current state of the FE with [`start-frontend`](#start-frontend), usually in
  a different terminal tab.
* You can use a specific dataroot using `./launch_dev_server.sh <custom_dataroot>`.
* You can also pass (current/desktop/legacy) cli options to the `./launch_dev_server.sh` command.

**Breakdown**

| command                                  | purpose                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| python3.6 -m venv explorer               | creates explorer virtual environment                        |
| source explorer/bin/activate             | activates virtual environment                               |
| ./launch_dev_server.sh [cli options]     | launches api server (can supply arbitrary config)           |

### Client test scripts

Methods used to test the client javascript code

**Usage:** from the `$PROJECT_ROOT/client` directory run:
* `make unit-test` Runs all unit tests. It excludes any tests in the e2e
  folder. This is used by travis to run unit tests.
* `make smoke-test` Starts backend development server and runs end to end
  tests. This is what travis runs. It depends on the `e2e` and the
  `backend-dev` targets. One starts the server, the other runs the tests. If
  developing a front-end feature and just checking if tests pass, this is
  probably the one you want to run.
* `npm run e2e` Runs backend tests without starting the server. You will need to
  start the rest api separately with the pbmc3k.cxg file. Note you can use
  the `JEST_ENV` environment variable to change how JEST runs in the browser.
  The test runs against `localhost:3000` by default. You can use the
  `CXG_URL_BASE` env variable to test non-localhost deployments of explorer.
