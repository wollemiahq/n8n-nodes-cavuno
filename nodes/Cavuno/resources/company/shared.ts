import type { INodeProperties } from 'n8n-workflow';

/**
 * Optional company fields shared by Create (additionalFields) and Update
 * (updateFields). Each option routes itself into the request body.
 */
export const companyOptionalFields: INodeProperties[] = [
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: {
			rows: 5,
		},
		default: '',
		description: 'Longer company description (HTML or plain text)',
		routing: {
			send: {
				type: 'body',
				property: 'description',
			},
		},
	},
	{
		displayName: 'Facebook URL',
		name: 'facebookUrl',
		type: 'string',
		default: '',
		description: 'URL of the company Facebook page',
		routing: {
			send: {
				type: 'body',
				property: 'facebookUrl',
			},
		},
	},
	{
		displayName: 'LinkedIn URL',
		name: 'linkedinUrl',
		type: 'string',
		default: '',
		description: 'URL of the company LinkedIn page',
		routing: {
			send: {
				type: 'body',
				property: 'linkedinUrl',
			},
		},
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		default: '',
		description: 'URL slug for the company page. Generated from the name when omitted.',
		routing: {
			send: {
				type: 'body',
				property: 'slug',
			},
		},
	},
	{
		displayName: 'Summary',
		name: 'summary',
		type: 'string',
		default: '',
		description: 'Short company summary',
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
		description: 'Company website URL',
		routing: {
			send: {
				type: 'body',
				property: 'website',
			},
		},
	},
	{
		displayName: 'X (Twitter) URL',
		name: 'xUrl',
		type: 'string',
		default: '',
		description: 'URL of the company X (Twitter) profile',
		routing: {
			send: {
				type: 'body',
				property: 'xUrl',
			},
		},
	},
];
