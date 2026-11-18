import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { CavunoApi } from '../dist/credentials/CavunoApi.credentials.js';
import { Cavuno } from '../dist/nodes/Cavuno/Cavuno.node.js';
import { throwOnCavunoApiError } from '../dist/nodes/Cavuno/errors.js';
import {
	normalizeCompanyFindBody,
	normalizeCompanyFindOutput,
} from '../dist/nodes/Cavuno/resources/company/find.js';
import { searchCompanies } from '../dist/nodes/Cavuno/resources/company/selector.js';
import { normalizeJobBody } from '../dist/nodes/Cavuno/resources/job/shared.js';
import { CavunoTrigger } from '../dist/nodes/CavunoTrigger/CavunoTrigger.node.js';
import { apiPath } from '../dist/shared/path.js';

const API_BASE_URL = 'https://api.cavuno.com/v1';

test('credentials ask only for an API key and probe the canonical API', () => {
	const credential = new CavunoApi();

	assert.deepEqual(
		credential.properties.map(({ name }) => name),
		['apiKey'],
	);
	assert.equal(credential.test.request.baseURL, API_BASE_URL);
	assert.equal(credential.test.request.ignoreHttpStatusErrors, true);
	assert.ok(credential.test.rules.some((rule) => rule.properties.value === 401));
	assert.ok(credential.test.rules.some((rule) => rule.properties.value === 402));
	assert.ok(credential.test.rules.some((rule) => rule.properties.value === 500));
	assert.ok(!credential.test.rules.some((rule) => rule.properties.value === 403));
});

test('action requests use the canonical API and expose company lookup', () => {
	const node = new Cavuno();

	assert.equal(node.description.requestDefaults.baseURL, API_BASE_URL);
	assert.equal(node.description.requestDefaults.ignoreHttpStatusErrors, true);

	const companyOperation = node.description.properties.find(
		(property) => property.name === 'operation' && property.displayOptions?.show?.resource?.includes('company'),
	);
	assert.ok(companyOperation.options.some((option) => option.value === 'find'));

	const companySelectors = node.description.properties.filter(
		(property) => property.name === 'companyId',
	);
	assert.ok(companySelectors.some((property) => property.type === 'resourceLocator'));
	const companyRecordSelector = companySelectors.find((property) =>
		property.displayOptions?.show?.resource?.includes('company'),
	);
	const jobCreateSelector = companySelectors.find(
		(property) =>
			property.displayOptions?.show?.resource?.includes('job') &&
			property.displayOptions?.show?.operation?.includes('create'),
	);
	assert.equal(companyRecordSelector.routing, undefined);
	assert.equal(companyRecordSelector.required, true);
	assert.equal(jobCreateSelector.routing.send.property, 'companyId');
	assert.equal(jobCreateSelector.routing.send.type, 'body');
	const jobFilters = node.description.properties.find(
		(property) =>
			property.name === 'filters' && property.displayOptions?.show?.operation?.includes('getAll'),
	);
	const jobCompanyFilter = jobFilters.options.find((property) => property.name === 'companyId');
	assert.equal(jobCompanyFilter.type, 'resourceLocator');
	assert.equal(jobCompanyFilter.routing.send.type, 'query');

	const routedOperations = node.description.properties.flatMap((property) =>
		Array.isArray(property.options)
			? property.options.filter((option) => option.routing?.request)
			: [],
	);
	assert.equal(routedOperations.length, 19);
	assert.ok(
		routedOperations.every((operation) =>
			operation.routing.output?.postReceive?.includes(throwOnCavunoApiError),
		),
	);

	const secondNode = new Cavuno();
	const secondNodeOperations = secondNode.description.properties.flatMap((property) =>
		Array.isArray(property.options)
			? property.options.filter((option) => option.routing?.request)
			: [],
	);
	assert.ok(
		secondNodeOperations.every(
			(operation) =>
				operation.routing.output?.postReceive?.filter(
					(handler) => handler === throwOnCavunoApiError,
				).length === 1,
		),
	);
});

test('only the action node is eligible for the AI tool picker', () => {
	assert.equal(new Cavuno().description.usableAsTool, true);
	assert.equal(new CavunoTrigger().description.usableAsTool, undefined);
});

