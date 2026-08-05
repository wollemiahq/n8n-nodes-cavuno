import { createHmac, timingSafeEqual } from 'crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

const EVENT_TYPE_OPTIONS = [
	{ name: 'Candidate Created', value: 'candidate.created' },
	{ name: 'Candidate Deleted', value: 'candidate.deleted' },
	{ name: 'Candidate Updated', value: 'candidate.updated' },
	{ name: 'Company Created', value: 'company.created' },
	{ name: 'Company Deleted', value: 'company.deleted' },
	{ name: 'Company Updated', value: 'company.updated' },
	{ name: 'Job Created', value: 'job.created' },
	{ name: 'Job Deleted', value: 'job.deleted' },
	{ name: 'Job Updated', value: 'job.updated' },
	{ name: 'Marketing Permission Granted', value: 'marketing_permission.granted' },
	{ name: 'Marketing Permission Withdrawn', value: 'marketing_permission.withdrawn' },
];

/** Standard Webhooks tolerance for the webhook-timestamp header, in seconds. */
const TIMESTAMP_TOLERANCE_SECONDS = 300;

interface CavunoWebhookStaticData {
	webhookId?: string;
	secret?: string;
}

/**
 * Pull the HTTP status and Cavuno's structured `{ error: { message } }` body
 * out of a failed request, across the error shapes n8n's request helpers
 * produce (NodeApiError with httpCode, axios-style response.data, normalized
 * response.body, or either nested under cause).
 */
function describeRequestError(error: unknown): { status?: number; message?: string } {
	const err = error as {
		httpCode?: string;
		statusCode?: number;
		response?: { status?: number; body?: unknown; data?: unknown };
		cause?: { response?: { status?: number; body?: unknown; data?: unknown } };
	};
	const response = err.response ?? err.cause?.response;
	const status = err.httpCode ? Number(err.httpCode) : (err.statusCode ?? response?.status);
	const body = (response?.body ?? response?.data) as
		| { error?: { message?: string } }
		| undefined;
	const message = typeof body?.error?.message === 'string' ? body.error.message : undefined;
	return { status: Number.isFinite(status) ? status : undefined, message };
}

async function cavunoApiRequest(
	this: IHookFunctions,
	method: 'GET' | 'POST' | 'DELETE',
	endpoint: string,
	body?: JsonObject,
) {
	const credentials = await this.getCredentials('cavunoApi');
	const baseUrl = String(credentials.baseUrl).replace(/\/+$/, '');
	return await this.helpers.httpRequestWithAuthentication.call(this, 'cavunoApi', {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body,
		json: true,
	});
}

/**
 * Verify a Standard Webhooks signature: HMAC-SHA256 over
 * `<webhook-id>.<webhook-timestamp>.<raw-body>` keyed with the base64
 * portion of the whsec_ secret, compared against every space-separated
 * `v1,<base64>` candidate in the webhook-signature header.
 */
function verifySignature(
	secret: string,
	webhookId: string,
	timestamp: string,
	rawBody: Buffer,
	signatureHeader: string,
): boolean {
	const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	const signedContent = `${webhookId}.${timestamp}.${rawBody.toString('utf8')}`;
	const expected = createHmac('sha256', secretBytes).update(signedContent, 'utf8').digest();

	for (const candidate of signatureHeader.split(' ')) {
		const [version, signature] = candidate.split(',', 2);
		if (version !== 'v1' || !signature) continue;
		const provided = Buffer.from(signature, 'base64');
		if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
			return true;
		}
	}
	return false;
}

