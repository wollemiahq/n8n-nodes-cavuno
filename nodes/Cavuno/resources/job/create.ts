import type { INodeProperties } from 'n8n-workflow';
import { companyIdSelector } from '../company/selector';
import {
	WORK_ARRANGEMENT_VERSION,
	jobCreateOptionalFields,
	jobCreateStatusField,
	jobOptionalFields,
	salaryTimeframeOptions,
	workArrangementOptions,
} from './shared';

const showOnlyForJobCreate = {
	operation: ['create'],
	resource: ['job'],
};

// Light versioning: a parameter change that would alter saved workflows goes
// behind a new node version. Version 1 workflows keep their fields; nodes
// added from 1.1 on get the inputs the API now requires.
const showOnlyForJobCreateV1 = {
	...showOnlyForJobCreate,
	'@version': [1],
};
const showOnlyForJobCreateFromV1_1 = {
	...showOnlyForJobCreate,
	'@version': [{ _cnd: { gte: WORK_ARRANGEMENT_VERSION } }],
};

export const jobCreateDescription: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
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
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
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
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
		description: 'Where candidates apply for this job',
		routing: {
			send: {
				type: 'body',
				property: 'applicationUrl',
			},
		},
	},
	companyIdSelector(
		'An existing company on your board. Every job needs a company: choose one here or enter a Company Name (not both).',
		{ displayOptions: { show: showOnlyForJobCreate }, sendTo: 'body' },
	),
	{
		displayName: 'Company Name',
		name: 'company',
		type: 'string',
		default: '',
		displayOptions: {
			show: showOnlyForJobCreate,
		},
		description:
			'A company name to attach the job to. An existing company with this name is reused, otherwise one is created. Leave empty when you use Company ID.',
		routing: {
			send: {
				type: 'body',
				property: 'company',
			},
		},
	},
	{
		displayName: 'Work Arrangement',
		name: 'workArrangement',
		type: 'options',
		required: true,
		options: workArrangementOptions,
		default: 'on_site',
		displayOptions: {
			show: showOnlyForJobCreateFromV1_1,
		},
		description:
			'Where the work happens. On-site and hybrid jobs need at least one office location; remote jobs are open to candidates anywhere.',
		// Sent by normalizeJobBody, which pairs it with the office locations or
		// remote permits the API requires alongside it.
	},
	{
		displayName: 'Office Locations',
		name: 'officeLocations',
		type: 'fixedCollection',
		placeholder: 'Add Office Location',
		required: true,
		typeOptions: {
			multipleValues: true,
		},
		default: { location: [{ query: '' }] },
		displayOptions: {
			show: {
				...showOnlyForJobCreateFromV1_1,
				workArrangement: ['on_site', 'hybrid'],
			},
		},
		description: 'The offices candidates work from',
		options: [
			{
				displayName: 'Location',
				name: 'location',
				values: [
					{
						displayName: 'Location',
						name: 'query',
						type: 'string',
						default: '',
						placeholder: 'e.g. Berlin, Germany',
						description:
							'City and country, resolved by Cavuno. A location Cavuno cannot match returns an error.',
					},
				],
			},
		],
	},
	{
		displayName: 'Salary',
		name: 'salary',
		type: 'fixedCollection',
		placeholder: 'Add Salary',
		default: {},
		displayOptions: {
			show: showOnlyForJobCreateFromV1_1,
		},
		description: 'The salary range. A salary needs its currency and pay period.',
		options: [
			{
				displayName: 'Range',
				name: 'range',
				values: [
					{
						displayName: 'Minimum',
						name: 'salaryMin',
						type: 'number',
						default: 0,
						description: 'Lower bound of the salary range. 0 means not set.',
					},
					{
						displayName: 'Maximum',
						name: 'salaryMax',
						type: 'number',
						default: 0,
						description: 'Upper bound of the salary range. 0 means not set.',
					},
					{
						displayName: 'Currency',
						name: 'salaryCurrency',
						type: 'string',
						required: true,
						default: '',
						placeholder: 'USD',
						description: 'ISO 4217 currency code for the salary range',
					},
					{
						displayName: 'Pay Period',
						name: 'salaryTimeframe',
						type: 'options',
						required: true,
						options: salaryTimeframeOptions,
						default: 'per_year',
						description: 'The period the salary range is paid over',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForJobCreateV1,
		},
		options: [...jobOptionalFields, jobCreateStatusField],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: showOnlyForJobCreateFromV1_1,
		},
		options: [...jobCreateOptionalFields, jobCreateStatusField],
	},
];
