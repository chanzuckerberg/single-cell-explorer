locals {
  domain = "cellxgene.staging.single-cell.czi.technology"
}

module stack {
  source                       = "./modules/ecs-stack"
  aws_account_id               = var.aws_account_id
  aws_role                     = var.aws_role
  happymeta_                   = var.happymeta_
  happy_config_secret          = var.happy_config_secret
  image_tag                    = var.image_tag
  priority                     = var.priority
  stack_name                   = var.stack_name
  deployment_stage             = "staging"
  delete_protected             = false
  require_okta                 = false
  stack_prefix                 = "/${var.stack_name}"
  batch_container_memory_limit = 28000
  memory                       = 50000
  explorer_instance_count      = 2


  api_domain                   = "api.${local.domain}"
  web_domain                   = "${local.domain}"
  data_locator_domain          = "api.${local.domain}"

  wait_for_steady_state        = var.wait_for_steady_state
}
