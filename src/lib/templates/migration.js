/**
 * Template Migration Utilities
 * Handles migration of existing invoices to include template IDs
 */

import { getAllInvoices, saveInvoice } from '$lib/db.js';
import { getDefaultTemplateId } from '$lib/templates/registry.js';

/**
 * Migrate all existing invoices to include templateId
 * This ensures backward compatibility with existing invoices
 */
export async function migrateInvoicesToIncludeTemplateId() {
	try {
		const invoices = await getAllInvoices();
		const defaultTemplateId = getDefaultTemplateId();
		let migrationCount = 0;

		for (const { id, invoice } of invoices) {
			// Only migrate invoices that don't have a templateId
			if (!invoice.templateId) {
				const updatedInvoice = {
					...invoice,
					templateId: defaultTemplateId
				};

				await saveInvoice(id, updatedInvoice);
				migrationCount++;
			}
		}

		return {
			success: true,
			migrated: migrationCount,
			total: invoices.length
		};
	} catch (error) {
		console.error('Failed to migrate invoices:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			error: errorMessage,
			migrated: 0,
			total: 0
		};
	}
}

/**
 * Check if migration is needed
 * @returns {Promise<boolean>} True if migration is needed
 */
export async function isMigrationNeeded() {
	try {
		const invoices = await getAllInvoices();
		return invoices.some(({ invoice }) => !invoice.templateId);
	} catch (error) {
		console.error('Failed to check migration status:', error);
		return false;
	}
}

/**
 * Get migration status
 * @returns {Promise<Object>} Migration status information
 */
export async function getMigrationStatus() {
	try {
		const invoices = await getAllInvoices();
		const totalInvoices = invoices.length;
		const migratedInvoices = invoices.filter(({ invoice }) => invoice.templateId).length;
		const needsMigration = totalInvoices > migratedInvoices;

		return {
			totalInvoices,
			migratedInvoices,
			needsMigration,
			percentage: totalInvoices > 0 ? Math.round((migratedInvoices / totalInvoices) * 100) : 100
		};
	} catch (error) {
		console.error('Failed to get migration status:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			totalInvoices: 0,
			migratedInvoices: 0,
			needsMigration: false,
			percentage: 0,
			error: errorMessage
		};
	}
}

/**
 * Run migration if needed
 * @returns {Promise<Object>} Migration result
 */
export async function runMigrationIfNeeded() {
	const needsMigration = await isMigrationNeeded();
	
	if (!needsMigration) {
		return {
			success: true,
			message: 'No migration needed',
			migrated: 0
		};
	}

	console.log('Running template migration for existing invoices...');
	const result = await migrateInvoicesToIncludeTemplateId();
	
	if (result.success) {
		console.log(`Successfully migrated ${result.migrated} invoices to include templateId`);
	} else {
		console.error('Migration failed:', result.error);
	}

	return result;
}
