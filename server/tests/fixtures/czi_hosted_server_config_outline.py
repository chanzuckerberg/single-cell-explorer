f"""server:
  app:
    verbose: {verbose}
    debug: {debug}
    host: {host}
    port: {port}
    open_browser: {open_browser}
    force_https: {force_https}
    flask_secret_key: {flask_secret_key}
    generate_cache_control_headers: {generate_cache_control_headers}
    server_timing_headers: {server_timing_headers}
    csp_directives: {csp_directives}
    api_base_url: {api_base_url}
    web_base_url: {web_base_url}

  multi_dataset:
    dataroot: {dataroot}
    index: {index}
    allowed_matrix_types: {allowed_matrix_types}

  single_dataset:
    datapath: {dataset_datapath}
    obs_names: {obs_names}
    var_names: {var_names}
    about: {about}
    title: {title}

  data_locator:
    api_base: {data_locator_api_base}
    s3:
      region_name: {data_locator_region_name}

  adaptor:
    cxg_adaptor:
      tiledb_ctx:
        sm.tile_cache_size:  {cxg_tile_cache_size}
        sm.num_reader_threads:  {cxg_num_reader_threads}

  limits:
    column_request_max: {column_request_max}
    diffexp_cellcount_max: {diffexp_cellcount_max}
"""
