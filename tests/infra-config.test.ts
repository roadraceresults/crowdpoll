import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const infraDir = path.resolve("infra");
const read = (file: string) => readFileSync(path.join(infraDir, file), "utf8");
const tfFiles = () => readdirSync(infraDir).filter((file) => file.endsWith(".tf"));

/** The variable blocks of infra/variables.tf: name, whether sensitive, and the default when one is given. */
function variables(): { name: string; sensitive: boolean; defaultValue?: string }[] {
  const text = read("variables.tf");
  const blocks = [...text.matchAll(/^variable "([^"]+)" \{\r?\n([\s\S]*?)^\}/gm)];
  return blocks.map(([, name, body]) => ({
    name,
    sensitive: /^\s*sensitive\s*=\s*true\s*$/m.test(body),
    defaultValue: /^\s*default\s*=\s*(.+?)\s*$/m.exec(body)?.[1]
  }));
}

describe("infra configuration", () => {
  it("lists every secret of infra/variables.tf in the example secrets file with an empty value", () => {
    const example = read("secrets.auto.tfvars.example");
    const secrets = variables().filter((variable) => variable.sensitive);
    expect(secrets.length).toBeGreaterThanOrEqual(6);
    for (const { name } of secrets) {
      expect(example).toMatch(new RegExp(`^${name}\\s*=\\s*""\\s*$`, "m"));
    }
    for (const { name } of variables().filter((variable) => !variable.sensitive)) {
      expect(example).toMatch(new RegExp(`^# ${name}\\s*=`, "m"));
    }
  });

  it("gives no secret a non-empty default", () => {
    for (const { name, sensitive, defaultValue } of variables()) {
      if (sensitive && defaultValue !== undefined) expect(defaultValue, name).toBe('""');
    }
  });

  it("ignores the plugins, the state and the secrets file", () => {
    const lines = readFileSync(".gitignore", "utf8").split(/\r?\n/);
    for (const line of ["infra/.terraform/", "infra/*.tfstate", "infra/*.tfstate.*", "infra/secrets.auto.tfvars"]) {
      expect(lines).toContain(line);
    }
  });

  it("escapes every App Platform binding, so Terraform passes it on as text", () => {
    for (const file of tfFiles()) {
      const text = read(file);
      for (const binding of ['"${db-', '"${valkey-', '"${fcaptcha.']) {
        expect(text.includes(binding), `${file} holds ${binding}`).toBe(false);
      }
    }
  });

  it("derives FCaptcha's allowed hostnames from the app's domains", () => {
    expect(read("app.tf")).toMatch(/key\s*=\s*"ENV_FCAPTCHA_ALLOWED_HOSTNAMES"\s*\r?\n\s*value\s*=\s*join\(",", local\.domains\)/);
  });

  it("builds the bucket and CDN settings from the bucket and CDN resources", () => {
    const app = read("app.tf");
    expect(app).toMatch(/^\s*ENV_SPACES_BUCKET\s*=\s*digitalocean_spaces_bucket\.crowdpoll\.name\s*$/m);
    expect(app).toMatch(/^\s*ENV_SPACES_CDN_URL\s*=\s*"https:\/\/\$\{digitalocean_cdn\.crowdpoll\.endpoint\}"\s*$/m);
    expect(app).not.toContain("cdn.digitaloceanspaces.com");
  });

  it("trusts App Platform's proxy range in FCaptcha, keeping the private-range default", () => {
    const value = /key\s*=\s*"ENV_FCAPTCHA_TRUSTED_PROXIES"\r?\n\s*value\s*=\s*"([^"]+)"/.exec(read("app.tf"))?.[1] ?? "";
    expect(value.split(",")).toEqual(expect.arrayContaining(["100.64.0.0/10", "10.0.0.0/8", "172.16.0.0/12", "127.0.0.0/8"]));
    expect(readFileSync("fcaptcha-server/start.js", "utf8")).toMatch(/ENV_FCAPTCHA_TRUSTED_PROXIES:\s*"TRUSTED_PROXIES"/);
  });

  it("is the only description of the hosting", () => {
    expect(existsSync(".do/app.yaml")).toBe(false);
  });
});
