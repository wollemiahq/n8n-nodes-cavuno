import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
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

	requestOptions.body = {
		name: name || website,
		...(website ? { website } : {}),
		matchByName: Boolean(name),
		createIfMissing: false,
	};
	return requestOptions;
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