test('action errors surface Cavuno messages and explain paid-plan failures', async () => {
	const parameters = { resource: 'job', operation: 'get' };
	const context = {
		getNode: () => ({ name: 'Cavuno' }),
		getNodeParameter: (name) => parameters[name],
	};
	const items = [{ json: { id: 'job_test' } }];

	assert.equal(
		await throwOnCavunoApiError.call(context, items, { statusCode: 200, body: {}, headers: {} }),
		items,
	);
	await assert.rejects(
		() =>
			throwOnCavunoApiError.call(context, [], {
				statusCode: 402,
				body: { error: { message: 'This feature requires a paid plan' } },
				headers: {},
			}),
		/Cavuno: This feature requires a paid plan.*upgrade the board's plan/i,
	);
	await assert.rejects(
		() =>
			throwOnCavunoApiError.call(context, [], {
				statusCode: 403,
				body: { error: { message: 'Missing jobs.read scope' } },
				headers: {},
			}),
		/Cavuno: Missing jobs\.read scope/,
	);

	parameters.resource = 'company';
	parameters.operation = 'find';
	assert.deepEqual(
		await throwOnCavunoApiError.call(context, [{ json: { error: 'not found' } }], {
			statusCode: 404,
			body: { error: { message: 'Company not found' } },
			headers: {},
		}),
		[],
	);
});

test('company lookup searches the canonical API and maps selectable results', async () => {
	const requests = [];
	const context = {
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				return {
					data: [
						{ id: 'com_acme', name: 'Acme', website: 'https://acme.example' },
						{ id: '', name: 'Incomplete' },
					],
					hasMore: true,
					nextCursor: 'cursor_2',
				};
			},
		},
	};

	const response = await searchCompanies.call(context, ' Acme ', 'cursor_1');

	assert.deepEqual(requests[0], {
		method: 'POST',
		url: `${API_BASE_URL}/companies/search`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: { query: 'Acme', limit: 100, cursor: 'cursor_1' },
		json: true,
	});
	assert.deepEqual(response.results, [
		{
			name: 'Acme',
			value: 'com_acme',
			description: 'https://acme.example',
		},
	]);
	assert.equal(response.paginationToken, 'cursor_2');
});

test('company find rejects an empty search and normalizes ID, website, and name lookups', async () => {
	const values = { findCompanyId: ' ', findName: ' ', findWebsite: ' ' };
	const context = {
		getNode: () => ({ name: 'Cavuno' }),
		getNodeParameter: (name) => values[name],
	};

	await assert.rejects(
		() => normalizeCompanyFindBody.call(context, { body: {} }),
		/Enter a company ID, name, or website/,
	);

	values.findCompanyId = ' com_acme/legacy ';
	let request = await normalizeCompanyFindBody.call(context, {
		method: 'POST',
		url: '/companies/find-or-create',
		body: {},
	});
	assert.equal(request.method, 'GET');
	assert.equal(request.url, '/companies/com_acme%2Flegacy');
	assert.equal(request.body, undefined);

	values.findCompanyId = '';
	values.findName = '';
	values.findWebsite = ' https://acme.example/jobs ';
	request = await normalizeCompanyFindBody.call(context, { body: {} });
	assert.deepEqual(request.body, {
		name: 'https://acme.example/jobs',
		website: 'https://acme.example/jobs',
		matchByName: false,
		createIfMissing: false,
	});

	values.findWebsite = '';
	values.findName = ' Acme ';
	request = await normalizeCompanyFindBody.call(context, {
		method: 'POST',
		url: '/companies/find-or-create',
		body: {},
	});
	assert.equal(request.url, '/companies/search');
	assert.deepEqual(request.body, { query: 'Acme', limit: 25 });

	assert.deepEqual(
		await normalizeCompanyFindOutput.call(context, [
			{
				json: {
					data: [
						{ id: 'com_acme', name: 'ACME' },
						{ id: 'com_other', name: 'Acme Holdings' },
					],
				},
			},
		]),
		[{ json: { id: 'com_acme', name: 'ACME' } }],
	);
});

test('trigger lifecycle calls the canonical API without a credential base URL', async () => {
	const node = new CavunoTrigger();
	const requests = [];
	const staticData = {};
	const context = {
		getCredentials: async () => ({ apiKey: 'cavuno_live_test' }),
		getNodeWebhookUrl: () => 'https://n8n.example/webhook/cavuno',
		getNodeParameter: () => ['job.created'],
		getWorkflowStaticData: () => staticData,
		getNode: () => ({ name: 'Cavuno Trigger' }),
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				return { id: 'weh_test', secret: 'whsec_dGVzdA==' };
			},
		},
	};

	assert.equal(await node.webhookMethods.default.create.call(context), true);
	assert.equal(requests[0].url, `${API_BASE_URL}/webhook-endpoints`);
	assert.equal(staticData.webhookId, 'weh_test');
});

