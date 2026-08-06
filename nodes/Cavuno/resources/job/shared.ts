import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodePropertyOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Operations that take no input still need a JSON body: the API validates
 * `{}` against a strict schema and rejects a zero-length body outright.
 */
export async function sendEmptyJsonBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	// Serialized explicitly: an empty object is dropped before it reaches the
	// wire, and the API rejects a zero-length body outright.
	requestOptions.body = '{}';
	requestOptions.json = false;
	requestOptions.headers = { ...requestOptions.headers, 'Content-Type': 'application/json' };
	return requestOptions;
}

/** Coerce a date picker string, a Date, or a Luxon DateTime to epoch ms. */
function toEpochMs(value: unknown): number | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.getTime();
	}
	const maybeLuxon = value as { toMillis?: () => number; isValid?: boolean };
	if (typeof maybeLuxon?.toMillis === 'function') {
		if (maybeLuxon.isValid === false) return null;
		const millis = maybeLuxon.toMillis();
		return Number.isFinite(millis) ? millis : null;
	}
	if (typeof value === 'string' && value !== '') {
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return null;
}

/**
 * Normalizes the job body before it is sent:
 * - Create requires exactly one of `companyId` | `company`; a company name is
 *   sent as the inline `{ name }` object the API expects.
 * - `expiresAt` from the date picker becomes a Unix epoch in milliseconds.
 * - Empty optional values are dropped instead of being sent as "".
 */
export async function normalizeJobBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as Record<string, unknown>;
	for (const key of Object.keys(body)) {
		if (body[key] === '' || body[key] === undefined) delete body[key];
	}
	if (typeof body.company === 'string') {
		body.company = { name: body.company };
	}
	// The API rejects a remote policy without the work-authorization scope
	// it applies to, so the toggle expands into "anywhere". Timezones
	// auto-derive from permits on create; an update has to state them.
	if (body.remote !== undefined) {
		const isRemote = body.remote === true;
		delete body.remote;
		if (isRemote) {
			body.remoteOption = 'remote';
			body.remotePermits = [{ type: 'worldwide', value: 'worldwide' }];
			if (this.getNodeParameter('operation') === 'update') {
				body.remoteTimezones = [{ type: 'all', value: 'all' }];
			}
		}
	}
	// The date picker yields an ISO string, but an expression like
	// {{ $now.plus({ days: 30 }) }} yields a Date or a Luxon DateTime — all
	// three have to reach the API as epoch milliseconds. `null` passes
	// through untouched: on an update it is how the API clears an expiry.
	if (
		body.expiresAt !== undefined &&
		body.expiresAt !== null &&
		typeof body.expiresAt !== 'number'
	) {
		const parsed = toEpochMs(body.expiresAt);
		if (parsed === null) {
			throw new NodeOperationError(this.getNode(), 'Expires At is not a valid date');
		}
		body.expiresAt = parsed;
	}
	if (this.getNodeParameter('operation') === 'create') {
		if (body.companyId && body.company) {
			throw new NodeOperationError(
				this.getNode(),
				'Fill in either Company ID or Company Name, not both',
			);
		}
		if (!body.companyId && !body.company) {
			throw new NodeOperationError(
				this.getNode(),
				'Every job needs a company. Fill in Company ID, or enter a Company Name to create one.',
			);
		}
	}
	requestOptions.body = body;
	return requestOptions;
}

/**
 * Optional job fields accepted by both Create and Update. Company and Status
 * are deliberately NOT here: the inline company and initial status only exist
 * on Create, and status changes after that go through the Publish and Expire
 * operations.
 */
