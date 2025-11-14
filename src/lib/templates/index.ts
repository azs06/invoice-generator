// Legacy template options for backward compatibility
// This file is deprecated - use registry.ts instead

interface LegacyTemplateOption {
	id: string;
	label: string;
}

export const TEMPLATE_OPTIONS: LegacyTemplateOption[] = [
	{
		id: 'modern',
		label: 'Modern (default)'
	},
	{
		id: 'classic',
		label: 'Classic'
	},
	{
		id: 'minimal',
		label: 'Minimal'
	}
];

export const DEFAULT_TEMPLATE_ID: string = TEMPLATE_OPTIONS[0].id;