test('trigger output adds friendly fields and keeps the original envelope', async () => {
	const node = new CavunoTrigger();
	const secret = 'whsec_dGVzdA==';
	const event = {
		id: 'evt_test',
		object: 'event',
		type: 'job.created',
		occurred_at: '2026-08-17T00:00:00Z',
		board_id: 'brd_test',
		data: {
			object: {
				id: 'job_test',
				object: 'job',
				title: 'Test job',
			},
			changed_fields: ['title'],
		},
	};
	const rawBody = Buffer.from(JSON.stringify(event));
	const timestamp = String(Math.floor(Date.now() / 1000));
	const webhookId = 'msg_test';
	const signature = createHmac('sha256', Buffer.from('test'))
		.update(`${webhookId}.${timestamp}.${rawBody.toString('utf8')}`, 'utf8')
		.digest('base64');
	const response = {
		statusCode: 0,
		body: undefined,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(body) {
			this.body = body;
			return this;
		},
	};
	const context = {
		getRequestObject: () => ({
			headers: {
				'webhook-id': webhookId,
				'webhook-timestamp': timestamp,
				'webhook-signature': `v1,${signature}`,
			},
			rawBody,
		}),
		getResponseObject: () => response,
		getWorkflowStaticData: () => ({ secret }),
		helpers: {
			returnJsonArray: (value) => [{ json: value }],
		},
	};

	const result = await node.webhook.call(context);
	const output = result.workflowData[0][0].json;

	assert.equal(response.statusCode, 202);
	assert.equal(output.occurredAt, event.occurred_at);
	assert.equal(output.boardId, event.board_id);
	assert.deepEqual(output.changedFields, event.data.changed_fields);
	assert.equal(output.object, 'event');
	assert.deepEqual(output.resource, event.data.object);
	assert.deepEqual(output.data, event.data);
	assert.equal(output.occurred_at, event.occurred_at);
});

function jobCreateContext(typeVersion, parameters) {
	const values = { resource: 'job', operation: 'create', ...parameters };
	return {
		getNode: () => ({ name: 'Cavuno', typeVersion }),
		getNodeParameter: (name, fallback) => (name in values ? values[name] : fallback),
	};
}

const jobCreateBody = () => ({
	title: 'Engineer',
	description: 'Build things',
	applicationUrl: 'https://acme.example/apply',
	company: 'Acme',
});

test('job create is light-versioned: 1.1 asks for a work arrangement, 1 keeps its fields', () => {
	const node = new Cavuno();
	assert.deepEqual(node.description.version, [1, 1.1]);
	assert.equal(node.description.defaultVersion, 1.1);

	const createProperties = node.description.properties.filter(
		(property) =>
			property.displayOptions?.show?.resource?.includes('job') &&
			property.displayOptions?.show?.operation?.includes('create'),
	);
	const workArrangement = createProperties.find((property) => property.name === 'workArrangement');
	assert.equal(workArrangement.required, true);
	assert.deepEqual(workArrangement.options.map(({ value }) => value).sort(), [
		'hybrid',
		'on_site',
		'remote',
	]);
	assert.deepEqual(workArrangement.displayOptions.show['@version'], [{ _cnd: { gte: 1.1 } }]);
	const officeLocations = createProperties.find((property) => property.name === 'officeLocations');
	assert.deepEqual(officeLocations.displayOptions.show.workArrangement, ['on_site', 'hybrid']);

	const [v1Fields, v11Fields] = createProperties.filter(
		(property) => property.name === 'additionalFields',
	);
	assert.deepEqual(v1Fields.displayOptions.show['@version'], [1]);
	const names = (collection) => collection.options.map(({ name }) => name);
	for (const field of ['remote', 'salaryMin', 'salaryCurrency']) {
		assert.ok(names(v1Fields).includes(field));
		assert.ok(!names(v11Fields).includes(field));
	}
});

