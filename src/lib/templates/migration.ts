/**
 * Template Migration Utilities
 * Handles migration of existing invoices to include template IDs
 */

import { getAllGuestInvoices, saveGuestInvoice } from '$lib/guestDb.js';
import { getDefaultTemplateId } from '$lib/templates/registry.js';

export interface MigrationResult {
	success: boolean;
	migrated: number;
	total: number;
	error?: string;
}

export interface MigrationStatus {
	totalInvoices: number;
	migratedInvoices: number;
	needsMigration: boolean;
	percentage: number;
	error?: string;
}

export interface MigrationIfNeededResult {
	success: boolean;
	message?: string;
	migrated: number;
	error?: string;
	total?: number;
}

/**
 * Migrate all existing invoices to include templateId
 * This ensures backward compatibility with existing invoices
 */
export async function migrateInvoicesToIncludeTemplateId(): Promise<MigrationResult> {
	try {
		const invoices = await getAllGuestInvoices();
		const defaultTemplateId = getDefaultTemplateId();
		let migrationCount = 0;

		for (const { id, invoice } of invoices) {
			// Only migrate invoices that don't have a templateId
			if (!invoice.templateId) {
				const updatedInvoice = {
					...invoice,
					templateId: defaultTemplateId
				};

				await saveGuestInvoice(id, updatedInvoice);
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
 */
export async function isMigrationNeeded(): Promise<boolean> {
	try {
		const invoices = await getAllGuestInvoices();
		return invoices.some(({ invoice }) => !invoice.templateId);
	} catch (error) {
		console.error('Failed to check migration status:', error);
		return false;
	}
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
	try {
		const invoices = await getAllGuestInvoices();
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
 */
export async function runMigrationIfNeeded(): Promise<MigrationIfNeededResult> {
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
