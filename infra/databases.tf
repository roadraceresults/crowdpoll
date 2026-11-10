# The managed clusters keep today's names; the app attaches them by name (app.tf) and only the app may connect,
# plus, for PostgreSQL, the addresses in database_trusted_ips (the git-ignored secrets.auto.tfvars).

resource "digitalocean_database_cluster" "pg" {
  name       = "db-pgsql-tor1-crowdpoll"
  engine     = "pg"
  version    = "18"
  region     = "tor1"
  size       = var.pg_size
  node_count = var.pg_node_count
}

resource "digitalocean_database_cluster" "valkey" {
  name       = "valkey-tor1-crowdpoll"
  engine     = "valkey"
  version    = "9"
  region     = "tor1"
  size       = var.valkey_size
  node_count = 1
}

resource "digitalocean_database_firewall" "pg" {
  cluster_id = digitalocean_database_cluster.pg.id

  rule {
    type  = "app"
    value = digitalocean_app.crowdpoll.id
  }

  dynamic "rule" {
    for_each = var.database_trusted_ips
    content {
      type  = "ip_addr"
      value = rule.value
    }
  }
}

resource "digitalocean_database_firewall" "valkey" {
  cluster_id = digitalocean_database_cluster.valkey.id

  rule {
    type  = "app"
    value = digitalocean_app.crowdpoll.id
  }
}
