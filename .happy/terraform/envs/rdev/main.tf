module stack {
  source                       = "./modules/ecs-stack"
  aws_account_id               = var.aws_account_id
  aws_role                     = var.aws_role
  happymeta_                   = var.happymeta_
  happy_config_secret          = var.happy_config_secret
  image_tag                    = var.image_tag
  priority                     = var.priority
  stack_name                   = var.stack_name
  deployment_stage             = "rdev"
  delete_protected             = false
  require_okta                 = true
  stack_prefix                 = "/${var.stack_name}"
  batch_container_memory_limit = 28000
  memory                       = 4096

  api_domain                   = "${var.stack_name}-explorer.rdev.single-cell.czi.technology"
  web_domain                   = "${var.stack_name}-explorer.rdev.single-cell.czi.technology"
  data_locator_domain          = "internal-happy-rdev-backend-1100870308.us-west-2.elb.amazonaws.com"
  cxg_bucket_path              = "env-rdev-cellxgene/dataset-metadata-portal"

  wait_for_steady_state        = var.wait_for_steady_state
}
