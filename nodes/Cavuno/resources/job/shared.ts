import type { INodePropertyOptions, INodeProperties } from 'n8n-workflow';

/**
 * Optional job fields shared by Create (additionalFields) and Update
 * (updateFields). Each option routes itself into the request body, so the
 * collection needs no collection-level routing.
 */
export const jobOptionalFields: INodeProperties[] = [
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		description: 'ID of the company this job belongs to',
		routing: {
			send: {
				type: 'body',
				property: 'companyId',
			},
		},
	},
	{
		displayName: 'Company Name',
		name: 'company',
		type: 'string',
		default: '',
		description:
			'Company name to attach the job to (matched or created board-side). Use Company ID instead when you have it.',
		routing: {
			send: {
				type: 'body',
				property: 'company',
			},
		},
	},
	{
		displayName: 'Employment Type',
		name: 'employmentType',
		type: 'options',
		options: [
			{ name: 'Contract', value: 'contract' },
			{ name: 'Full-Time', value: 'full_time' },
			{ name: 'Internship', value: 'internship' },
			{ name: 'Other', value: 'other' },
			{ name: 'Part-Time', value: 'part_time' },
			{ name: 'Temporary', value: 'temporary' },
			{ name: 'Volunteer', value: 'volunteer' },
		],
		default: 'full_time',
		description: 'The employment type of the job',
		routing: {
			send: {
				type: 'body',
				property: 'employmentType',
			},
		},
	},
	{
		displayName: 'Expires At',
		name: 'expiresAt',
		type: 'dateTime',
		default: '',
		description: 'When the job posting expires',
		routing: {
			send: {
				type: 'body',
				property: 'expiresAt',
			},
		},
	},
	{
		displayName: 'External ID',
		name: 'externalId',
		type: 'string',
		default: '',
		description: 'Your own stable identifier for this job, used for deduplication',
		routing: {
			send: {
				type: 'body',
				property: 'externalId',
			},
		},
	},
	{
		displayName: 'Remote Option',
		name: 'remoteOption',
		type: 'options',
		options: [
			{ name: 'Hybrid', value: 'hybrid' },
			{ name: 'On-Site', value: 'on_site' },
			{ name: 'Remote', value: 'remote' },
		],
		default: 'on_site',
		description: 'The remote policy of the job',
		routing: {
			send: {
				type: 'body',
				property: 'remoteOption',
			},
		},
	},
	{
		displayName: 'Salary Currency',
		name: 'salaryCurrency',
		type: 'string',
		default: '',
		placeholder: 'USD',
		description: 'ISO 4217 currency code for the salary range',
		routing: {
			send: {
				type: 'body',
				property: 'salaryCurrency',
			},
		},
	},
	{
		displayName: 'Salary Max',
		name: 'salaryMax',
		type: 'number',
		default: 0,
		description: 'Upper bound of the salary range',
		routing: {
			send: {
				type: 'body',
				property: 'salaryMax',
			},
		},
	},
	{
		displayName: 'Salary Min',
		name: 'salaryMin',
		type: 'number',
		default: 0,
		description: 'Lower bound of the salary range',
		routing: {
			send: {
				type: 'body',
				property: 'salaryMin',
			},
		},
	},
	{
		displayName: 'Salary Timeframe',
		name: 'salaryTimeframe',
		type: 'options',
		options: [
			{ name: 'Per Day', value: 'per_day' },
			{ name: 'Per Hour', value: 'per_hour' },
			{ name: 'Per Month', value: 'per_month' },
			{ name: 'Per Week', value: 'per_week' },
			{ name: 'Per Year', value: 'per_year' },
		],
		default: 'per_year',
		description: 'The timeframe the salary range refers to',
		routing: {
			send: {
				type: 'body',
				property: 'salaryTimeframe',
			},
		},
	},
	{
		displayName: 'Seniority',
		name: 'seniority',
		type: 'options',
		options: [
			{ name: 'Associate', value: 'associate' },
			{ name: 'Director', value: 'director' },
			{ name: 'Entry Level', value: 'entry_level' },
			{ name: 'Executive', value: 'executive' },
			{ name: 'Lead', value: 'lead' },
			{ name: 'Mid Level', value: 'mid_level' },
			{ name: 'Principal', value: 'principal' },
			{ name: 'Senior', value: 'senior' },
		],
		default: 'mid_level',
		description: 'The seniority level of the job',
		routing: {
			send: {
				type: 'body',
				property: 'seniority',
			},
		},
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Draft', value: 'draft' },
			{ name: 'Published', value: 'published' },
		],
		default: 'published',
		description: 'Whether the job is created as a draft or published immediately',
		routing: {
			send: {
				type: 'body',
				property: 'status',
			},
		},
	},
];

export const jobStatusFilterOptions: INodePropertyOptions[] = [
	{ name: 'Archived', value: 'archived' },
	{ name: 'Draft', value: 'draft' },
	{ name: 'Expired', value: 'expired' },
	{ name: 'Published', value: 'published' },
];
