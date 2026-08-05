import type { INodeProperties } from 'n8n-workflow';
import { companyOptionalFields } from './shared';

const showOnlyForCompanyCreate = {
	operation: ['create'],
	resource: ['company'],
};

const showOnlyForCompanyFindOrCreate = {
	operation: ['findOrCreate'],
	resource: ['company'],
};

export const companyCreateDescription: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['company'],
				operation: ['create', 'findOrCreate'],
			},
		},
		description: 'The company name',
		routing: {
			send: {
				type: 'body',
				property: 'name',
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
			show: showOnlyForCompanyCreate,
		},
		options: companyOptionalFields,
	},
	{
		displayName: 'Options',
		name: 'findOrCreateOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: showOnlyForCompanyFindOrCreate,
		},
		options: [
			{
				displayName: 'Create If Missing',
				name: 'createIfMissing',
				type: 'boolean',
				default: true,
				description: 'Whether to create the company when no match is found',
				routing: {
					send: {
						type: 'body',
						property: 'createIfMissing',
					},
				},
			},
			{
				displayName: 'Match by Name',
				name: 'matchByName',
				type: 'boolean',
				default: true,
				description: 'Whether to match existing companies by name',
				routing: {
					send: {
						type: 'body',
						property: 'matchByName',
					},
				},
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'Short company summary used when the company is created',
				routing: {
					send: {
						type: 'body',
						property: 'summary',
					},
				},
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'Company website URL used when the company is created',
				routing: {
					send: {
						type: 'body',
						property: 'website',
					},
				},
			},
		],
	},
];
