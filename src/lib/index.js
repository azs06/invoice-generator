// place files you want to import through the `$lib` alias in this folder.
import { base } from '$app/paths';
import { v4 as uuidv4 } from 'uuid';

/** @typedef {import('$lib/types').InvoiceData} InvoiceData */
/** @typedef {import('$lib/types').InvoiceItem} InvoiceItem */

export const DEFAULT_LOGO_PATH = `${base}/logo.png`;

/** @type {InvoiceData} */
export const defaultInvoice = {
	id: uuidv4(),
	invoiceLabel: 'INVOICE',
	invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
	logo: DEFAULT_LOGO_PATH,
	logoFilename: 'logo.png',
	invoiceFrom: '',
	invoiceTo: '',
	date: new Date().toISOString().split('T')[0],
	dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
	items: /** @type {InvoiceItem[]} */ ([{ name: '', quantity: 1, price: 0, amount: 0 }]),
	amountPaid: 0,
	terms: '',
	notes: '',
	discount: { type: /** @type {'flat'} */ ('flat'), rate: 0 },
	tax: { type: /** @type {'flat'} */ ('flat'), rate: 0 },
	shipping: { amount: 0 },
	paid: false,
	archived: false,
	draft: true,
	draftName: '',
	total: 0,
	subTotal: 0,
	balanceDue: 0,
	templateId: 'modern'
};
