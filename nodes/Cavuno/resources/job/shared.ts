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
 * Node version that added the required Work Arrangement, office locations,
 * and the grouped Salary on Create. Workflows saved on version 1 keep the
 * "Fully Remote" toggle and the loose salary fields they were built with.
 */
export const WORK_ARRANGEMENT_VERSION = 1.1;

const SALARY_CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

export const salaryTimeframeOptions: INodePropertyOptions[] = [
	{ name: 'Per Day', value: 'per_day' },
	{ name: 'Per Hour', value: 'per_hour' },
	{ name: 'Per Month', value: 'per_month' },
	{ name: 'Per Week', value: 'per_week' },
	{ name: 'Per Year', value: 'per_year' },
];
const SALARY_TIMEFRAME_VALUES = salaryTimeframeOptions.map(({ value }) => value as string);

export const workArrangementOptions: INodePropertyOptions[] = [
	{ name: 'Hybrid', value: 'hybrid' },
	{ name: 'On-Site', value: 'on_site' },
	{ name: 'Remote', value: 'remote' },
];
const WORK_ARRANGEMENT_VALUES = workArrangementOptions.map(({ value }) => value as string);

/**
 * Create (v1.1+): `remoteOption` comes from Work Arrangement. The API pairs
 * each value with the data it needs: office locations for on-site and hybrid,
 * work-authorization permits for remote. A remote role is open to candidates
 * anywhere, as the v1 "Fully Remote" toggle was; timezones auto-derive.
 */
function applyWorkArrangement(this: IExecuteSingleFunctions, body: Record<string, unknown>): void {
	const arrangement = this.getNodeParameter('workArrangement', '') as string;
	if (!WORK_ARRANGEMENT_VALUES.includes(arrangement)) {
		throw new NodeOperationError(
			this.getNode(),
			'Choose a Work Arrangement: On-site, Hybrid, or Remote',
		);
	}
	body.remoteOption = arrangement;
	if (arrangement === 'remote') {
		body.remotePermits = [{ type: 'worldwide', value: 'worldwide' }];
		return;
	}
	const entries = this.getNodeParameter('officeLocations.location', []) as Array<{
		query?: unknown;
	}>;
	const officeLocations = entries
		.map((entry) => (typeof entry?.query === 'string' ? entry.query.trim() : ''))
		.filter((query) => query !== '')
		.map((query) => ({ query }));
	if (officeLocations.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			'On-site and hybrid jobs need at least one Office Location, for example "Berlin, Germany"',
		);
	}
	body.officeLocations = officeLocations;
}

/**
 * Create (v1.1+): the Salary group sends a figure only together with its
 * currency and pay period, which the API requires. A 0 bound means "not set".
 */
function applySalary(this: IExecuteSingleFunctions, body: Record<string, unknown>): void {
	const salary = this.getNodeParameter('salary.range', null) as {
		salaryMin?: unknown;
		salaryMax?: unknown;
		salaryCurrency?: unknown;
		salaryTimeframe?: unknown;
	} | null;
	if (!salary) return;
	const bound = (value: unknown) =>
		typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
	const salaryMin = bound(salary.salaryMin);
	const salaryMax = bound(salary.salaryMax);
	if (salaryMin === undefined && salaryMax === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'Salary needs a Minimum or a Maximum above 0. Remove the Salary group to post the job without one.',
		);
	}
	const currency =
		typeof salary.salaryCurrency === 'string' ? salary.salaryCurrency.trim().toUpperCase() : '';
	if (!SALARY_CURRENCY_PATTERN.test(currency)) {
		throw new NodeOperationError(
			this.getNode(),
			'Salary Currency must be a three-letter ISO 4217 code, for example USD',
		);
	}
	const timeframe = salary.salaryTimeframe;
	if (typeof timeframe !== 'string' || !SALARY_TIMEFRAME_VALUES.includes(timeframe)) {
		throw new NodeOperationError(this.getNode(), 'Choose a Pay Period for the salary');
	}
	if (salaryMin !== undefined) body.salaryMin = salaryMin;
	if (salaryMax !== undefined) body.salaryMax = salaryMax;
	body.salaryCurrency = currency;
	body.salaryTimeframe = timeframe;
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
	if (
		this.getNodeParameter('operation') === 'create' &&
		this.getNode().typeVersion >= WORK_ARRANGEMENT_VERSION
	) {
		applyWorkArrangement.call(this, body);
		applySalary.call(this, body);
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
	// Update and version 1 Create offer only the "anywhere" remote case
	// (version 1.1 Create has Work Arrangement with office locations instead).
	// The API pairs a remote policy with data these fields do not model —
	// office locations for on-site and hybrid roles — so normalizeJobBody
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
		options: salaryTimeframeOptions,
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
 * Fields that v1.1 Create replaces with top-level inputs: Work Arrangement
 * supersedes the "Fully Remote" toggle, and the Salary group keeps a figure
 * together with its currency and pay period.
 */
const FIELDS_REPLACED_ON_CREATE = new Set([
	'remote',
	'salaryCurrency',
	'salaryMax',
	'salaryMin',
	'salaryTimeframe',
]);

export const jobCreateOptionalFields: INodeProperties[] = jobOptionalFields.filter(
	({ name }) => !FIELDS_REPLACED_ON_CREATE.has(name),
);

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
