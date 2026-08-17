import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { candidateDescription } from './resources/candidate';
import { companyDescription } from './resources/company';
import { searchCompanies } from './resources/company/selector';
import { jobDescription } from './resources/job';
import { marketingPermissionDescription } from './resources/marketingPermission';
import { CAVUNO_API_BASE_URL } from '../../shared/api';
import { addCavunoErrorHandling } from './errors';

export class Cavuno implements INodeType {
	methods = {
		listSearch: {
			searchCompanies,
		},
	};

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
			baseURL: CAVUNO_API_BASE_URL,
			ignoreHttpStatusErrors: true,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: addCavunoErrorHandling([
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
		]),
	};
}
