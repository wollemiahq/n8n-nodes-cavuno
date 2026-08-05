import type { INodeProperties } from 'n8n-workflow';
import { jobOptionalFields } from './shared';

const showOnlyForJobCreate = {
	operation: ['create'],
	resource: ['job'],
};

export const jobCreateDescription: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
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
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
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
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
		description: 'Where candidates apply for this job',
		routing: {
			send: {
				type: 'body',
				property: 'applicationUrl',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForJobCreate,
		},
		options: jobOptionalFields,
	},
];
