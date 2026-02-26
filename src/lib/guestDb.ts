/**
 * @deprecated Use $lib/localDb instead. This file re-exports for backward compatibility.
 */
export {
	saveGuestInvoice,
	getGuestInvoice,
	deleteGuestInvoice,
	getAllGuestInvoices,
	clearAllGuestInvoices,
	getGuestInvoiceCount
} from './localDb';