export const jobOptionalFields: INodeProperties[] = [
	{
		displayName: 'Employment Type',
		name: 'employmentType',
		type: 'options',
		options: [
			{ name: 'Contract', value: 'contract' },
			{ name: 'Full-Time', value: 'full_time' },
			{ name: 'Internship', value: 'internship' },
			{ name: 'Other', value: 'other' },
			{ name: 'Part-Time', value: 'part_time' },
			{ name: 'Temporary', value: 'temporary' },
			{ name: 'Volunteer', value: 'volunteer' },
		],
		default: 'full_time',
		description: 'The employment type of the job',
		routing: {
			send: {
				type: 'body',
				property: 'employmentType',
			},
		},
	},
	{
		displayName: 'Expires At',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
		description: 'When the job posting expires',
		routing: {
			send: {
				type: 'body',
				property: 'expiresAt',
			},
		},
	},
	{
		displayName: 'External ID',
		name: 'externalId',
		type: 'string',
		default: '',
		description: 'Your own stable identifier for this job, used for deduplication',
		routing: {
			send: {
				type: 'body',
				property: 'externalId',
			},
		},
	},
	{
		displayName: 'Fully Remote',
		name: 'remote',
		type: 'boolean',
		default: false,
		description:
			'Whether to publish this as a fully remote role open to candidates anywhere. On-site and hybrid roles need office locations, which this node does not set — configure those on your board.',
		// Routed into the body only so normalizeJobBody can read it; that
		// preSend replaces it with the remoteOption/remotePermits pair the
		// API expects, so `remote` itself never reaches the wire.
		routing: {
			send: {
				type: 'body',
				property: 'remote',
			},
		},
	},
	// Only the "anywhere" remote case is offered. The API pairs a remote
	// policy with data this node does not model — office locations for
	// on-site and hybrid roles — so those stay out; normalizeJobBody
	// expands the toggle above into the permits the API requires.
	{
		displayName: 'Salary Currency',
		name: 'salaryCurrency',
		type: 'string',
		default: '',
		placeholder: 'USD',
		description: 'ISO 4217 currency code for the salary range',
		routing: {
			send: {
				type: 'body',
				property: 'salaryCurrency',
			},
		},
	},
	{
		displayName: 'Salary Max',
		name: 'salaryMax',
		type: 'number',
		default: 0,
		description: 'Upper bound of the salary range',
		routing: {
			send: {
				type: 'body',
				property: 'salaryMax',
			},
		},
	},
	{
		displayName: 'Salary Min',
		name: 'salaryMin',
		type: 'number',
		default: 0,
		description: 'Lower bound of the salary range',
		routing: {
			send: {
				type: 'body',
				property: 'salaryMin',
			},
		},
	},
	{
		displayName: 'Salary Timeframe',
		name: 'salaryTimeframe',
		type: 'options',
		options: [
			{ name: 'Per Day', value: 'per_day' },
			{ name: 'Per Hour', value: 'per_hour' },
			{ name: 'Per Month', value: 'per_month' },
			{ name: 'Per Week', value: 'per_week' },
			{ name: 'Per Year', value: 'per_year' },
		],
		default: 'per_year',
		description: 'The timeframe the salary range refers to',
		routing: {
			send: {
				type: 'body',
				property: 'salaryTimeframe',
			},
		},
	},
	{
		displayName: 'Seniority',
		name: 'seniority',
		type: 'options',
		options: [
			{ name: 'Associate', value: 'associate' },
			{ name: 'Director', value: 'director' },
			{ name: 'Entry Level', value: 'entry_level' },
			{ name: 'Executive', value: 'executive' },
			{ name: 'Lead', value: 'lead' },
			{ name: 'Mid Level', value: 'mid_level' },
			{ name: 'Principal', value: 'principal' },
			{ name: 'Senior', value: 'senior' },
		],
		default: 'mid_level',
		description: 'The seniority level of the job',
		routing: {
			send: {
				type: 'body',
				property: 'seniority',
			},
		},
	},
];

/**
 * Create-only: the initial status. After creation, use the Publish and
 * Expire operations — the API rejects status on updates.
 */
export const jobCreateStatusField: INodeProperties = {
	displayName: 'Status',
	name: 'status',
	type: 'options',
	options: [
		{ name: 'Draft', value: 'draft' },
		{ name: 'Published', value: 'published' },
	],
	default: 'published',
	description: 'Whether the job is created as a draft or published immediately',
	routing: {
		send: {
			type: 'body',
			property: 'status',
		},
	},
};

export const jobStatusFilterOptions: INodePropertyOptions[] = [
	{ name: 'Archived', value: 'archived' },
	{ name: 'Draft', value: 'draft' },
	{ name: 'Expired', value: 'expired' },
	{ name: 'Published', value: 'published' },
];
