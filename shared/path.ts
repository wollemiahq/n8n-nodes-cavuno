import { NodeOperationError } from 'n8n-workflow';

import type { IExecuteSingleFunctions, IHttpRequestOptions, INode } from 'n8n-workflow';

const INVALID_ID_MESSAGE = 'Enter a valid ID. An ID cannot be empty, "." or "..".';

/**
 * Build a Cavuno API path from segments. Each segment is encoded with
 * `encodeURIComponent`, so an ID can never add a `/`, `?` or `#` to the
 * request. Empty, `.` and `..` segments are refused, because URL
 * normalization would turn them into a different route.
 */
export function apiPath(context: { getNode(): INode }, ...segments: unknown[]): string {
	return segments
		.map((segment) => {
			const value =
				typeof segment === 'string' || typeof segment === 'number' ? String(segment) : '';
			if (!value.trim() || value === '.' || value === '..') {
				throw new NodeOperationError(context.getNode(), INVALID_ID_MESSAGE);
			}
			return `/${encodeURIComponent(value)}`;
		})
		.join('');
}

/**
 * preSend hook that sets the request path to `/<collection>/<id>[/<action>]`,
 * with the ID read from a node parameter, before the API key is attached.
 */
export function resourcePath(collection: string, parameter: string, action?: string) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const id = this.getNodeParameter(parameter, undefined, {
			extractValue: true,
		});
		requestOptions.url = apiPath(this, collection, id, ...(action ? [action] : []));
		return requestOptions;
	};
}
