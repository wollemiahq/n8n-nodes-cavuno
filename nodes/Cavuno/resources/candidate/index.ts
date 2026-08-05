import type { INodeProperties } from 'n8n-workflow';
import { candidateGetAllDescription } from './getAll';

const showOnlyForCandidates = {
	resource: ['candidate'],
};

export const candidateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForCandidates,
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a candidate',
				description: 'Delete a candidate and their data',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/candidates/{{$parameter.candidateId}}',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a candidate',
				description: 'Get a single candidate',
				routing: {
					request: {
						method: 'GET',
						url: '=/candidates/{{$parameter.candidateId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many candidates',
				description: 'Get many candidates',
				routing: {
					request: {
						method: 'GET',
						url: '/candidates',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Candidate ID',
		name: 'candidateId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForCandidates,
				operation: ['get', 'delete'],
			},
		},
		description: 'The ID of the candidate',
	},
	...candidateGetAllDescription,
];
