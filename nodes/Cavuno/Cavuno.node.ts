import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { candidateDescription } from './resources/candidate';
import { companyDescription } from './resources/company';
import { searchCompanies } from './resources/company/selector';
import { jobDescription } from './resources/job';
import { WORK_ARRANGEMENT_VERSION } from './resources/job/shared';
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
		// 1.1: Job Create requires a Work Arrangement (with office locations for
		// on-site and hybrid) and groups the salary with its currency and pay
		// period. Saved version 1 workflows keep their original fields.
		version: [1, WORK_ARRANGEMENT_VERSION],
		defaultVersion: WORK_ARRANGEMENT_VERSION,
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
