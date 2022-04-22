# This deploys a Data Portal stack.
#

data aws_secretsmanager_secret_version config {
  secret_id = var.happy_config_secret
}

locals {
  secret  = jsondecode(data.aws_secretsmanager_secret_version.config.secret_string)
  alb_key = var.require_okta ? "private_albs" : "public_albs"

  custom_stack_name            = var.stack_name
  image_tag                    = var.image_tag
  priority                     = var.priority
  deployment_stage             = var.deployment_stage
  remote_dev_prefix            = var.stack_prefix
  wait_for_steady_state        = var.wait_for_steady_state
  batch_container_memory_limit = var.batch_container_memory_limit

  migration_cmd  = ["make", "-C", "/corpora-data-portal/backend", "db/init_remote_dev"]
  deletion_cmd   = ["make", "-C", "/corpora-data-portal/backend", "db/delete_remote_dev"]
  frontend_cmd   = []
  backend_cmd    = [
    "gunicorn", "--worker-class", "gevent", "--workers", "8", "--bind", "0.0.0.0:5000",
    "backend.corpora.api_server.app:app", "--max-requests", "10000", "--timeout", "30", "--keep-alive", "5",
    "--log-level", "info"
  ]
  data_load_path = "s3://${local.secret["s3_buckets"]["env"]["name"]}/database/dev_data.sql"

  vpc_id                          = local.secret["vpc_id"]
  subnets                         = local.secret["private_subnets"]
  security_groups                 = local.secret["security_groups"]
  zone                            = local.secret["zone_id"]
  cluster                         = local.secret["cluster_arn"]
  frontend_image_repo             = local.secret["ecrs"]["frontend"]["url"]
  backend_image_repo              = local.secret["ecrs"]["backend"]["url"]
  upload_image_repo               = local.secret["ecrs"]["processing"]["url"]
  lambda_upload_success_repo      = local.secret["ecrs"]["upload_success"]["url"]
  lambda_upload_repo              = local.secret["ecrs"]["upload_failures"]["url"]
  lambda_dataset_submissions_repo = local.secret["ecrs"]["dataset_submissions"]["url"]
  batch_role_arn                  = local.secret["batch_queues"]["upload"]["role_arn"]
  job_queue_arn                   = local.secret["batch_queues"]["upload"]["queue_arn"]
  external_dns                    = local.secret["external_zone_name"]
  internal_dns                    = local.secret["internal_zone_name"]

  # TODO explorer stuff
  explorer_listener_arn = try(local.secret[local.alb_key]["explorer"]["listener_arn"], "")
  explorer_alb_dns      = try(local.secret[local.alb_key]["explorer"]["dns_name"], "")
  explorer_alb_zone     = try(local.secret[local.alb_key]["explorer"]["zone_id"], "")

  explorer_url        = try(join("", [
    "https://", module.explorer_dns[0].dns_prefix, ".", local.external_dns
  ]), var.explorer_url)
  explorer_image_repo = local.secret["ecrs"]["explorer"]["url"]
  explorer_cmd        = ["flask", "run", "--host", "0.0.0.0", "--port", "5000"]
  # TODO end explorer stuff

  frontend_listener_arn = try(local.secret[local.alb_key]["frontend"]["listener_arn"], "")
  backend_listener_arn  = try(local.secret[local.alb_key]["backend"]["listener_arn"], "")
  frontend_alb_zone     = try(local.secret[local.alb_key]["frontend"]["zone_id"], "")
  backend_alb_zone      = try(local.secret[local.alb_key]["backend"]["zone_id"], "")
  frontend_alb_dns      = try(local.secret[local.alb_key]["frontend"]["dns_name"], "")
  backend_alb_dns       = try(local.secret[local.alb_key]["backend"]["dns_name"], "")

  artifact_bucket            = try(local.secret["s3_buckets"]["artifact"]["name"], "")
  cellxgene_bucket           = try(local.secret["s3_buckets"]["cellxgene"]["name"], "")
  dataset_submissions_bucket = try(local.secret["s3_buckets"]["dataset_submissions"]["name"], "")

  ecs_role_arn          = local.secret["service_roles"]["ecs_role"]
  sfn_role_arn          = local.secret["service_roles"]["sfn_upload"]
  lambda_execution_role = local.secret["service_roles"]["lambda_errorhandler"]

  frontend_url = try(join("", [
    "https://", module.frontend_dns[0].dns_prefix, ".", local.external_dns
  ]), var.frontend_url)
  backend_url  = try(join("", ["https://", module.backend_dns[0].dns_prefix, ".", local.external_dns]), var.backend_url)
}

module explorer_dns {
  count                 = var.require_okta ? 1 : 0
  source                = "../dns"
  custom_stack_name     = local.custom_stack_name
  app_name              = "explorer"
  alb_dns               = local.explorer_alb_dns
  canonical_hosted_zone = local.explorer_alb_zone
  zone                  = local.internal_dns
}

module explorer_service {
  source            = "../service"
  custom_stack_name = local.custom_stack_name
  app_name          = "explorer"
  vpc               = local.vpc_id
  image             = "${local.explorer_image_repo}:${local.image_tag}"
  cluster           = local.cluster
  desired_count     = var.explorer_instance_count
  listener          = local.explorer_listener_arn
  subnets           = local.subnets
  security_groups   = local.security_groups
  task_role_arn     = local.ecs_role_arn
  service_port      = 5000
  memory            = 1536
  cmd               = local.explorer_cmd
  deployment_stage  = local.deployment_stage
  health_check_path = "/cellxgene/health"
  step_function_arn = ""
  host_match        = try(join(".", [module.explorer_dns[0].dns_prefix, local.external_dns]), "")
  priority          = local.priority
  api_url           = local.explorer_url
  frontend_url      = ""
  remote_dev_prefix = local.remote_dev_prefix

  wait_for_steady_state = local.wait_for_steady_state
}