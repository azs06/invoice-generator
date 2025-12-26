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
	draft?: boolean;
	draftName?: string;
}

export type SavedInvoicesFilterMode = 'all' | 'draft' | 'finalized';

export interface SavedInvoiceRecord {
	id: string;
	invoice: InvoiceData;
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