export class CavunoTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cavuno Trigger',
		name: 'cavunoTrigger',
		icon: { light: 'file:../Cavuno/cavuno.svg', dark: 'file:../Cavuno/cavuno.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when events happen on a Cavuno job board',
		defaults: {
			name: 'Cavuno Trigger',
		},
		// The published-package scanner requires this on every node class; the
		// editor never offers trigger nodes as AI tools, so it has no effect.
		usableAsTool: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'cavunoApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				options: EVENT_TYPE_OPTIONS,
				description:
					'The events to subscribe to. The API key needs webhooks.read and webhooks.manage plus the read scope of each selected event family (e.g. jobs.read for job events).',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as CavunoWebhookStaticData;
				if (!staticData.webhookId || !staticData.secret) {
					return false;
				}
				try {
					const endpoint = await cavunoApiRequest.call(
						this,
						'GET',
						`/webhook-endpoints/${staticData.webhookId}`,
					);
					if (endpoint.url === this.getNodeWebhookUrl('default')) {
						return true;
					}
					// The n8n instance URL changed since registration. Retire the
					// stale endpoint instead of orphaning it; a fresh one is created
					// for the current URL right after.
					await cavunoApiRequest.call(
						this,
						'DELETE',
						`/webhook-endpoints/${staticData.webhookId}`,
					);
				} catch (error) {
					this.logger.debug(
						'Cavuno webhook endpoint lookup failed; it will be recreated on activation',
						{ error },
					);
				}
				delete staticData.webhookId;
				delete staticData.secret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(this.getNode(), 'Could not determine the webhook URL');
				}
				const events = this.getNodeParameter('events') as string[];
				if (events.length === 0) {
					throw new NodeOperationError(this.getNode(), 'Select at least one event');
				}

				let endpoint;
				try {
					endpoint = await cavunoApiRequest.call(this, 'POST', '/webhook-endpoints', {
						url: webhookUrl,
						event_types: events,
					});
				} catch (error) {
					const { status, message } = describeRequestError(error);
					if (status === 402) {
						throw new NodeOperationError(
							this.getNode(),
							'Webhooks need a paid Cavuno plan. Upgrade the board, then activate this workflow again.',
						);
					}
					if (status === 403) {
						throw new NodeOperationError(
							this.getNode(),
							'The API key is missing a required scope. It needs webhooks.read and webhooks.manage plus the read scope of each selected event family (e.g. candidates.read for candidate events).',
						);
					}
					if (message) {
						throw new NodeOperationError(
							this.getNode(),
							`Cavuno rejected the webhook subscription: ${message}`,
							/https|public address/i.test(message)
								? {
										description:
											'Cavuno only delivers to publicly reachable HTTPS URLs. On self-hosted n8n, set the WEBHOOK_URL environment variable to your instance\'s public HTTPS address.',
									}
								: undefined,
						);
					}
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				const staticData = this.getWorkflowStaticData('node') as CavunoWebhookStaticData;
				staticData.webhookId = endpoint.id as string;
				staticData.secret = endpoint.secret as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as CavunoWebhookStaticData;
				if (staticData.webhookId) {
					try {
						await cavunoApiRequest.call(
							this,
							'DELETE',
							`/webhook-endpoints/${staticData.webhookId}`,
						);
					} catch (error) {
						this.logger.debug(
							'Cavuno webhook endpoint deletion failed; it was likely already removed board-side',
							{ error },
						);
					}
					delete staticData.webhookId;
					delete staticData.secret;
				}
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const staticData = this.getWorkflowStaticData('node') as CavunoWebhookStaticData;

		const reject = (status: number, message: string): IWebhookResponseData => {
			res.status(status).json({ error: message });
			return { noWebhookResponse: true };
		};

		if (!staticData.secret) {
			return reject(500, 'No signing secret stored for this workflow');
		}

		const webhookId = req.headers['webhook-id'];
		const timestamp = req.headers['webhook-timestamp'];
		const signature = req.headers['webhook-signature'];
		if (
			typeof webhookId !== 'string' ||
			typeof timestamp !== 'string' ||
			typeof signature !== 'string'
		) {
			return reject(400, 'Missing webhook signature headers');
		}

		const timestampSeconds = Number(timestamp);
		const nowSeconds = Math.floor(Date.now() / 1000);
		if (
			!Number.isFinite(timestampSeconds) ||
			Math.abs(nowSeconds - timestampSeconds) > TIMESTAMP_TOLERANCE_SECONDS
		) {
			return reject(400, 'Webhook timestamp outside tolerance');
		}

		const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
		if (!rawBody) {
			return reject(500, 'Raw request body unavailable; cannot verify signature');
		}

		if (!verifySignature(staticData.secret, webhookId, timestamp, rawBody, signature)) {
			return reject(401, 'Invalid webhook signature');
		}

		let event: JsonObject;
		try {
			event = JSON.parse(rawBody.toString('utf8')) as JsonObject;
		} catch {
			return reject(400, 'Invalid JSON body');
		}

		res.status(202).json({ received: true });
		return {
			noWebhookResponse: true,
			workflowData: [this.helpers.returnJsonArray(event)],
		};
	}
}
