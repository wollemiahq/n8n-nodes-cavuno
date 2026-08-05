import type { INodeProperties } from 'n8n-workflow';
import { jobOptionalFields } from './shared';

const showOnlyForJobUpdate = {
	operation: ['update'],
	resource: ['job'],
};

export const jobUpdateDescription: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForJobUpdate,
		},
		options: [
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'The job title',
				routing: {
					send: {
						type: 'body',
						property: 'title',
					},
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description: 'The job description (HTML or plain text)',
				routing: {
					send: {
						type: 'body',
						property: 'description',
					},
				},
			},
			{
				displayName: 'Application URL',
				name: 'applicationUrl',
				type: 'string',
				default: '',
				description: 'Where candidates apply for this job',
				routing: {
					send: {
						type: 'body',
						property: 'applicationUrl',
					},
				},
			},
			...jobOptionalFields,
		],
	},
];
