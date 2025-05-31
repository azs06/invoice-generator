<script>
    import AmountPaidComponent from './AmountPaidComponent.svelte';
    import ItemInputComponent from './ItemInputComponent.svelte';
    import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
    import TotalComponent from './TotalComponent.svelte';
  
    export let invoice = {
      items: [],
      amountPaid: 0,
      terms: '',
      notes: '',
      discount: { type: 'flat', rate: 0 },
      tax: { type: 'flat', rate: 0 },
      shipping: { amount: 0 },
      totalPaid: 0,
    };
  
    const updateItem = (index, updatedItem) => {
      invoice.items[index] = updatedItem;
    };
  
    const addItem = () => {
      invoice.items = [...invoice.items, { name: '', quantity: 1, price: 0, amount: 0 }];
    };
  
    const updateTerms = (newTerms) => {
      invoice.terms = newTerms;
    };
  
    const updateNotes = (newNotes) => {
      invoice.notes = newNotes;
    };
    const updatePaidAmount = (amountPaid) => {
      invoice.amountPaid = amountPaid
    };
  </script>
  
  <div class="invoice-index">
    <h2>Invoice</h2>
  
    <div class="items-list">
      {#each invoice.items as item, index}
        <ItemInputComponent
          {item}
          onUpdate={(updatedItem) => updateItem(index, updatedItem)}
        />
      {/each}
  
      <button type="button" on:click={addItem} class="add-item-btn">
        Add Item
      </button>
    </div>
  
    <TermsAndNotesComponent
      {terms}
      {notes}
      onUpdateTerms={updateTerms}
      onUpdateNotes={updateNotes}
    />
  
    <AmountPaidComponent updatePaidAmount={updatePaidAmount} amountPaid={invoice.amountPaid} />
  
    <TotalComponent {invoice} />
  </div>
  
  <style>
    .invoice-index {
      padding: 2rem;
    }
    .items-list {
      margin-bottom: 2rem;
    }
    .add-item-btn {
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background-color: #2563eb;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 1rem;
      cursor: pointer;
    }
    .add-item-btn:hover {
      background-color: #1d4ed8;
    }
  </style>
  