<script>
	import { onMount } from 'svelte';
	import InvoiceFormComponent from '../components/InvoiceFormComponent.svelte';
	import InvoicePreviewComponent from '../components/InvoicePreviewComponent.svelte';
  
	let invoice = {
	  logo: null,
	  invoiceFrom: '',
	  invoiceTo: '',
	  date: '',
	  dueDate: '',
	  items: [],
	  amountPaid: 0,
	  terms: '',
	  notes: '',
	  discount: { type: 'flat', rate: 0 },
	  tax: { type: 'flat', rate: 0 },
	  shipping: { amount: 0 }
	};
  
	onMount(() => {
	  // Initialize with one empty item for demo
	  invoice.items = [{ name: '', quantity: 1, price: 0, amount: 0 }];
	});
  </script>
  
  <div class="page-layout">
	<div class="form-section">
	  <h1>Edit Invoice</h1>
	  <InvoiceFormComponent bind:invoice />
	</div>
  
	<div class="preview-section">
	  <h1>Preview Invoice</h1>
	  <InvoicePreviewComponent {invoice} />
	</div>
  </div>
  
  <style>
	.page-layout {
	  display: grid;
	  grid-template-columns: 1fr 1fr;
	  gap: 2rem;
	  padding: 2rem;
	}
	.form-section, .preview-section {
	  background: #f9fafb;
	  padding: 1.5rem;
	  border-radius: 0.5rem;
	  border: 1px solid #e5e7eb;
	  overflow-y: auto;
	  max-height: 90vh;
	}
	h1 {
	  font-size: 1.5rem;
	  margin-bottom: 1rem;
	}
  </style>
  