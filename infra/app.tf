# The app: web, fcaptcha, the /fcaptcha ingress, the domain and the two database attachments.
# Spec reference: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
# App Platform bindings such as $${fcaptcha.PRIVATE_URL} are escaped with $$, so Terraform passes them on as text.

locals {
  domains = ["crowdpoll.vote"]

  # The web service's non-secret settings. Each one is RUN_AND_BUILD_TIME unless listed in web_run_time_settings.
  web_settings = {
    NODE_ENV                                        = "production"
    ENV_PORT                                        = "8080"
    ENV_SPACES_BUCKET                               = digitalocean_spaces_bucket.crowdpoll.name
    ENV_SPACES_REGION                               = "tor1"
    ENV_SPACES_CDN_URL                              = "https://${digitalocean_cdn.crowdpoll.endpoint}"
    ENV_ADMINS                                      = "roadraceresults@gmail.com"
    ENV_PROTOTYPES                                  = "SINGLE-COLUMN-RENDERING"
    ENV_PUBLIC_ORIGIN                               = "https://crowdpoll.vote"
    ENV_SIGNIN_METHOD                               = "both"
    ENV_MAX_SIGNIN_COOKIE_DURATION                  = "2592000000"
    ENV_STAY_SIGNED_IN                              = "0"
    ENV_SCREENING_CALL_TIMEOUT                      = "10000"
    ENV_POLL_APPROVAL_SWEEP_INTERVAL                = "5000"
    ENV_POLL_DATE_CHECK_SWEEP_INTERVAL              = "60000"
    ENV_POLL_EDIT_HEARTBEAT_INTERVAL                = "10000"
    ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS        = "10"
    ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL            = "5000"
    ENV_PARTICIPANTS_VIEWPORT_SIZE                  = "10"
    ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES             = "15"
    ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW    = "2"
    ENV_MAX_PRIVATE_POLL_VOTERS                     = "100"
    ENV_MIN_CHOICES                                 = "2"
    ENV_MAX_CHOICES                                 = "50"
    ENV_EMAIL_TRANSPORT                             = "ses"
    ENV_SES_REGION                                  = "ca-central-1"
    ENV_EMAIL_FROM                                  = "CrowdPoll <no-reply@mail.crowdpoll.vote>"
    ENV_EMAIL_SEND_TIMEOUT                          = "10000"
    ENV_SESSION_CACHE_TTL                           = "300000"
    ENV_MAX_POLLS_SEARCH_RESULTS                    = "200"
    ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS              = "200"
    ENV_MAX_TRENDING_POLLS                          = "200"
    ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL     = "60000"
    ENV_MAX_NEWEST_POLLS                            = "50"
    ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL       = "60000"
    ENV_HOME_TAB_REFRESH_INTERVAL                   = "7200000"
    ENV_MAX_HOME_PAGE_POLLS                         = "200"
    ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE              = "1"
    ENV_LINE_GRAPH_REFRESH_INTERVAL                 = "60000"
    ENV_MIN_LIVE_REFRESH_INTERVAL                   = "2000"
    ENV_MIN_MANUAL_REFRESH_INTERVAL                 = "5000"
    ENV_MANUAL_REFRESH_BURST                        = "5"
    ENV_SEARCH_BURST                                = "3"
    ENV_MIN_SEARCH_REFRESH_INTERVAL                 = "2000"
    ENV_MIN_VOTE_REFRESH_INTERVAL                   = "2000"
    ENV_MAX_VOTES_PER_IP_PER_MINUTE                 = "600"
    ENV_MAX_LIVE_RESULTS_PER_USER                   = "5"
    ENV_MAX_INVITATIONS_PER_DAY                     = "200"
    ENV_LIVE_RESULTS_MAX_IDLE_TIME                  = "1800000"
    ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND = "1250"
    ENV_SERVER_MAX_REQUESTS_PER_SECOND              = "15000"
    ENV_SERVER_MAX_SEARCH_PER_SECOND                = "2000"
    ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND       = "200"
    ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL            = "1000"
    ENV_MAX_REFRESH_AND_SEARCH_STRETCH              = "8"
    ENV_BUDGET_LOWER_THRESHOLD_PERCENT              = "80"
    ENV_INSTANCE_MAX_INFLIGHT                       = "200"
    ENV_INSTANCE_MAX_EVENT_LOOP_LAG                 = "100"
    ENV_SHED_RETRY_AFTER                            = "2000"
    ENV_COUNTER_FLUSH_SWEEP_INTERVAL                = "10000"
    ENV_INVITATION_SWEEP_INTERVAL                   = "30000"
    ENV_VOTE_BATCH_SIZE                             = "500"
    ENV_VOTE_QUEUE_LAG_NOTICE                       = "2000"
    ENV_SEARCH_CACHE_TTL                            = "10000"
    ENV_OUTBOX_DRAIN_SWEEP_INTERVAL                 = "15000"
    ENV_MAX_BOOKMARKS_PER_USER                      = "200"
    ENV_BOOKMARK_EXPIRY_MONTHS                      = "6"
    ENV_PAGE_LOADS_PER_MINUTE                       = "120"
    ENV_FCAPTCHA_ENABLED                            = "1"
    ENV_FCAPTCHA_SITE_KEY                           = "crowdpoll"
  }

  # Read only at run time: the build (publish-assets) runs loadConfig without the RUN_TIME secrets they depend on.
  web_run_time_settings = ["ENV_EMAIL_TRANSPORT", "ENV_SIGNIN_METHOD", "ENV_FCAPTCHA_ENABLED"]

  # A sign-in provider's env is added only when its value is set.
  oauth_settings = {
    ENV_OAUTH_GOOGLE_CLIENT_ID        = var.oauth_google_client_id
    ENV_OAUTH_GOOGLE_CLIENT_SECRET    = var.oauth_google_client_secret
    ENV_OAUTH_APPLE_CLIENT_ID         = var.oauth_apple_client_id
    ENV_OAUTH_APPLE_TEAM_ID           = var.oauth_apple_team_id
    ENV_OAUTH_APPLE_KEY_ID            = var.oauth_apple_key_id
    ENV_OAUTH_APPLE_PRIVATE_KEY       = var.oauth_apple_private_key
    ENV_OAUTH_MICROSOFT_CLIENT_ID     = var.oauth_microsoft_client_id
    ENV_OAUTH_MICROSOFT_CLIENT_SECRET = var.oauth_microsoft_client_secret
    ENV_OAUTH_AMAZON_CLIENT_ID        = var.oauth_amazon_client_id
    ENV_OAUTH_AMAZON_CLIENT_SECRET    = var.oauth_amazon_client_secret
  }
  oauth_settings_set = { for key, value in local.oauth_settings : key => value if nonsensitive(value != "") }
}

