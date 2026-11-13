locals {
  # The one place the bucket's name is written; ENV_SPACES_BUCKET and ENV_SPACES_CDN_URL follow it (app.tf).
  bucket_name = "crowdpoll-cdn"
}

# Private bucket: the app uploads its objects public-read itself.
resource "digitalocean_spaces_bucket" "crowdpoll" {
  name          = local.bucket_name
  region        = "tor1"
  acl           = "private"
  force_destroy = false
}

resource "digitalocean_cdn" "crowdpoll" {
  origin = digitalocean_spaces_bucket.crowdpoll.bucket_domain_name
}

# Lets pages on ENV_PUBLIC_ORIGIN read the published TRENDING and Newest objects cross-origin. The pages read
# them from the app instead (trendingBaseUrl is /api/trending): the CDN keeps one copy whatever the Origin, so
# a copy cached without this rule's header could still be served. Assets load through <script>, <link> and
# <img>, which need no CORS.
resource "digitalocean_spaces_bucket_cors_configuration" "crowdpoll" {
  bucket = digitalocean_spaces_bucket.crowdpoll.id
  region = digitalocean_spaces_bucket.crowdpoll.region

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://crowdpoll.vote"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}
