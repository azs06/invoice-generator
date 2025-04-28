<script>
    export let amountPaid = 0;
  
    const formatAmount = (amount) => {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
    };
  </script>
  
  <div class="amount-paid">
    <h3>Amount Paid</h3>
    <p>{formatAmount(amountPaid)}</p>
  </div>
  
  <style>
    .amount-paid {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
    }
    .amount-paid h3 {
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
    }
    .amount-paid p {
      font-size: 1rem;
      color: #4b5563;
    }
  </style>
  