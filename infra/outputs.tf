output "app_id" {
  value = digitalocean_app.crowdpoll.id
}

output "default_ingress" {
  value = digitalocean_app.crowdpoll.default_ingress
}

output "live_url" {
  value = digitalocean_app.crowdpoll.live_url
}

output "cdn_endpoint" {
  value = digitalocean_cdn.crowdpoll.endpoint
}
