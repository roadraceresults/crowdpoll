// Runs FCaptcha's standalone server (https://github.com/WebDecoy/FCaptcha, server-node). Its default widget path
// points into the source repository, so an npm install names the client package's file instead.
process.env.FCAPTCHA_CLIENT_PATH ??= require.resolve("@webdecoy/fcaptcha-client/min");

// The project's settings carry the ENV_FCAPTCHA_ prefix; FCaptcha reads its own names, so each is copied across.
// FCaptcha's own name set directly stops the start, so a stale variable is never silently in force.
const RENAMED = {
  ENV_FCAPTCHA_SECRET: "FCAPTCHA_SECRET",
  ENV_FCAPTCHA_VERIFY_SECRET: "FCAPTCHA_VERIFY_SECRET",
  ENV_FCAPTCHA_SITE_KEYS: "FCAPTCHA_SITE_KEYS",
  ENV_FCAPTCHA_ALLOWED_HOSTNAMES: "FCAPTCHA_ALLOWED_HOSTNAMES",
  ENV_FCAPTCHA_INSECURE_DEV_MODE: "FCAPTCHA_INSECURE_DEV_MODE",
  ENV_FCAPTCHA_REDIS_URL: "REDIS_URL",
  ENV_FCAPTCHA_TRUSTED_PROXIES: "TRUSTED_PROXIES"
};
for (const [name, fcaptchaName] of Object.entries(RENAMED)) {
  if (process.env[fcaptchaName] !== undefined) {
    console.error(`FCaptcha failed to start: ${fcaptchaName} is no longer read; set ${name} instead.`);
    process.exit(1);
  }
  if (process.env[name] !== undefined) process.env[fcaptchaName] = process.env[name];
}
// FCaptcha listens on PORT; ENV_FCAPTCHA_PORT keeps it apart from the web app's settings.
if (process.env.ENV_FCAPTCHA_PORT) process.env.PORT = process.env.ENV_FCAPTCHA_PORT;

require("@webdecoy/fcaptcha/server").start().catch((err) => {
  console.error(`FCaptcha failed to start: ${err.message}`);
  process.exit(1);
});