resource "digitalocean_app" "crowdpoll" {
  spec {
    name   = "crowdpoll"
    region = "tor1"

    dynamic "domain" {
      for_each = local.domains
      content {
        name = domain.value
        type = "PRIMARY"
        zone = "crowdpoll.vote"
      }
    }

    service {
      name               = "web"
      build_command      = "npm ci --include=dev && npm run build && npm run publish-assets && npm prune --omit=dev"
      run_command        = "npm start"
      environment_slug   = "node-js"
      http_port          = 8080
      instance_size_slug = "apps-d-1vcpu-2gb"

      github {
        repo           = "roadraceresults/crowdpoll"
        branch         = "main"
        deploy_on_push = false
      }

      autoscaling {
        min_instance_count = 1
        max_instance_count = 1
        metrics {
          cpu {
            percent = 70
          }
        }
      }

      health_check {
        http_path             = "/healthz"
        initial_delay_seconds = 10
        period_seconds        = 10
        timeout_seconds       = 3
        success_threshold     = 1
        failure_threshold     = 3
      }

      termination {
        grace_period_seconds = 30
      }

      alert {
        rule     = "CPU_UTILIZATION"
        operator = "GREATER_THAN"
        value    = 85
        window   = "FIVE_MINUTES"
      }

      alert {
        rule     = "RESTART_COUNT"
        operator = "GREATER_THAN"
        value    = 3
        window   = "FIVE_MINUTES"
      }

      dynamic "env" {
        for_each = local.web_settings
        content {
          key   = env.key
          value = env.value
          scope = contains(local.web_run_time_settings, env.key) ? "RUN_TIME" : "RUN_AND_BUILD_TIME"
          type  = "GENERAL"
        }
      }

      env {
        key   = "ENV_DATABASE_URL"
        value = "$${db-pgsql-tor1-crowdpoll.DATABASE_URL}"
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_DATABASE_CA_CERT"
        value = "$${db-pgsql-tor1-crowdpoll.CA_CERT}"
        scope = "RUN_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "ENV_VALKEY_URL"
        value = "$${valkey-tor1-crowdpoll.DATABASE_URL}"
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_FCAPTCHA_URL"
        value = "$${fcaptcha.PRIVATE_URL}"
        scope = "RUN_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "ENV_SPACES_KEY"
        value = var.spaces_access_id
        scope = "RUN_AND_BUILD_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_SPACES_SECRET"
        value = var.spaces_secret_key
        scope = "RUN_AND_BUILD_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_BETTER_AUTH_SECRET"
        value = var.better_auth_secret
        scope = "RUN_AND_BUILD_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_SES_ACCESS_KEY_ID"
        value = var.ses_access_key_id
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_SES_SECRET_ACCESS_KEY"
        value = var.ses_secret_access_key
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_ALLOWED_EMAILS"
        value = var.allowed_emails
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_FCAPTCHA_VERIFY_SECRET"
        value = random_password.fcaptcha_verify_secret.result
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      dynamic "env" {
        for_each = local.oauth_settings_set
        content {
          key   = env.key
          value = env.value
          scope = "RUN_TIME"
          type  = "SECRET"
        }
      }
    }

    # FCaptcha's standalone server (https://github.com/WebDecoy/FCaptcha), served on this domain under /fcaptcha.
    service {
      name               = "fcaptcha"
      source_dir         = "fcaptcha-server"
      build_command      = "npm ci --omit=dev"
      run_command        = "npm start"
      environment_slug   = "node-js"
      http_port          = 8080
      instance_size_slug = "apps-d-1vcpu-1gb"

      github {
        repo           = "roadraceresults/crowdpoll"
        branch         = "main"
        deploy_on_push = false
      }

      autoscaling {
        min_instance_count = 1
        max_instance_count = 3
        metrics {
          cpu {
            percent = 70
          }
        }
      }

      health_check {
        http_path             = "/health"
        initial_delay_seconds = 5
        period_seconds        = 10
        timeout_seconds       = 3
        success_threshold     = 1
        failure_threshold     = 3
      }

      env {
        key   = "ENV_FCAPTCHA_PORT"
        value = "8080"
        scope = "RUN_AND_BUILD_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "ENV_FCAPTCHA_SITE_KEYS"
        value = "crowdpoll"
        scope = "RUN_AND_BUILD_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "ENV_FCAPTCHA_ALLOWED_HOSTNAMES"
        value = join(",", local.domains)
        scope = "RUN_AND_BUILD_TIME"
        type  = "GENERAL"
      }

      env {
        key   = "ENV_FCAPTCHA_SECRET"
        value = random_password.fcaptcha_secret.result
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      env {
        key   = "ENV_FCAPTCHA_VERIFY_SECRET"
        value = random_password.fcaptcha_verify_secret.result
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      # Database 1 keeps FCaptcha's keys apart from the web service's (database 0).
      env {
        key   = "ENV_FCAPTCHA_REDIS_URL"
        value = "$${valkey-tor1-crowdpoll.DATABASE_URL}/1"
        scope = "RUN_TIME"
        type  = "SECRET"
      }

      # App Platform's ingress proxies connect from 100.64.0.0/10, outside FCaptcha's private-range default, so the
      # range is added to that default; untrusted, every visitor takes a proxy's address and the PoW check fails.
      env {
        key   = "ENV_FCAPTCHA_TRUSTED_PROXIES"
        value = "100.64.0.0/10,127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16,fe80::/10,fc00::/7"
        scope = "RUN_AND_BUILD_TIME"
        type  = "GENERAL"
      }
    }

    ingress {
      rule {
        match {
          path {
            prefix = "/fcaptcha"
          }
        }
        component {
          name                 = "fcaptcha"
          preserve_path_prefix = false
        }
      }

      rule {
        match {
          path {
            prefix = "/"
          }
        }
        component {
          name = "web"
        }
      }
    }

    database {
      name         = "db-pgsql-tor1-crowdpoll"
      engine       = "PG"
      version      = "18"
      production   = true
      cluster_name = digitalocean_database_cluster.pg.name
      db_name      = "defaultdb"
      db_user      = "doadmin"
    }

    database {
      name         = "valkey-tor1-crowdpoll"
      engine       = "VALKEY"
      version      = "9"
      production   = true
      cluster_name = digitalocean_database_cluster.valkey.name
    }
  }
}
