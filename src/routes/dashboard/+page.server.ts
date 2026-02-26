import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export interface DashboardInvoice {
	id: string;
	invoiceNumber: string;
	invoiceTo: string;
	invoiceFrom: string;
	date: string;
	total: number;
	balanceDue: number;
	paid: boolean;
	hasPdf: boolean;
	isPdfStale: boolean;
	updatedAt: Date;
	archived: boolean;
	draft: boolean;
	draftName: string;
	invoiceLabel: string;
}

export const load: PageServerLoad = async () => {
	throw redirect(302, '/history');
};
