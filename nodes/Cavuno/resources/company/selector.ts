import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodeProperties,
} from 'n8n-workflow';
import { CAVUNO_API_BASE_URL } from '../../../../shared/api';

export function companyIdSelector(
	description: string,
	options: {
		displayOptions?: INodeProperties['displayOptions'];
		required?: boolean;
		sendTo?: 'body' | 'query';
	} = {},
): INodeProperties {
	const { displayOptions, required = false, sendTo } = options;

	return {
		displayName: 'Company',
		name: 'companyId',
		type: 'resourceLocator',
		...(required ? { required: true } : {}),
		default: { mode: 'list', value: '' },
		displayOptions,
		description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'searchCompanies',
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'com_…',
			},
		],
		...(sendTo
			? {
					routing: {
						send: {
							type: sendTo,
							property: 'companyId',
						},
					},
				}
			: {}),
	};
}

type CompanyListResponse = {
	data?: Array<{ id?: string; name?: string; website?: string | null }>;
	hasMore?: boolean;
	nextCursor?: string | null;
};

export async function searchCompanies(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const query = filter?.trim() ?? '';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'cavunoApi', {
		method: query ? 'POST' : 'GET',
		url: `${CAVUNO_API_BASE_URL}${query ? '/companies/search' : '/companies'}`,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		...(query
			? {
					body: {
						query,
						limit: 100,
						...(paginationToken ? { cursor: paginationToken } : {}),
					},
				}
			: { qs: { limit: 100, ...(paginationToken ? { cursor: paginationToken } : {}) } }),
		json: true,
	})) as CompanyListResponse;

	return {
		results: (response.data ?? [])
			.filter((company): company is { id: string; name: string; website?: string | null } =>
				Boolean(company.id && company.name),
			)
			.map((company) => ({
				name: company.name,
				value: company.id,
				description: company.website ?? undefined,
			})),
		...(response.hasMore && response.nextCursor
			? { paginationToken: response.nextCursor }
			: {}),
	};
}
