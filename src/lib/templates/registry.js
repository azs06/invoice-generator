/**
 * Template Registry
 * Maps template IDs to their components, styles, and metadata
 */

export const TEMPLATES = {
	modern: {
		id: 'modern',
		name: 'Modern',
		description: 'Clean and contemporary design with balanced layout',
		component: () => import('./components/ModernTemplate.svelte'),
		tags: ['clean', 'contemporary', 'balanced'],
		premium: false,
		preview: '/templates/modern-preview.png'
	},
	classic: {
		id: 'classic',
		name: 'Classic',
		description: 'Traditional invoice layout with formal styling',
		component: () => import('./components/ClassicTemplate.svelte'),
		tags: ['traditional', 'formal', 'business'],
		premium: false,
		preview: '/templates/classic-preview.png'
	},
	minimal: {
		id: 'minimal',
		name: 'Minimal',
		description: 'Simple and focused design with essential elements only',
		component: () => import('./components/MinimalTemplate.svelte'),
		tags: ['simple', 'clean', 'essential'],
		premium: false,
		preview: '/templates/minimal-preview.png'
	},
	compact: {
		id: 'compact',
		name: 'Compact',
		description: 'Condensed layout optimized for fitting more on a page',
		component: () => import('./components/CompactTemplate.svelte'),
		tags: ['compact', 'condensed', 'dense'],
		premium: false,
		preview: '/templates/compact-preview.png'
	},
	atlantic: {
		id: 'atlantic',
		name: 'Atlantic',
		description: 'Editorial serif layout with warm neutral palette',
		component: () => import('./components/AtlanticTemplate.svelte'),
		tags: ['serif', 'editorial', 'warm'],
		premium: false,
		preview: '/templates/atlantic-preview.png'
	}
	
};

/**
 * Get template by ID
 * @param {string} templateId - The template ID
 * @returns {any|null} Template object or null if not found
 */
export function getTemplate(templateId) {
	return Object.values(TEMPLATES).find((template) => template.id === templateId) || null;
}

/**
 * Get all templates
 * @returns {any} All templates
 */
export function getAllTemplates() {
	return TEMPLATES;
}

/**
 * Get templates filtered by premium status
 * @param {boolean} isPremium - Filter by premium status
 * @returns {Array<any>} Array of template objects
 */
export function getTemplatesByPremium(isPremium = false) {
	return Object.values(TEMPLATES).filter((template) => template.premium === isPremium);
}

/**
 * Get templates by tag
 * @param {string} tag - Tag to filter by
 * @returns {Array<any>} Array of template objects
 */
export function getTemplatesByTag(tag) {
	return Object.values(TEMPLATES).filter((template) => template.tags.includes(tag));
}

/**
 * Get template options for dropdown/select components
 * @returns {Array<any>} Array of template options with id and label
 */
export function getTemplateOptions() {
	return Object.values(TEMPLATES).map((template) => ({
		id: template.id,
		label: template.name,
		premium: template.premium
	}));
}

/**
 * Check if a template exists
 * @param {string} templateId - The template ID to check
 * @returns {boolean} True if template exists
 */
export function templateExists(templateId) {
	return templateId in TEMPLATES;
}

/**
 * Get default template ID
 * @returns {string} Default template ID
 */
export function getDefaultTemplateId() {
	return 'modern';
}
