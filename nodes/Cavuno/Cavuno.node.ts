import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { candidateDescription } from './resources/candidate';
import { companyDescription } from './resources/company';
import { jobDescription } from './resources/job';
import { marketingPermissionDescription } from './resources/marketingPermission';

export class Cavuno implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cavuno',
		name: 'cavuno',
		icon: { light: 'file:cavuno.svg', dark: 'file:cavuno.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage jobs, companies, candidates, and marketing permissions on a Cavuno job board',
		defaults: {
			name: 'Cavuno',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'cavunoApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(new RegExp("/+$"), "")}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Candidate',
						value: 'candidate',
					},
					{
						name: 'Company',
						value: 'company',
					},
					{
						name: 'Job',
						value: 'job',
					},
					{
						name: 'Marketing Permission',
						value: 'marketingPermission',
					},
				],
				default: 'job',
			},
			...jobDescription,
			...companyDescription,
			...candidateDescription,
			...marketingPermissionDescription,
		],
	};
}
