# Secrets come from the git-ignored infra/secrets.auto.tfvars (template: secrets.auto.tfvars.example).

variable "better_auth_secret" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.better_auth_secret)) > 0
    error_message = "better_auth_secret must be set in infra/secrets.auto.tfvars."
  }
}

variable "ses_access_key_id" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.ses_access_key_id)) > 0
    error_message = "ses_access_key_id must be set in infra/secrets.auto.tfvars."
  }
}

variable "ses_secret_access_key" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.ses_secret_access_key)) > 0
    error_message = "ses_secret_access_key must be set in infra/secrets.auto.tfvars."
  }
}

variable "spaces_access_id" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.spaces_access_id)) > 0
    error_message = "spaces_access_id must be set in infra/secrets.auto.tfvars."
  }
}

variable "spaces_secret_key" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.spaces_secret_key)) > 0
    error_message = "spaces_secret_key must be set in infra/secrets.auto.tfvars."
  }
}

variable "admins" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.admins)) > 0
    error_message = "admins must be set in infra/secrets.auto.tfvars."
  }
}

variable "allowed_emails" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.allowed_emails)) > 0
    error_message = "allowed_emails must be set in infra/secrets.auto.tfvars."
  }
}

variable "device_events_key" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.device_events_key)) > 0
    error_message = "device_events_key must be set in infra/secrets.auto.tfvars."
  }
}

# Optional login providers: a provider's values are set together, or left empty (no env is added).

variable "oauth_google_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_google_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_apple_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_apple_team_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_apple_key_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_apple_private_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_microsoft_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_microsoft_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_amazon_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "oauth_amazon_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

# Cluster sizes: set them to the old clusters' sizes if those differ.

variable "pg_size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}

variable "pg_node_count" {
  type    = number
  default = 1
}

variable "valkey_size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}

# Addresses outside the app allowed to reach PostgreSQL and Valkey (e.g. a developer's machine, for
# devScripts/populate-prod.ps1); set in secrets.auto.tfvars.

variable "database_trusted_ips" {
  type    = list(string)
  default = []
}
