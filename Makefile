include common.mk

BUILDDIR := build
CLIENTBUILD := $(BUILDDIR)/client
CZIHOSTEDBUILD := $(BUILDDIR)/backend/czi_hosted
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
	cd backend/czi_hosted && $(MAKE) clean

# BUILDING PACKAGE

.PHONY: build-client
build-client:
	cd client && $(MAKE) ci build

.PHONY: build-czi-hosted
build-czi-hosted: clean build-client
	git ls-files backend/czi_hosted/ | grep -v 'backend/czi_hosted/test/' | cpio -pdm $(BUILDDIR)
	cp -r client/build/  $(CLIENTBUILD)
	$(call copy_client_assets,$(CLIENTBUILD),$(CZIHOSTEDBUILD))
	cp -r backend/common $(BUILDDIR)/backend/common
	cp backend/__init__.py $(BUILDDIR)
	cp backend/__init__.py $(BUILDDIR)/backend
	cp MANIFEST_hosted.in README.md setup.cfg setup_hosted.py $(BUILDDIR)
	mv $(BUILDDIR)/setup_hosted.py $(BUILDDIR)/setup.py
	mv $(BUILDDIR)/MANIFEST_hosted.in $(BUILDDIR)/MANIFEST.in

# If you are actively developing in the backend folder use this, dirties the source tree
.PHONY: build-for-czi-hosted-dev
build-for-czi-hosted-dev: clean-czi-hosted build-client
	$(call copy_client_assets,client/build,backend/czi_hosted)

.PHONY: copy-client-assets-czi-hosted
copy-client-assets-czi-hosted:
	$(call copy_client_assets,client/build,backend/czi_hosted)


.PHONY: test-czi-hosted
test-czi-hosted: unit-test-czi-hosted unit-test-common smoke-test

.PHONY: unit-test-client
unit-test-client:
	cd client && $(MAKE) unit-test

.PHONY: unit-test-czi-hosted
unit-test-czi-hosted:
	cd backend/czi_hosted && $(MAKE) unit-test


.PHONY: unit-test-common
unit-test-common:
	cd backend/common && $(MAKE) unit-test

.PHONY: smoke-test
smoke-test:
	cd client && $(MAKE) smoke-test

.PHONY: smoke-test-annotations
smoke-test-annotations:
	cd client && $(MAKE) smoke-test-annotations

.PHONY: test-db
test-db:
	cd backend/czi_hosted && $(MAKE) test-db

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
	flake8 backend/czi_hosted --per-file-ignores='backend/test/fixtures/czi_hosted_dataset_config_outline.py:F821 backend/test/fixtures/czi_hosted_server_config_outline.py:F821 backend/test/performance/scale_test_annotations.py:E501'

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
	pip install -r backend/czi_hosted/requirements-dev.txt

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

