import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination } from '../shared/pagination';

const showOnlyForCandidateGetMany = {
	operation: ['getAll'],
	resource: ['candidate'],
};

export const candidateGetAllDescription: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: showOnlyForCandidateGetMany,
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
				...showOnlyForCandidateGetMany,
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
			show: showOnlyForCandidateGetMany,
		},
		options: [
			{
				displayName: 'Created From',
				name: 'createdFrom',
				type: 'dateTime',
				default: '',
				description: 'Only return candidates created at or after this time',
				routing: {
					send: {
						type: 'query',
						property: 'createdFrom',
					},
				},
			},
			{
				displayName: 'Created To',
				name: 'createdTo',
				type: 'dateTime',
				default: '',
				description: 'Only return candidates created at or before this time',
				routing: {
					send: {
						type: 'query',
						property: 'createdTo',
					},
				},
			},
			{
				displayName: 'Handle',
				name: 'handle',
				type: 'string',
				default: '',
				description: 'Only return the candidate with this profile handle',
				routing: {
					send: {
						type: 'query',
						property: 'handle',
					},
				},
			},
			{
				displayName: 'Has Resume',
				name: 'hasResume',
				type: 'boolean',
				default: false,
				description: 'Whether to only return candidates with an uploaded resume',
				routing: {
					send: {
						type: 'query',
						property: 'hasResume',
					},
				},
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search over candidate name and email',
				routing: {
					send: {
						type: 'query',
						property: 'search',
					},
				},
			},
		],
	},
];
