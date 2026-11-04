# FCaptcha's two secrets, kept stable in the state. The verify secret is shared by web and fcaptcha.

resource "random_password" "fcaptcha_secret" {
  length  = 64
  special = false
}

resource "random_password" "fcaptcha_verify_secret" {
  length  = 64
  special = false
}
