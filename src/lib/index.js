// place files you want to import through the `$lib` alias in this folder.
import { v4 as uuidv4 } from 'uuid';

export const defaultInvoice = {
	id: uuidv4(),
	invoiceLabel: 'INVOICE',
	invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
	logo: '/logo.png',
	logoFilename: 'logo.png',
	invoiceFrom: '',
	invoiceTo: '',
	date: new Date().toISOString().split('T')[0],
	dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
	items: [{ name: '', quantity: 1, price: 0, amount: 0 }],
	amountPaid: 0,
	terms: '',
	notes: '',
	discount: { type: 'flat', rate: 0 },
	tax: { type: 'flat', rate: 0 },
	shipping: { amount: 0 },
	paid: false,
	archived: false,
	total: 0,
	subTotal: 0,
	balanceDue: 0,
	templateId: 'modern'
};
