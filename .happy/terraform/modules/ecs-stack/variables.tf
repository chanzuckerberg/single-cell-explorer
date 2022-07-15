variable aws_account_id {
  type        = string
  description = "AWS account ID to apply changes to"
  default     = ""
}

variable aws_role {
  type        = string
  description = "Name of the AWS role to assume to apply changes"
  default     = ""
}

variable image_tag {
   type        = string
  description = "Please provide an image tag"
}

variable priority {
  type        = number
  description = "Listener rule priority number within the given listener"
}

variable happymeta_ {
  type        = string
  description = "Happy Path metadata. Ignored by actual terraform."
}

variable stack_name {
  type        = string
  description = "Happy Path stack name"
}

variable happy_config_secret {
  type        = string
  description = "Happy Path configuration secret name"
}

variable deployment_stage {
  type        = string
  description = "Deployment stage for the app"
}

variable delete_protected {
  type        = bool
  description = "Whether to protect this stack from being deleted."
  default     = false
}

variable require_okta {
  type        = bool
  description = "Whether the ALB's should be on private subnets"
  default     = true
}

variable stack_prefix {
  type        = string
  description = "Do bucket storage paths and db schemas need to be prefixed with the stack name? (Usually '/{stack_name}' for dev stacks, and '' for staging/prod stacks)"
  default     = ""
}

variable wait_for_steady_state {
  type        = bool
  description = "Should terraform block until ECS services reach a steady state?"
  default     = false
}

variable batch_container_memory_limit {
  type        = number
  description = "Memory hard limit for the batch container"
  default     = 28000
}

variable frontend_url {
  type        = string
  description = "For non-proxied stacks, send in the canonical front/backend URL's"
  default     = ""
}

variable explorer_instance_count {
  type        = number
  description = "How many backend tasks to run"
  default     = 1
}

variable memory {
  type        = number
  description = "Allocated memory"
  default     = 2048
}

variable cpu {
  type        = number
  description = "CPU shares (1cpu=1024) per task"
  default     = 2048
}

variable "api_domain" {
  type        = string
  description = "domain for the backend api"
}

variable "web_domain" {
  type        = string
  description = "domain for the website"
}

variable "data_locator_domain" {
  type        = string
  description = "domain for the data portal"
}

variable "cxg_bucket_path" {
  type        = string
  description = "path to the cxg bucket"
  default     = ""
}