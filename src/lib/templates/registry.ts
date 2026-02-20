/**
 * Template Registry
 * Maps template IDs to their components, styles, and metadata
 */

// Type for dynamically imported Svelte component
type SvelteComponentModule = Promise<{ default: any }>;

export interface TemplateMetadata {
	id: string;
	name: string;
	description: string;
	component: () => SvelteComponentModule;
	tags: string[];
	premium: boolean;
	preview: string;
}

export interface TemplateOption {
	id: string;
	label: string;
	premium: boolean;
}

export type TemplateId = 'modern' | 'simple' | 'standard' | 'classic' | 'minimal' | 'atlantic' | 'compact' | 'executive';

export const TEMPLATES: Record<TemplateId, TemplateMetadata> = {
	modern: {
		id: 'modern',
		name: 'Modern',
		description: 'Clean and contemporary design with balanced layout',
		component: () => import('./components/ModernTemplate.svelte'),
		tags: ['clean', 'contemporary', 'balanced'],
		premium: false,
		preview: '/templates/modern-preview.png'
	},
	simple: {
		id: 'simple',
		name: 'Simple',
		description: 'Clean, minimal black and white design',
		component: () => import('./components/SimpleTemplate.svelte'),
		tags: ['simple', 'minimal', 'free'],
		premium: false,
		preview: '/templates/simple-preview.png'
	},
	standard: {
		id: 'standard',
		name: 'Standard',
		description: 'Professional layout with company header',
		component: () => import('./components/StandardTemplate.svelte'),
		tags: ['standard', 'professional', 'free'],
		premium: false,
		preview: '/templates/standard-preview.png'
	},
	classic: {
		id: 'classic',
		name: 'Classic',
		description: 'Traditional invoice layout with formal styling',
		component: () => import('./components/ClassicTemplate.svelte'),
		tags: ['traditional', 'formal', 'business'],
		premium: true,
		preview: '/templates/classic-preview.png'
	},
	minimal: {
		id: 'minimal',
		name: 'Minimal',
		description: 'Simple and focused design with essential elements only',
		component: () => import('./components/MinimalTemplate.svelte'),
		tags: ['simple', 'clean', 'essential'],
		premium: true,
		preview: '/templates/minimal-preview.png'
	},
	atlantic: {
		id: 'atlantic',
		name: 'Atlantic',
		description: 'Editorial serif layout with warm neutral palette',
		component: () => import('./components/AtlanticTemplate.svelte'),
		tags: ['serif', 'editorial', 'warm'],
		premium: true,
		preview: '/templates/atlantic-preview.png'
	},
	compact: {
		id: 'compact',
		name: 'Compact',
		description: 'Space-efficient layout with condensed two-column summary',
		component: () => import('./components/CompactTemplate.svelte'),
		tags: ['compact', 'dense', 'efficient'],
		premium: false,
		preview: '/templates/compact-preview.png'
	},
	executive: {
		id: 'executive',
		name: 'Executive',
		description: 'Bold corporate design with navy accent and serif headings',
		component: () => import('./components/ExecutiveTemplate.svelte'),
		tags: ['corporate', 'bold', 'professional'],
		premium: false,
		preview: '/templates/executive-preview.png'
	}
};

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): TemplateMetadata | null {
	return Object.values(TEMPLATES).find((template) => template.id === templateId) || null;
}

/**
 * Get all templates
 */
export function getAllTemplates(): Record<TemplateId, TemplateMetadata> {
	return TEMPLATES;
}

/**
 * Get templates filtered by premium status
 */
export function getTemplatesByPremium(isPremium: boolean = false): TemplateMetadata[] {
	return Object.values(TEMPLATES).filter((template) => template.premium === isPremium);
}

/**
 * Get templates by tag
 */
export function getTemplatesByTag(tag: string): TemplateMetadata[] {
	return Object.values(TEMPLATES).filter((template) => template.tags.includes(tag));
}

/**
 * Get template options for dropdown/select components
 */
export function getTemplateOptions(): TemplateOption[] {
	return Object.values(TEMPLATES).map((template) => ({
		id: template.id,
		label: template.name,
		premium: template.premium
	}));
}

/**
 * Check if a template exists
 */
export function templateExists(templateId: string): templateId is TemplateId {
	return templateId in TEMPLATES;
}

/**
 * Get default template ID
 */
export function getDefaultTemplateId(): TemplateId {
	return 'modern';
}
