import os
env = os.getenv("HAPPY_ENV")

assert(env is not None, "No HAPPY_ENV specified")

config = f"""
server:
  app:
    verbose: true
    debug: true
    host: 0.0.0.0
    port: null
    open_browser: false
    force_https: false
    flask_secret_key: "asd"
    generate_cache_control_headers: true
    server_timing_headers: true
    csp_directives:
      img-src:
        - https://www.google-analytics.com
      script-src:
        - https://www.google-analytics.com
        - https://ssl.google-analytics.com
        - browser.sentry-cdn.com
      connect-src:
        - https://www.google-analytics.com
        - sentry.prod.si.czi.technology

    api_base_url: https://{env}-explorer.rdev.single-cell.czi.technology/cellxgene/
    web_base_url: https://{env}-explorer.rdev.single-cell.czi.technology/

  multi_dataset:
    dataroot:
      covid19:
        base_url: d
        dataroot: s3://env-rdev-cellxgene/{env}
      corpora_data_portal:
        base_url: e
        dataroot: s3://env-rdev-cellxgene/{env}

    # The index page when in multi-dataset mode:
    #   false or null:  this returns a 404 code
    #   true:  loads a test index page, which links to the datasets that are available in the dataroot
    #   string/URL:  redirect to this URL:  flask.redirect(config.multi_dataset__index)
    index: https://{env}-explorer.rdev.single-cell.czi.technology/

    # A list of allowed matrix types.  If an empty list, then all matrix types are allowed
    allowed_matrix_types: []

    matrix_cache:
      # The maximum number of datasets that may be opened at one time.  The least recently used dataset
      # is evicted from the cache first.
      max_datasets: 100

      # A matrix is automatically removed from the cache after timelimit_s number of seconds.
      # If timelimit_s is set to None, then there is no time limit.
      timelimit_s: 30

    metadata_cache:
      # The maximum number of datasets that may be opened at one time.  The least recently used dataset
      # is evicted from the cache first.
      max_datasets: 10000
      # A matrix is automatically removed from the cache after timelimit_s number of seconds.
      # If timelimit_s is set to None, then there is no time limit.
      timelimit_s: 300

  diffexp:
    alg_cxg:
      # The number of threads to use is computed from: min(max_workers, cpu_multipler * cpu_count).
      # Where cpu_count is determined at runtime.
      max_workers: 64
      cpu_multiplier: 4

      # The target number of matrix elements that are evaluated
      # together in one thread.
      target_workunit: 16_000_000

  data_locator:
    api_base: https://{env}-backend.rdev.single-cell.czi.technology/dp/v1
    s3:
      # s3 region name.
      #   if true, then the s3 location is automatically determined from the datapath or dataroot.
      #   if false/null, then do not set.
      #   if a string, then use that value (e.g. us-east-1).
      region_name: true

  adaptor:
    cxg_adaptor:
      # The key/values under tiledb_ctx will be used to initialize the tiledb Context.
      # If 'vfs.s3.region' is not set, then it will automatically use the setting from
      # data_locator / s3 / region_name.
      tiledb_ctx:
        sm.tile_cache_size: 60129542144 # 56 GB
        sm.num_reader_threads: 32

    anndata_adaptor:
      backed: false

  limits:
    column_request_max: 32
    diffexp_cellcount_max: 50000

dataset:
  app:
    # Scripts can be a list of either file names (string) or dicts containing keys src, integrity and crossorigin.
    # these will be injected into the index template as script tags with these attributes set.
    scripts:
      - src: "https://browser.sentry-cdn.com/5.15.5/bundle.min.js"
        integrity: "sha384-wF7Jc4ZlWVxe/L8Ji3hOIBeTgo/HwFuaeEfjGmS3EXAG7Y+7Kjjr91gJpJtr+PAT"
        crossorigin: "anonymous"

    # Inline scripts are a list of file names, where the contents of the file will be injected into the index.
    # inline_scripts:
    #  - rdev-ga.js
    #  - staging-sentry.js

    about_legal_tos: /tos/
    about_legal_privacy: /privacy/


  presentation:
    max_categories: 1000
    custom_colors: true

  user_annotations:
    enable: false
    type: hosted_tiledb_array
    hosted_tiledb_array:
      db_uri: null
      hosted_file_directory: s3://hosted-cellxgene-dev/user_annotations/
    local_file_csv:
      directory: null
      file: null

  embeddings:
    names: []

  diffexp:
    enable: true
    lfc_cutoff: 0.01
    top_n: 10
"""

if __name__ == "__main__":
    with open("config.yaml", "w") as f:
        f.write(config)