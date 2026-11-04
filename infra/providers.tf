# The token is read from DIGITALOCEAN_TOKEN in the session, never from a file.
provider "digitalocean" {
  spaces_access_id  = var.spaces_access_id
  spaces_secret_key = var.spaces_secret_key
}

provider "random" {}
