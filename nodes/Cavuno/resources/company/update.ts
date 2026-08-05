import type { INodeProperties } from 'n8n-workflow';
import { companyOptionalFields } from './shared';

const showOnlyForCompanyUpdate = {
	operation: ['update'],
	resource: ['company'],
};

export const companyUpdateDescription: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForCompanyUpdate,
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The company name',
				routing: {
					send: {
						type: 'body',
						property: 'name',
					},
				},
			},
			...companyOptionalFields,
		],
	},
];
