# This deploys an Explorer stack.
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

  vpc_id                          = local.secret["vpc_id"]
  subnets                         = local.secret["private_subnets"]
  security_groups                 = local.secret["security_groups"]
  zone                            = local.secret["zone_id"]
  cluster                         = local.secret["cluster_arn"]
  external_dns                    = local.secret["external_zone_name"]
  internal_dns                    = local.secret["internal_zone_name"]

  explorer_listener_arn = try(local.secret[local.alb_key]["explorer"]["listener_arn"], "")
  explorer_alb_dns      = try(local.secret[local.alb_key]["explorer"]["dns_name"], "")
  explorer_alb_zone     = try(local.secret[local.alb_key]["explorer"]["zone_id"], "")

  frontend_url        = try(join("", [
    "https://", module.explorer_dns[0].dns_prefix, ".", local.external_dns
  ]), var.frontend_url)
  explorer_image_repo = local.secret["ecrs"]["explorer"]["url"]
  explorer_cmd        = ["gunicorn", "--worker-class", "gevent", "--bind", "0.0.0.0:5000", "server.eb.app:application", "--timeout", "60"]
  # TODO end explorer stuff

  artifact_bucket            = try(local.secret["s3_buckets"]["artifact"]["name"], "")
  cellxgene_bucket           = try(local.secret["s3_buckets"]["cellxgene"]["name"], "")

  ecs_role_arn          = local.secret["service_roles"]["ecs_role"]

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
  source                = "../service"
  custom_stack_name     = local.custom_stack_name
  app_name              = "explorer"
  vpc                   = local.vpc_id
  image                 = "${local.explorer_image_repo}:${local.image_tag}"
  cluster               = local.cluster
  desired_count         = var.explorer_instance_count
  listener              = local.explorer_listener_arn
  subnets               = local.subnets
  security_groups       = local.security_groups
  task_role_arn         = local.ecs_role_arn
  service_port          = 5000
  memory                = var.memory
  cmd                   = local.explorer_cmd
  deployment_stage      = local.deployment_stage
  health_check_path     = "/cellxgene/health"
  host_match            = try(join(".", [module.explorer_dns[0].dns_prefix, local.external_dns]), "")
  priority              = local.priority
  api_domain            = var.api_domain
  web_domain            = var.web_domain
  data_locator_domain   = var.data_locator_domain
  cxg_bucket_path       = length(var.cxg_bucket_path) > 0 ? var.cxg_bucket_path : local.cellxgene_bucket
  frontend_url          = local.frontend_url
  remote_dev_prefix     = local.remote_dev_prefix

  wait_for_steady_state = local.wait_for_steady_state
}