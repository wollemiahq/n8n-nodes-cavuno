import type { INodePropertyRouting } from 'n8n-workflow';

/**
 * Routing for a "Return All" toggle against Cavuno's cursor pagination.
 * Every list endpoint returns `{ data, hasMore, nextCursor }`; follow-up
 * pages are requested with `?cursor=<nextCursor>`.
 */
export const cursorPagination: INodePropertyRouting = {
	send: {
		paginate: '={{ $value }}',
		type: 'query',
		property: 'limit',
		value: '100',
	},
	operations: {
		pagination: {
			type: 'generic',
			properties: {
				continue: '={{ $response.body?.hasMore === true }}',
				request: {
					qs: {
						cursor: '={{ $response.body?.nextCursor }}',
					},
				},
			},
		},
	},
};
