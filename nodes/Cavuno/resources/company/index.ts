import type { INodeProperties } from 'n8n-workflow';
import { companyCreateDescription } from './create';
import {
	companyFindDescription,
	normalizeCompanyFindBody,
	normalizeCompanyFindOutput,
} from './find';
import { companyGetAllDescription } from './getAll';
import { companyIdSelector } from './selector';
import { companyUpdateDescription } from './update';

const showOnlyForCompanies = {
	resource: ['company'],
};

export const companyDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForCompanies,
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a company',
				description: 'Create a new company',
					routing: {
					request: {
						method: 'POST',
						url: '/companies',
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a company',
				description: 'Delete a company',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/companies/{{$parameter.companyId}}',
					},
				},
			},
			{
				name: 'Find',
				value: 'find',
				action: 'Find a company',
				description: 'Find a company by ID, website, or exact name without creating it',
				routing: {
					request: {
						method: 'POST',
						url: '/companies/find-or-create',
					},
						send: {
							preSend: [normalizeCompanyFindBody],
						},
						output: {
							postReceive: [normalizeCompanyFindOutput],
						},
					},
			},
			{
				name: 'Find or Create',
				value: 'findOrCreate',
				action: 'Find or create a company',
				description: 'Find a company by name, creating it if it does not exist',
				routing: {
					request: {
						method: 'POST',
						url: '/companies/find-or-create',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a company',
				description: 'Get a single company',
				routing: {
					request: {
						method: 'GET',
						url: '=/companies/{{$parameter.companyId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many companies',
				description: 'Get many companies',
				routing: {
					request: {
						method: 'GET',
						url: '/companies',
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
				name: 'Update',
				value: 'update',
				action: 'Update a company',
				description: 'Update an existing company',
				routing: {
					request: {
						method: 'PATCH',
						url: '=/companies/{{$parameter.companyId}}',
					},
				},
			},
		],
		default: 'getAll',
	},
	companyIdSelector('The company', {
		required: true,
		displayOptions: {
			show: {
				...showOnlyForCompanies,
				operation: ['get', 'update', 'delete'],
			},
		},
	}),
	...companyCreateDescription,
	...companyFindDescription,
	...companyUpdateDescription,
	...companyGetAllDescription,
];
