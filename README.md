# n8n-nodes-cavuno

This is an n8n community node for [Cavuno](https://cavuno.com) job boards. It
lets you manage jobs, companies, candidates, and marketing permissions through
the Cavuno Operator API, and start workflows from signed Cavuno webhooks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/)
workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/)
in the n8n community nodes documentation. The package name is
`n8n-nodes-cavuno`.

## Credentials

Create an API key in your Cavuno dashboard under **Settings → API**, then add
a **Cavuno API** credential in n8n:

- **API Base URL** — your board's API base, ending in `/api/v1`
  (for example `https://your-board.com/api/v1`).
- **API Key** — the `cavuno_live_...` key. Grant it only the scopes you need:
  - Actions: the matching family scopes (`jobs.read`, `jobs.manage`,
    `jobs.publish`, `companies.read`, `companies.manage`, `candidates.read`,
    `candidates.manage`, `marketing_permissions.read`,
    `marketing_permissions.manage`).
  - Trigger: `webhooks.read` and `webhooks.manage`, plus the read scope of
    each event family you subscribe to (for example `jobs.read` for job
    events).

Webhooks and API access are available on paid Cavuno plans.

## Operations

**Cavuno** node:

- **Job** — Create, Get, Get Many, Update, Delete, Publish, Expire
- **Company** — Create, Find or Create, Get, Get Many, Update, Delete
- **Candidate** — Get, Get Many, Delete
- **Marketing Permission** — Get Many (exact-match email lookup), Withdraw

Withdrawing marketing consent is safe to run more than once. Consent can only
be given by the person themselves on your board, so this node cannot grant
it.

## Cavuno Trigger

The **Cavuno Trigger** node subscribes to your board's outbound webhooks.
When the workflow is activated it registers a webhook endpoint with the
selected events; deactivating removes the endpoint again.

Available events: `job.created`, `job.updated`, `job.deleted`,
`company.created`, `company.updated`, `company.deleted`,
`candidate.created`, `candidate.updated`, `candidate.deleted`,
`marketing_permission.granted`, `marketing_permission.withdrawn`.

Cavuno only delivers to publicly reachable HTTPS URLs. On n8n Cloud this
just works; on self-hosted n8n, set the `WEBHOOK_URL` environment variable
to your instance's public HTTPS address before activating the workflow.

Every delivery is verified before your workflow runs, following the
[Standard Webhooks](https://www.standardwebhooks.com/) specification: the
node checks the `webhook-id`, `webhook-timestamp` (five-minute tolerance),
and HMAC-SHA256 `webhook-signature` headers against the endpoint's signing
secret. Unverified requests are rejected and never reach your workflow.

Deliveries are retried by Cavuno until acknowledged, so your workflow may
occasionally receive the same event twice. If running twice would cause a
problem, deduplicate on the top-level `id` field. Each event also carries
`data.object.revision` — ignore events whose revision is not newer than the
last one you applied for that resource.

## Compatibility

Requires n8n 1.x or later. No runtime dependencies.

## Resources

- [Cavuno API documentation](https://cavuno.com/docs/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
