import type { INodeProperties } from 'n8n-workflow';
import { jobCreateDescription } from './create';
import { jobGetAllDescription } from './getAll';
import { jobUpdateDescription } from './update';

const showOnlyForJobs = {
	resource: ['job'],
};

export const jobDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForJobs,
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a job',
				description: 'Create a new job posting',
				routing: {
					request: {
						method: 'POST',
						url: '/jobs',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a job',
				description: 'Delete a job posting',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/jobs/{{$parameter.jobId}}',
					},
				},
			},
			{
				name: 'Expire',
				value: 'expire',
				action: 'Expire a job',
				description: 'Expire a job posting so it is no longer open',
				routing: {
					request: {
						method: 'POST',
						url: '=/jobs/{{$parameter.jobId}}/expire',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a job',
				description: 'Get a single job posting',
				routing: {
					request: {
						method: 'GET',
						url: '=/jobs/{{$parameter.jobId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many jobs',
				description: 'Get many job postings',
				routing: {
					request: {
						method: 'GET',
						url: '/jobs',
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
			{
				name: 'Publish',
				value: 'publish',
				action: 'Publish a job',
				description: 'Publish a draft job posting',
				routing: {
					request: {
						method: 'POST',
						url: '=/jobs/{{$parameter.jobId}}/publish',
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a job',
				description: 'Update an existing job posting',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/jobs/{{$parameter.jobId}}',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForJobs,
				operation: ['get', 'update', 'delete', 'publish', 'expire'],
			},
		},
		description: 'The ID of the job posting',
	},
	...jobCreateDescription,
	...jobUpdateDescription,
	...jobGetAllDescription,
];