test('job create 1.1 sends the work arrangement with the data it needs', async () => {
	let request = await normalizeJobBody.call(
		jobCreateContext(1.1, {
			workArrangement: 'hybrid',
			'officeLocations.location': [{ query: ' Berlin, Germany ' }, { query: '' }],
		}),
		{ body: jobCreateBody() },
	);
	assert.equal(request.body.remoteOption, 'hybrid');
	assert.deepEqual(request.body.officeLocations, [{ query: 'Berlin, Germany' }]);
	assert.equal(request.body.remotePermits, undefined);

	request = await normalizeJobBody.call(jobCreateContext(1.1, { workArrangement: 'remote' }), {
		body: jobCreateBody(),
	});
	assert.equal(request.body.remoteOption, 'remote');
	assert.deepEqual(request.body.remotePermits, [{ type: 'worldwide', value: 'worldwide' }]);
	assert.equal(request.body.officeLocations, undefined);

	await assert.rejects(
		() =>
			normalizeJobBody.call(
				jobCreateContext(1.1, {
					workArrangement: 'on_site',
					'officeLocations.location': [{ query: ' ' }],
				}),
				{ body: jobCreateBody() },
			),
		/need at least one Office Location/,
	);
	await assert.rejects(
		() =>
			normalizeJobBody.call(jobCreateContext(1.1, { workArrangement: '' }), {
				body: jobCreateBody(),
			}),
		/Choose a Work Arrangement/,
	);
});

test('job create 1.1 sends a salary only with its currency and pay period', async () => {
	const remote = { workArrangement: 'remote' };
	let request = await normalizeJobBody.call(
		jobCreateContext(1.1, {
			...remote,
			'salary.range': {
				salaryMin: 90000,
				salaryMax: 0,
				salaryCurrency: ' eur ',
				salaryTimeframe: 'per_year',
			},
		}),
		{ body: jobCreateBody() },
	);
	assert.equal(request.body.salaryMin, 90000);
	assert.equal(request.body.salaryMax, undefined);
	assert.equal(request.body.salaryCurrency, 'EUR');
	assert.equal(request.body.salaryTimeframe, 'per_year');

	request = await normalizeJobBody.call(jobCreateContext(1.1, remote), {
		body: jobCreateBody(),
	});
	assert.equal(request.body.salaryMin, undefined);
	assert.equal(request.body.salaryCurrency, undefined);

	await assert.rejects(
		() =>
			normalizeJobBody.call(
				jobCreateContext(1.1, {
					...remote,
					'salary.range': {
						salaryMax: 120000,
						salaryCurrency: '',
						salaryTimeframe: 'per_year',
					},
				}),
				{ body: jobCreateBody() },
			),
		/Salary Currency must be a three-letter ISO 4217 code/,
	);
	await assert.rejects(
		() =>
			normalizeJobBody.call(
				jobCreateContext(1.1, {
					...remote,
					'salary.range': {
						salaryMin: 0,
						salaryMax: 0,
						salaryCurrency: 'USD',
						salaryTimeframe: 'per_year',
					},
				}),
				{ body: jobCreateBody() },
			),
		/Salary needs a Minimum or a Maximum above 0/,
	);
});

test('job create 1 keeps the Fully Remote toggle and ignores 1.1 inputs', async () => {
	let request = await normalizeJobBody.call(jobCreateContext(1, { workArrangement: 'on_site' }), {
		body: { ...jobCreateBody(), remote: true, salaryMin: 50000 },
	});
	assert.equal(request.body.remoteOption, 'remote');
	assert.deepEqual(request.body.remotePermits, [{ type: 'worldwide', value: 'worldwide' }]);
	assert.equal(request.body.remote, undefined);
	assert.equal(request.body.salaryMin, 50000);
	assert.equal(request.body.officeLocations, undefined);

	request = await normalizeJobBody.call(jobCreateContext(1, {}), {
		body: jobCreateBody(),
	});
	assert.equal(request.body.remoteOption, undefined);
});

const ID_PATH_CASES = [
	['job_123', 'job_123'],
	['a/b', 'a%2Fb'],
	['../jobs/victim?force=true#x', '..%2Fjobs%2Fvictim%3Fforce%3Dtrue%23x'],
	['%2e%2e', '%252e%252e'],
	['a\\b', 'a%5Cb'],
];
const REJECTED_IDS = ['', ' ', '.', '..', undefined];

test('apiPath encodes each ID as one segment and rejects empty, . and ..', () => {
	const context = { getNode: () => ({ name: 'Cavuno' }) };
	for (const [id, encoded] of ID_PATH_CASES) {
		assert.equal(apiPath(context, 'jobs', id, 'publish'), `/jobs/${encoded}/publish`);
	}
	for (const id of REJECTED_IDS) {
		assert.throws(() => apiPath(context, 'jobs', id), /Enter a valid ID/);
	}
});

