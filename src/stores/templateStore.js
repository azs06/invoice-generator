import { writable } from 'svelte/store';
import { getTemplateOptions, getDefaultTemplateId, templateExists, getTemplate } from '$lib/templates/registry.js';

const DEFAULT_TEMPLATE_ID = getDefaultTemplateId();
const TEMPLATE_OPTIONS = getTemplateOptions();

const selectedTemplateId = writable(DEFAULT_TEMPLATE_ID);

/**
 * @param {string} templateId
 */
const setTemplateId = (templateId) => {
	const fallback = DEFAULT_TEMPLATE_ID;
	// Validate template exists
	if (templateExists(templateId)) {
		selectedTemplateId.set(templateId);
	} else {
		selectedTemplateId.set(fallback);
	}
};

// Get current template info
const getCurrentTemplate = () => {
	let currentId = DEFAULT_TEMPLATE_ID;
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
