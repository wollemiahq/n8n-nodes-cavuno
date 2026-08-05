import type { INodeProperties } from 'n8n-workflow';
import { marketingPermissionGetAllDescription } from './getAll';

const showOnlyForMarketingPermissions = {
	resource: ['marketingPermission'],
};

export const marketingPermissionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: showOnlyForMarketingPermissions,
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many marketing permissions',
				description: 'Get marketing permission records, optionally by exact email',
				routing: {
					request: {
						method: 'GET',
						url: '/marketing-permissions',
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
				name: 'Withdraw',
				value: 'withdraw',
				action: 'Withdraw a marketing permission',
				description:
					'Withdraw marketing consent for a contact. Withdrawal is idempotent; granting consent is only possible on board-user surfaces, never through this API.',
				routing: {
					request: {
						method: 'POST',
						url: '=/marketing-permissions/{{$parameter.marketingPermissionId}}/withdraw',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Marketing Permission ID',
		name: 'marketingPermissionId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				...showOnlyForMarketingPermissions,
				operation: ['withdraw'],
			},
		},
		description:
			'The ID of the marketing permission record. Look it up with Get Many using the exact-match email filter.',
	},
	...marketingPermissionGetAllDescription,
];
