include ../common.mk

.PHONY: clean
clean:
	rm -f common/web/templates/index.html
	rm -rf common/web/static
	rm -f common/web/csp-hashes.json

.PHONY: unit-test
unit-test:
	PYTHONWARNINGS=ignore:ResourceWarning coverage run \
		--source=app,common,compute,dataset,eb \
		--omit=.coverage,venv \
		-m unittest discover \
		--start-directory tests/unit \
		--top-level-directory .. \
		--verbose; test_result=$$?; \
	exit $$test_result \


.PHONY: test-annotations-performance
test-annotations-performance:
	python tests/performance/performance_test_annotations_backend.py

.PHONY: test-annotations-scale
test-annotations-scale:
	locust -f tests/performance/scale_test_annotations.py --headless -u 30 -r 10 --host https://api.cellxgene.dev.single-cell.czi.technology/cellxgene/e/ --run-time 5m 2>&1 | tee locust_dev_stats.txt

.PHONY: e2e
e2e:
	python -m unittest discover \
	--start-directory tests/e2e \
	--top-level-directory .. \
	--verbose; test_result=$$?; \


# Bundles the application so that it can be dockerized and run in ECS
.PHONY: build-ecs
build-ecs:
	$(call copy_client_assets,/../client/build,/../server/common/web) ; \
	cp /../client/build/index.html /../server/common/web/templates/index.html ; \
	cp -r /../client/build/* /../server/common/web/. ;

{
  "created_at": 1666217509.553743,
  "cxg_status": null,
  "dataset_id": "df2171f0-9ddc-45ae-b3cd-70a881ffed40",
  "h5ad_status": null,
  "id": "e6c9f4c7-39b8-4043-92a2-9f22bcf43146",
  "processing_status": "PENDING",
  "rds_status": null,
  "updated_at": 1666221494.436323,
  "upload_message": "403 Client Error: Forbidden for url: https://submissions-lattice.s3.amazonaws.com/cxg_migration/Lattice_migration_3.0.0/Public_datasets/8e880741-bf9a-4c8e-9227-934204631d2a_ff77ee42-ed01-4e50-8413-4cea1f6fbcbc_LATDF491NZM_v5.h5ad?AWSAccessKeyId=AKIAYQQPUH52WSVPFZMX&Signature=oOeb%2Flmnx20oF%2FthpuFPU7GYXsI%3D&Expires=1666221109",
  "upload_progress": 0.0,
  "upload_status": "FAILED",
  "validation_message": null,
  "validation_status": null
}
