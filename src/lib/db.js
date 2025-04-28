import { get, set, del, keys, clear } from 'idb-keyval';

const INVOICE_PREFIX = 'ig.invoice.';

export async function saveInvoice(id, invoice) {
  return await set(INVOICE_PREFIX + id, invoice);
}

export async function getInvoice(id) {
  return await get(INVOICE_PREFIX + id);
}

export async function deleteInvoice(id) {
  return await del(INVOICE_PREFIX + id);
}

export async function getAllInvoices() {
  const allKeys = await keys();
  const invoices = [];
  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(INVOICE_PREFIX)) {
      const invoice = await get(key);
      const id = key.replace(INVOICE_PREFIX, '');
      invoices.push({ id, invoice });
    }
  }
  return invoices;
}

export async function clearAllInvoices() {
  await clear();
}
