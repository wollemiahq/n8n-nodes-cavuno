import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeProperties,
	JsonObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const showOnlyForCompanyFind = {
	operation: ['find'],
	resource: ['company'],
};

export async function normalizeCompanyFindBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const rawCompanyId = this.getNodeParameter('findCompanyId');
	const rawName = this.getNodeParameter('findName');
	const rawWebsite = this.getNodeParameter('findWebsite');
	const companyId = typeof rawCompanyId === 'string' ? rawCompanyId.trim() : '';
	const name = typeof rawName === 'string' ? rawName.trim() : '';
	const website = typeof rawWebsite === 'string' ? rawWebsite.trim() : '';

	if (!companyId && !name && !website) {
		throw new NodeOperationError(this.getNode(), 'Enter a company ID, name, or website');
	}

	if (companyId) {
		requestOptions.method = 'GET';
		requestOptions.url = `/companies/${encodeURIComponent(companyId)}`;
		delete requestOptions.body;
		return requestOptions;
	}

	if (website) {
		requestOptions.body = {
			name: name || website,
			website,
			matchByName: Boolean(name),
			createIfMissing: false,
		};
		return requestOptions;
	}

	requestOptions.url = '/companies/search';
	requestOptions.body = { query: name, limit: 25 };
	return requestOptions;
}

export async function normalizeCompanyFindOutput(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const companyId = String(this.getNodeParameter('findCompanyId') ?? '').trim();
	const website = String(this.getNodeParameter('findWebsite') ?? '').trim();
	if (companyId) return items;

	if (website) {
		return items.map((item) => {
			const company = { ...item.json };
			delete company.matched;
			return { ...item, json: company };
		});
	}

	const name = String(this.getNodeParameter('findName') ?? '').trim().toLowerCase();
	const envelope = items[0];
	const rows = Array.isArray((envelope?.json as { data?: unknown[] } | undefined)?.data)
		? ((envelope?.json as { data: unknown[] }).data ?? [])
		: [];

	return rows
		.filter(
			(row): row is JsonObject =>
				typeof row === 'object' &&
				row !== null &&
				!Array.isArray(row) &&
				typeof (row as JsonObject).name === 'string' &&
				((row as JsonObject).name as string).toLowerCase() === name,
		)
		.map((company) => ({ ...envelope, json: company }));
}

export const companyFindDescription: INodeProperties[] = [
	{
		displayName: 'Company ID',
		name: 'findCompanyId',
		type: 'string',
		default: '',
		displayOptions: { show: showOnlyForCompanyFind },
		description: 'Cavuno company ID. Used before website or name when provided.',
	},
	{
		displayName: 'Name',
		name: 'findName',
		type: 'string',
		default: '',
		displayOptions: { show: showOnlyForCompanyFind },
		description: 'Exact company display name (case-insensitive)',
	},
	{
		displayName: 'Website',
		name: 'findWebsite',
		type: 'string',
		default: '',
		placeholder: 'https://example.com',
		displayOptions: { show: showOnlyForCompanyFind },
		description: 'Company website, matched by domain. Preferred when both fields are set.',
	},
];
