# n8n-nodes-cavuno

This is an n8n community node for [Cavuno](https://cavuno.com) job boards. It
lets you manage jobs, companies, candidates, and marketing permissions through
the Cavuno Operator API, and start workflows from signed Cavuno webhooks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/)
workflow automation platform.

## Installation

### n8n Cloud

Cavuno is a verified community node on n8n Cloud. An instance owner or admin
can install it directly from a workflow:

1. Open the canvas and select **+** to open the nodes panel.
2. Search for **Cavuno**.
3. Under **More from the community**, select **Cavuno**, then select
   **Install**.

If Cavuno does not appear, enable **Verified Community Nodes** in the
[n8n Cloud Admin Panel](https://app.n8n.cloud/dashboard), then restart the
instance if needed. Once installed, every member of the instance can use the
node.

### Self-hosted n8n

Install Cavuno from the canvas when verified community nodes are enabled, or
open **Settings → Community nodes → Install a community node** and enter the
package name `n8n-nodes-cavuno`.

See n8n's [community node installation and management guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/)
for other installation methods and configuration options.

## Credentials

Create an API key in your Cavuno dashboard under
**Settings → Developer → API keys**, then add
a **Cavuno API** credential in n8n:

- **API Key** — the `cavuno_live_...` key. Grant it only the scopes you need:
  - Actions: the matching family scopes (`jobs.read`, `jobs.manage`,
    `jobs.publish`, `companies.read`, `companies.manage`, `candidates.read`,
    `candidates.manage`, `marketing_permissions.read`,
    `marketing_permissions.manage`).
  - Trigger: `webhooks.read` and `webhooks.manage`, plus the read scope of
    each event family you subscribe to (for example `jobs.read` for job
    events).

**Company → Find** needs only `companies.read` for ID or name lookups. Website
lookup uses Cavuno's domain matcher and also needs `companies.manage`, as does
**Find or Create**.

Webhooks and API access are available on paid Cavuno plans. The node always
uses Cavuno's canonical Operator API at `https://api.cavuno.com/v1`; there is
no board-specific base URL to enter.

## Operations

**Cavuno** node:

- **Job** — Create, Get, Get Many, Update, Delete, Publish, Expire
- **Company** — Create, Find, Find or Create, Get, Get Many, Update, Delete
- **Candidate** — Get, Get Many, Delete
- **Marketing Permission** — Get Many (exact-match email lookup), Withdraw

Withdrawing marketing consent is safe to run more than once. Consent can only
be given by the person themselves on your board, so this node cannot grant
it.

**Job → Create** asks for a **Work Arrangement**: On-site, Hybrid, or Remote.
On-site and hybrid jobs need at least one **Office Location**, entered as
"City, Country" (for example `Berlin, Germany`) and resolved by Cavuno. Remote
jobs are open to candidates anywhere. To post a salary, add **Salary** and fill
in a minimum, a maximum, or both, with the **Currency** (ISO 4217, for example
`USD`) and **Pay Period**. Cavuno rejects a salary figure without its currency
and pay period.

### Node versions

The Cavuno node is light-versioned, so saved workflows keep working when its
parameters change. A workflow stores the node version it was built with, and
n8n shows that version's fields.

- **1.1** (default for new nodes): Job Create has the required Work
  Arrangement, Office Locations, and the Salary group described above.
- **1**: Job Create has a **Fully Remote** toggle and loose salary fields under
  Additional Fields. Cavuno now requires a work arrangement on every new job,
  and a currency and pay period with any salary figure. A version 1 node that
  creates a job without **Fully Remote**, or with a salary but no currency or
  timeframe, gets a validation error naming the missing field. To fix it,
  replace the node with a new Cavuno node (version 1.1) and map the same
  inputs.

Company fields are searchable selectors. Choose **From List** to find a
company by name, or **By ID** to paste an ID or use an expression. **Company →
Find** accepts a company ID, website, or exact name without creating a record.

Action errors show Cavuno's own explanation. A `402` response also tells you
to upgrade the board's plan; `401` identifies an invalid, expired, or revoked
API key.

## Cavuno Trigger

The **Cavuno Trigger** node subscribes to your board's outbound webhooks.
When the workflow is published it registers a webhook endpoint with the
selected events; unpublishing removes the endpoint again. Older n8n versions
call these actions **Activate** and **Deactivate**.

Available events: `job.created`, `job.updated`, `job.deleted`,
`company.created`, `company.updated`, `company.deleted`,
`candidate.created`, `candidate.updated`, `candidate.deleted`,
`marketing_permission.granted`, `marketing_permission.withdrawn`.

Cavuno only delivers to publicly reachable HTTPS URLs. On n8n Cloud this
just works; on current self-hosted n8n, set the `N8N_WEBHOOK_URL` environment
variable to your instance's public HTTPS address before publishing the
workflow. Older n8n versions use `WEBHOOK_URL`.

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

The trigger output keeps the original Cavuno envelope (`occurred_at`,
`board_id`, and `data`) for existing workflows and also adds mapping-friendly
fields: `occurredAt`, `boardId`, `changedFields`, and the resource snapshot as
`resource`. The top-level `object: "event"` discriminator is unchanged.

## Compatibility

Requires n8n 1.x or later. No runtime dependencies.

## Resources

- [Cavuno n8n guide](https://cavuno.com/docs/n8n)
- [Cavuno API documentation](https://cavuno.com/docs/api)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