test('record IDs cannot change the path of an authenticated action request', async () => {
	const resources = {
		company: ['companies', 'companyId', ['delete', 'get', 'update']],
		candidate: ['candidates', 'candidateId', ['delete', 'get']],
		job: ['jobs', 'jobId', ['delete', 'expire', 'get', 'publish', 'update']],
		marketingPermission: ['marketing-permissions', 'marketingPermissionId', ['withdraw']],
	};
	const actions = ['expire', 'publish', 'withdraw'];
	const node = new Cavuno();
	const send = async (operation, parameters) => {
		const context = {
			getNode: () => ({ name: 'Cavuno' }),
			getNodeParameter: (name) => parameters[name],
		};
		let options = { ...operation.routing.request, body: {} };
		for (const hook of operation.routing.send?.preSend ?? []) {
			options = await hook.call(context, options);
		}
		return options;
	};

	for (const [resource, [collection, parameter, operations]] of Object.entries(resources)) {
		const property = node.description.properties.find(
			(entry) =>
				entry.name === 'operation' && entry.displayOptions?.show?.resource?.includes(resource),
		);
		const covered = property.options.filter((option) => operations.includes(option.value));
		assert.equal(covered.length, operations.length, resource);

		for (const operation of covered) {
			assert.ok(
				!operation.routing.request.url.includes('{{'),
				`${resource}.${operation.value} must not interpolate the ID`,
			);
			const suffix = actions.includes(operation.value) ? `/${operation.value}` : '';
			for (const [id, encoded] of ID_PATH_CASES) {
				const options = await send(operation, { [parameter]: id });
				const url = new URL(`${API_BASE_URL}${options.url}`);
				assert.equal(
					url.pathname,
					`/v1/${collection}/${encoded}${suffix}`,
					`${resource}.${operation.value}: ${id}`,
				);
				assert.equal(url.search, '');
				assert.equal(url.hash, '');
			}
			for (const id of REJECTED_IDS) {
				await assert.rejects(
					() => send(operation, { [parameter]: id }),
					/Enter a valid ID/,
					`${resource}.${operation.value}: ${JSON.stringify(id)}`,
				);
			}
		}
	}

	// No other action operation builds its URL from an expression.
	for (const property of node.description.properties) {
		for (const option of property.options ?? []) {
			const url = option.routing?.request?.url;
			if (typeof url === 'string') {
				assert.ok(!url.includes('{{'), `${option.value}: ${url}`);
			}
		}
	}
});

test('company find by ID refuses . and .. instead of reaching another route', async () => {
	for (const id of ['.', '..']) {
		const values = { findCompanyId: id, findName: '', findWebsite: '' };
		const context = {
			getNode: () => ({ name: 'Cavuno' }),
			getNodeParameter: (name) => values[name],
		};
		await assert.rejects(
			() => normalizeCompanyFindBody.call(context, { body: {} }),
			/Enter a valid ID/,
		);
	}
});

test('trigger encodes the stored webhook endpoint ID in every request path', async () => {
	const node = new CavunoTrigger();
	const requests = [];
	const staticData = { webhookId: '../jobs/victim', secret: 'whsec_dGVzdA==' };
	const context = {
		getNodeWebhookUrl: () => 'https://n8n.example/webhook/cavuno',
		getNodeParameter: () => ['job.created'],
		getWorkflowStaticData: () => staticData,
		getNode: () => ({ name: 'Cavuno Trigger' }),
		getMode: () => 'trigger',
		logger: { debug: () => {} },
		helpers: {
			httpRequestWithAuthentication: async (_credentialType, options) => {
				requests.push(options);
				return { url: 'https://old.example/hook', event_types: [] };
			},
		},
	};
	const encodedPath = `${API_BASE_URL}/webhook-endpoints/..%2Fjobs%2Fvictim`;

	assert.equal(await node.webhookMethods.default.checkExists.call(context), false);
	assert.deepEqual(
		requests.map(({ method, url }) => [method, url]),
		[
			['GET', encodedPath],
			['DELETE', encodedPath],
		],
	);

	requests.length = 0;
	staticData.webhookId = '../jobs/victim';
	assert.equal(await node.webhookMethods.default.delete.call(context), true);
	assert.deepEqual(
		requests.map(({ method, url }) => [method, url]),
		[['DELETE', encodedPath]],
	);

	requests.length = 0;
	staticData.webhookId = '..';
	staticData.secret = 'whsec_dGVzdA==';
	await assert.rejects(
		() => node.webhookMethods.default.checkExists.call(context),
		/Enter a valid ID/,
	);
	assert.equal(requests.length, 0);
});
