include common.mk

BUILDDIR := build
CLIENTBUILD := $(BUILDDIR)/client
CZIHOSTEDBUILD := $(BUILDDIR)/server
CLEANFILES :=  $(BUILDDIR)/ client/build build dist cellxgene.egg-info

PART ?= patch

# CLEANING
.PHONY: clean
clean: clean-lite clean-czi-hosted clean-client

# cleaning the client's node_modules is the longest one, so we avoid that if possible
.PHONY: clean-lite
clean-lite:
	rm -rf $(CLEANFILES)

.PHONY: clean-client
clean-client:
	cd client && $(MAKE) clean

.PHONY: clean-czi-hosted
clean-czi-hosted:
	cd server && $(MAKE) clean

# BUILDING PACKAGE

.PHONY: build-client
build-client:
	cd client && $(MAKE) ci build

.PHONY: build-czi-hosted
build-czi-hosted: clean build-client
	git ls-files server/ | grep -v 'server/tests/' | cpio -pdm $(BUILDDIR)
	cp -r client/build/  $(CLIENTBUILD)
	$(call copy_client_assets,$(CLIENTBUILD),$(CZIHOSTEDBUILD))
	cp -r server/common $(BUILDDIR)/server/common
	cp server/__init__.py $(BUILDDIR)
	cp server/__init__.py $(BUILDDIR)/server
	cp MANIFEST.in README.md setup.cfg setup.py $(BUILDDIR)

# If you are actively developing in the server folder use this, dirties the source tree
.PHONY: build-for-czi-hosted-dev
build-for-czi-hosted-dev: clean-czi-hosted build-client
	$(call copy_client_assets,client/build,server)

.PHONY: copy-client-assets-czi-hosted
copy-client-assets-czi-hosted:
	$(call copy_client_assets,client/build,server)


.PHONY: test-czi-hosted
test-czi-hosted: unit-test-czi-hosted unit-test-common smoke-test

.PHONY: unit-test-client
unit-test-client:
	cd client && $(MAKE) unit-test

.PHONY: unit-test-czi-hosted
unit-test-czi-hosted:
	cd server && $(MAKE) unit-test

.PHONY: smoke-test
smoke-test:
	cd client && $(MAKE) smoke-test

.PHONY: smoke-test-annotations
smoke-test-annotations:
	cd client && $(MAKE) smoke-test-annotations

# FORMATTING CODE

.PHONY: fmt
fmt: fmt-client fmt-py

.PHONY: fmt-client
fmt-client:
	cd client && $(MAKE) fmt

.PHONY: fmt
fmt-py:
	black .

.PHONY: lint
lint: lint-czi-hosted-server lint-client

.PHONY: lint-czi-hosted-server
lint-czi-hosted-server: fmt-py
	flake8 server --exclude server/tests/ --per-file-ignores='server/tests/fixtures/czi_hosted_dataset_config_outline.py:F821 server/tests/fixtures/czi_hosted_server_config_outline.py:F821 server/tests/performance/scale_test_annotations.py:E501'

.PHONY: lint-client
lint-client:
	cd client && $(MAKE) lint

# CREATING DISTRIBUTION RELEASE

.PHONY: pydist-czi-hosted
pydist-czi-hosted: build-czi-hosted
	cd $(BUILDDIR); python setup.py sdist -d ../dist
	@echo "done"

.PHONY: dev-env
dev-env: dev-env-client dev-env-czi-hosted

.PHONY: dev-env-client
dev-env-client:
	cd client && $(MAKE) ci


.PHONY: dev-env-czi-hosted
dev-env-czi-hosted:
	pip install -r server/requirements-dev.txt

# quicker than re-building client
.PHONY: gen-package-lock
gen-package-lock:
	cd client && $(MAKE) install

# INSTALL

# install from source tree for development
.PHONY: install-dev
install-dev: uninstall
	pip install -e .

# install from dist
.PHONY: install-dist
install-dist: uninstall
	pip install dist/cellxgene*.tar.gz

.PHONY: uninstall
uninstall:
	pip uninstall -y cellxgene || :

