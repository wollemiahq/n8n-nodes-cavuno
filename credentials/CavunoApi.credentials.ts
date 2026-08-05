import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

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
			displayName: 'API Base URL',
			name: 'baseUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://your-board.com/api/v1',
			description:
				'Your job board\'s API base URL, ending in /api/v1. Find it in your Cavuno dashboard under Settings → API.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'A Cavuno API key (starts with cavuno_live_). Create one in your Cavuno dashboard under Settings → API. The Cavuno trigger additionally needs the webhooks.read and webhooks.manage scopes plus the read scope of each event family you subscribe to.',
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
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
			url: '/jobs',
			method: 'GET',
			qs: { limit: 1 },
		},
	};
}
