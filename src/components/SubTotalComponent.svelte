<script>
    export let items = [];
  
    const calculateSubTotal = () => {
      return items.reduce((sum, item) => sum + (item.amount || (item.price * item.quantity)), 0);
    };
  </script>
  
  <div class="subtotal">
    <h3>Subtotal</h3>
    <p>${calculateSubTotal().toFixed(2)}</p>
  </div>
  
  <style>
    .subtotal {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      text-align: right;
    }
    .subtotal h3 {
      margin-bottom: 0.25rem;
      font-size: 1.125rem;
      font-weight: bold;
    }
    .subtotal p {
      font-size: 1.25rem;
      color: #1f2937;
    }
  </style>
  