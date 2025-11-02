import { writable } from 'svelte/store';
import { TEMPLATE_OPTIONS, DEFAULT_TEMPLATE_ID } from '$lib/templates/index.js';

const selectedTemplateId = writable(DEFAULT_TEMPLATE_ID);

const setTemplateId = (templateId) => {
	const fallback = DEFAULT_TEMPLATE_ID;
	const candidate = TEMPLATE_OPTIONS.find((template) => template.id === templateId);
	selectedTemplateId.set(candidate ? candidate.id : fallback);
};

export { TEMPLATE_OPTIONS, selectedTemplateId, setTemplateId };
