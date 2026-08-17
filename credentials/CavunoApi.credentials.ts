import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';
import { CAVUNO_API_BASE_URL } from '../shared/api';

export class CavunoApi implements ICredentialType {
	name = 'cavunoApi';

	displayName = 'Cavuno API';

	icon: Icon = {
		light: 'file:../nodes/Cavuno/cavuno.svg',
		dark: 'file:../nodes/Cavuno/cavuno.dark.svg',
	};

	documentationUrl = 'https://github.com/wollemiahq/n8n-nodes-cavuno?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'A Cavuno API key (starts with cavuno_live_). Create one under Settings → Developer → API keys. Grant only the scopes your workflows need. The Cavuno trigger needs webhooks.read and webhooks.manage plus the read scope of each event family you subscribe to.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: CAVUNO_API_BASE_URL,
			url: '/jobs',
			method: 'GET',
			qs: { limit: 1 },
			ignoreHttpStatusErrors: true,
		},
		rules: [
			{
				type: 'responseCode',
				properties: {
					value: 401,
					message: 'Invalid, expired, or revoked API key',
				},
			},
			{
				type: 'responseCode',
				properties: {
					value: 402,
					message: 'Cavuno API access needs a paid board plan',
				},
			},
			...([400, 404, 405, 408, 409, 422, 429, 500, 502, 503, 504] as const).map((value) => ({
				type: 'responseCode' as const,
				properties: {
					value,
					message: `Cavuno connection test failed (${value})`,
				},
			})),
		],
	};
}
