/**
 * Starts a deployment of the App Platform app from its source branch's latest commit and follows it to the end.
 * Usage: npx tsx devScripts/deploy-app.ts [--app <name>]   (DIGITALOCEAN_TOKEN set in the session)
 * Exit codes: 0 ACTIVE; 1 ERROR, CANCELED, SUPERSEDED, timeout, no such app or an HTTP error; 2 missing token or bad argument.
 */
import { pathToFileURL } from "node:url";

const API = "https://api.digitalocean.com/v2";
const POLL_INTERVAL = 10_000;
const TIMEOUT = 30 * 60_000;
const ENDED = new Set(["ACTIVE", "ERROR", "CANCELED", "SUPERSEDED"]);

export interface DeployDeps {
  token: string;
  fetch: typeof fetch;
  log: (line: string) => void;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

/** A failure that ends the command with its exit code; the message is printed as is. */
export class DeployError extends Error {
  constructor(message: string, readonly exitCode: 1 | 2) {
    super(message);
  }
}

interface Step {
  name?: string;
  status?: string;
  steps?: Step[];
}

interface Deployment {
  id: string;
  phase: string;
  progress?: { steps?: Step[] };
}

async function api<T>(deps: DeployDeps, method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const response = await deps.fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${deps.token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new DeployError(`HTTP ${response.status} from ${method} ${path}: ${payload.message ?? response.statusText}`, 1);
  }
  return payload as T;
}

export function parseArgs(argv: string[]): { app: string } {
  let app = "crowdpoll";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--app" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      app = argv[++i];
    } else {
      throw new DeployError(`Unknown argument: ${argv[i]}. Usage: npx tsx devScripts/deploy-app.ts [--app <name>]`, 2);
    }
  }
  return { app };
}

export async function findApp(deps: DeployDeps, name: string): Promise<string> {
  const { apps = [] } = await api<{ apps?: { id: string; spec?: { name?: string } }[] }>(deps, "GET", "/apps?per_page=200");
  const app = apps.find((candidate) => candidate.spec?.name === name);
  if (!app) throw new DeployError(`No app named ${name}`, 1);
  return app.id;
}

export async function startDeployment(deps: DeployDeps, appId: string): Promise<string> {
  const { deployment } = await api<{ deployment: Deployment }>(deps, "POST", `/apps/${appId}/deployments`, {
    force_build: false
  });
  return deployment.id;
}

/** The name of the first failed step, looking into nested steps. */
function failedStep(steps: Step[] = []): string | undefined {
  for (const step of steps) {
    const inner = failedStep(step.steps);
    if (inner) return inner;
    if (step.status === "ERROR" && step.name) return step.name;
  }
  return undefined;
}

/** Polls the deployment until it ends or the time limit passes; resolves only when it is ACTIVE. */
export async function followDeployment(deps: DeployDeps, appId: string, deploymentId: string): Promise<void> {
  const deadline = deps.now() + TIMEOUT;
  let lastPhase = "";
  for (;;) {
    const { deployment } = await api<{ deployment: Deployment }>(deps, "GET", `/apps/${appId}/deployments/${deploymentId}`);
    if (deployment.phase !== lastPhase) {
      lastPhase = deployment.phase;
      if (!ENDED.has(lastPhase)) deps.log(`Phase: ${lastPhase}`);
    }
    if (lastPhase === "ACTIVE") {
      deps.log(`Deployment ${deploymentId} is ACTIVE`);
      return;
    }
    if (lastPhase === "ERROR") {
      const step = failedStep(deployment.progress?.steps);
      throw new DeployError(`Deployment ${deploymentId} ended in ERROR${step ? ` at step ${step}` : ""}`, 1);
    }
    if (ENDED.has(lastPhase)) throw new DeployError(`Deployment ${deploymentId} ended in ${lastPhase}`, 1);
    if (deps.now() + POLL_INTERVAL > deadline) {
      throw new DeployError(`Deployment ${deploymentId} still ${lastPhase} after 30 minutes; it carries on in App Platform`, 1);
    }
    await deps.sleep(POLL_INTERVAL);
  }
}

/** Runs the command and returns its exit code. */
export async function run(argv: string[], env: NodeJS.ProcessEnv, deps: Omit<DeployDeps, "token">): Promise<number> {
  try {
    const { app } = parseArgs(argv);
    const token = env.DIGITALOCEAN_TOKEN?.trim();
    if (!token) throw new DeployError("DIGITALOCEAN_TOKEN is not set in this session", 2);
    const full: DeployDeps = { ...deps, token };
    const appId = await findApp(full, app);
    deps.log(`Deploying app ${app} (${appId})`);
    const deploymentId = await startDeployment(full, appId);
    deps.log(`Deployment ${deploymentId} started`);
    await followDeployment(full, appId, deploymentId);
    return 0;
  } catch (error) {
    if (error instanceof DeployError) {
      deps.log(error.message);
      return error.exitCode;
    }
    deps.log(`Failed: ${(error as Error).message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await run(process.argv.slice(2), process.env, {
    fetch,
    log: (line) => console.log(line),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now()
  });
  process.exit(code);
}
