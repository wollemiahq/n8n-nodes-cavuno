import type { INodeProperties } from 'n8n-workflow';
import { jobCreateStatusField, jobOptionalFields } from './shared';

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
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
		description:
			'The ID of an existing company on your board. Every job needs a company: fill in this field or Company Name (not both).',
		routing: {
			send: {
				type: 'body',
				property: 'companyId',
			},
		},
	},
	{
		displayName: 'Company Name',
		name: 'company',
		type: 'string',
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
		description:
			'A company name to attach the job to. An existing company with this name is reused, otherwise one is created. Leave empty when you use Company ID.',
		routing: {
			send: {
				type: 'body',
				property: 'company',
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
		options: [...jobOptionalFields, jobCreateStatusField],
	},
];
