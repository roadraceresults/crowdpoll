# Contract: The Deploy Command

```
npx tsx devScripts/deploy-app.ts [--app <name>]
```

| Input | Default | Meaning |
|---|---|---|
| `DIGITALOCEAN_TOKEN` (session) | — | required; the command stops before any request without it |
| `--app <name>` | `crowdpoll` | the App Platform app to deploy |

## D1. Requests

1. `GET https://api.digitalocean.com/v2/apps?per_page=200` → the app whose `spec.name` is the name.
2. `POST https://api.digitalocean.com/v2/apps/{id}/deployments` with `{"force_build": false}` → the deployment id.
3. `GET https://api.digitalocean.com/v2/apps/{id}/deployments/{deployment_id}` every 10 s.

Every request sends `Authorization: Bearer <token>`.

## D2. Output (stdout)

```
Deploying app crowdpoll (<app id>)
Deployment <deployment id> started
Phase: PENDING_BUILD
Phase: BUILDING
Phase: DEPLOYING
Deployment <deployment id> is ACTIVE
```

A phase is printed only when it changes. On failure the last line is
`Deployment <deployment id> ended in ERROR at step <step name>` (or `CANCELED`, `SUPERSEDED`), and on timeout
`Deployment <deployment id> still <phase> after 30 minutes; it carries on in App Platform`. The token never appears in
any line.

## D3. Exit codes

| Code | When |
|---|---|
| 0 | the deployment is `ACTIVE` |
| 1 | `ERROR`, `CANCELED`, `SUPERSEDED`, timeout, no such app, an HTTP error (its status and the API's `message`) |
| 2 | `DIGITALOCEAN_TOKEN` missing, or an unknown argument |
