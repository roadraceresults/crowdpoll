/**
 * ENV_DATABASE_CA_CERT: a managed database's certificate is signed by the provider's own CA,
 * which Node does not trust. With the CA given, the connection is verified against it; the
 * sslmode parameters are dropped because pg lets them override an explicit `ssl`.
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config.js";
import { poolConfigFor } from "../src/db/client.js";

const CA = "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n";
const URL_WITH_SSLMODE = "postgres://doadmin:secret@db.example.com:25060/defaultdb?sslmode=require";
const SECRET = "test-secret-0123456789-0123456789-0123456789";

// pg's own parsing of the pool options, which is where an explicit `ssl` can be overridden.
const requireModule = createRequire(import.meta.url);
const ConnectionParameters = requireModule("pg/lib/connection-parameters") as new (config: unknown) => { ssl: unknown };

describe("ENV_DATABASE_CA_CERT in the configuration", () => {
  it("is optional", () => {
    expect(loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080" }).databaseCaCert).toBeUndefined();
  });

  it("is read as given", () => {
    expect(loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ENV_DATABASE_CA_CERT: CA }).databaseCaCert).toBe(CA);
  });

  it("turns a pasted single-line value's \\n into line breaks", () => {
    const oneLine = CA.replace(/\n/g, "\\n");
    expect(loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ENV_DATABASE_CA_CERT: oneLine }).databaseCaCert).toBe(CA);
  });

  it("refuses a value that is not a certificate, such as an unresolved placeholder", () => {
    expect(() =>
      loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ENV_DATABASE_CA_CERT: "${db.CA_CERT}" })
    ).toThrow(ConfigError);
  });
});

describe("poolConfigFor", () => {
  it("leaves the URL alone, with no ssl option, when there is no CA", () => {
    expect(poolConfigFor(URL_WITH_SSLMODE)).toEqual({ connectionString: URL_WITH_SSLMODE });
  });

  it("drops sslmode and passes the CA as ssl", () => {
    const config = poolConfigFor(`${URL_WITH_SSLMODE}&uselibpqcompat=true&application_name=crowdpoll`, CA);
    expect(config.ssl).toEqual({ ca: CA });
    expect(config.connectionString).toBe(
      "postgres://doadmin:secret@db.example.com:25060/defaultdb?application_name=crowdpoll"
    );
  });

  it("reaches pg as a verified connection against that CA", () => {
    const params = new ConnectionParameters(poolConfigFor(URL_WITH_SSLMODE, CA));
    expect(params.ssl).toEqual({ ca: CA });
  });
});
