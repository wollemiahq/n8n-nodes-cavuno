import type { INodeProperties } from 'n8n-workflow';
import { companyIdSelector } from '../company/selector';
import { jobOptionalFields } from './shared';

const showOnlyForJobUpdate = {
	operation: ['update'],
	resource: ['job'],
};

// Status and the inline company are create-only in the API, so Update offers
// neither: status changes go through the Publish and Expire operations, and
// re-parenting uses Company ID.
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
			companyIdSelector('The existing company to move this job to', { sendToBody: true }),
			...jobOptionalFields,
		],
	},
];
