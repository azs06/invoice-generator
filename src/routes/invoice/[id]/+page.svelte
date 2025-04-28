<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
    import { goto } from '$app/navigation';
  
    let invoice = null;
  
    // Read URL param
    $: id = $page.params.id;
  
    const loadInvoice = () => {
      const data = localStorage.getItem('ig.invoice.' + id);
      if (data) {
        invoice = JSON.parse(data);
      } else {
        // If no invoice found, go back to saved-invoices
        goto('/saved-invoices');
      }
    };
  
    onMount(() => {
      loadInvoice();
    });
  </script>
  
  {#if invoice}
    <section class="container">
      <h1 class="title">Invoice Preview</h1>
      <InvoicePreviewComponent {invoice} />
    </section>
  {:else}
    <p>Loading invoice...</p>
  {/if}
  
  <style>
    .container {
      padding: 2rem;
    }
    .title {
      font-size: 2rem;
      margin-bottom: 2rem;
      text-align: center;
    }
  </style>
  