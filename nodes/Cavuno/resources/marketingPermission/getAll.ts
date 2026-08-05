import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination } from '../shared/pagination';

const showOnlyForMarketingPermissionGetMany = {
	operation: ['getAll'],
	resource: ['marketingPermission'],
};

export const marketingPermissionGetAllDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForMarketingPermissionGetMany,
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: cursorPagination,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				...showOnlyForMarketingPermissionGetMany,
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}',
			},
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: showOnlyForMarketingPermissionGetMany,
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'name@email.com',
				description:
					'Exact-match email lookup. An address with no consent record resolves to zero items.',
				routing: {
					send: {
						type: 'query',
						property: 'email',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Granted', value: 'granted' },
					{ name: 'Withdrawn', value: 'withdrawn' },
				],
				default: 'granted',
				description: 'Only return permissions with this status',
				routing: {
					send: {
						type: 'query',
						property: 'status',
					},
				},
			},
		],
	},
];
