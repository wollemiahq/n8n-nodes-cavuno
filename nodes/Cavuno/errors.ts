import {
	NodeOperationError,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type INodePropertyOptions,
} from 'n8n-workflow';

type CavunoErrorBody = {
	error?: {
		code?: string;
		message?: string;
	};
};

export async function throwOnCavunoApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) {
		return items;
	}
	if (
		response.statusCode === 404 &&
		this.getNodeParameter('resource') === 'company' &&
		this.getNodeParameter('operation') === 'find'
	) {
		return [];
	}

	const body = response.body as CavunoErrorBody | undefined;
	const apiMessage = typeof body?.error?.message === 'string' ? body.error.message : undefined;
	let message = apiMessage ? `Cavuno: ${apiMessage}` : `Cavuno request failed (${response.statusCode})`;

	if (response.statusCode === 401) {
		message = 'Cavuno did not accept this API key. Replace revoked, expired, or invalid credentials.';
	} else if (response.statusCode === 402) {
		message = `${message} — upgrade the board's plan, then try again.`;
	}

	throw new NodeOperationError(this.getNode(), message);
}

/** Apply the same readable error handling to every declarative action. */
export function addCavunoErrorHandling(properties: INodeProperties[]): INodeProperties[] {
	for (const property of properties) {
		if (!Array.isArray(property.options)) continue;

		for (const option of property.options as INodePropertyOptions[]) {
			if (!option.routing?.request) continue;

			option.routing.output = {
				...option.routing.output,
				postReceive: [
					throwOnCavunoApiError,
					...(option.routing.output?.postReceive ?? []),
				],
			};
		}
	}

	return properties;
}
