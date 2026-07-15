export type MonetaryAdjustmentType = 'flat' | 'percent';

export interface MonetaryAdjustment {
	type: MonetaryAdjustmentType;
	rate: number;
}

export interface ShippingInfo {
	amount: number;
}

export interface InvoiceItem {
	name: string;
	quantity: number;
	price: number;
	amount: number;
}

export interface AdditionalPayment {
	date: string;
	amount: number;
	method: string;
}

export interface InvoiceTotals {
	subTotal: number;
	total: number;
	balanceDue: number;
}

export interface InvoiceData {
	id: string;
	invoiceLabel: string;
	invoiceNumber: string;
	logo: string | File | null;
	logoFilename: string | null;
	invoiceFrom: string;
	invoiceTo: string;
	date: string;
	dueDate: string;
	items: InvoiceItem[];
	amountPaid: number;
	terms: string;
	notes: string;
	discount: MonetaryAdjustment;
	tax: MonetaryAdjustment;
	shipping: ShippingInfo;
	paid: boolean;
	archived: boolean;
	total: number;
	subTotal: number;
	balanceDue: number;
	templateId: string;
	paymentDetails?: PaymentDetails;
	draft?: boolean;
	draftName?: string;
}

/**
 * User-provided "pay this invoice" details shown on the shared invoice page.
 * v1 is zero-liability: `payUrl` is any payment link the user already has
 * (Stripe Payment Link, PayPal.me, Wise, bKash, bank portal, etc.) —
 * FreeInvoice only renders the link and never processes the payment.
 */
export interface PaymentDetails {
	enabled: boolean;
	payUrl: string;
	instructions: string;
}

/**
 * Structured invoice fields extracted from free-form text by the "AI invoice
 * from text" endpoint (POST /api/ai/invoice-from-text). Server-validated before
 * it reaches the client; the editor merges only the parts that are present.
 */
export interface ExtractedInvoiceItem {
	description: string;
	quantity: number;
	rate: number;
}

export interface ExtractedInvoice {
	clientName: string;
	clientDetails: string;
	items: ExtractedInvoiceItem[];
	dueDate: string | null;
	notes: string;
}

export type SavedInvoicesFilterMode = 'all' | 'draft' | 'finalized';

export interface SavedInvoiceRecord {
	id: string;
	invoice: InvoiceData;
}

export interface LocalInvoiceRecord {
	id: string;
	invoice: InvoiceData;
	cloudSynced: boolean;
	cloudId: string | null;
	updatedAt: string;
}

export type PageSizeId = 'a4' | 'letter' | 'legal' | 'a5';

export interface PageDimensions {
	width: string;
	height: string;
	label: string;
}

export interface PageMargins {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface PageSettings {
	pageSize: PageSizeId;
	margins: PageMargins;
}
