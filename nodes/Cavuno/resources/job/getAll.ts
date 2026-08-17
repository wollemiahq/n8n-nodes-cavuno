import type { INodeProperties } from 'n8n-workflow';
import { companyIdSelector } from '../company/selector';
import { cursorPagination } from '../shared/pagination';
import { jobStatusFilterOptions } from './shared';

const showOnlyForJobGetMany = {
	operation: ['getAll'],
	resource: ['job'],
};

export const jobGetAllDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForJobGetMany,
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
				...showOnlyForJobGetMany,
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
			show: showOnlyForJobGetMany,
		},
		options: [
			companyIdSelector('Only return jobs belonging to this company', { sendTo: 'query' }),
			{
				displayName: 'External ID',
				name: 'externalId',
				type: 'string',
				default: '',
				description: 'Only return the job with this external ID',
				routing: {
					send: {
						type: 'query',
						property: 'externalId',
					},
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: jobStatusFilterOptions,
				default: 'published',
				description: 'Only return jobs with this status',
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
