import { writable } from 'svelte/store';
import {
	getDefaultTemplateId,
	getTemplate,
	getTemplateOptions,
	type TemplateMetadata,
	type TemplateOption,
	templateExists
} from '$lib/templates/registry.js';

const DEFAULT_TEMPLATE_ID = getDefaultTemplateId();
const TEMPLATE_OPTIONS: TemplateOption[] = getTemplateOptions();
const selectedTemplateId = writable<string>(DEFAULT_TEMPLATE_ID);

const setTemplateId = (templateId: string): void => {
	const fallback = DEFAULT_TEMPLATE_ID;
	// Validate template exists
	if (templateExists(templateId)) {
		selectedTemplateId.set(templateId);
	} else {
		selectedTemplateId.set(fallback);
	}
};

// Get current template info
const getCurrentTemplate = (): TemplateMetadata | null => {
	let currentId: string = DEFAULT_TEMPLATE_ID;
	const unsubscribe = selectedTemplateId.subscribe((value) => {
		currentId = value;
	});
	unsubscribe();
	return getTemplate(currentId || DEFAULT_TEMPLATE_ID);
};

export {
	TEMPLATE_OPTIONS,
	selectedTemplateId,
	setTemplateId,
	getCurrentTemplate,
	DEFAULT_TEMPLATE_ID
};
