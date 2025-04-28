<script>
    import { totalAmounts, calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';
  
    export let invoice = {
      items: [],
      discount: { type: 'flat', rate: 0 },
      tax: { type: 'flat', rate: 0 },
      shipping: { amount: 0 }
    };
  
    const subTotal = () => {
      return invoice.items.reduce((sum, item) => sum + (item.amount || (item.price * item.quantity)), 0);
    };
  
    const discountAmount = () => {
      return calculateDiscount(invoice.discount, subTotal());
    };
  
    const taxAmount = () => {
      const afterDiscount = subTotal() - discountAmount();
      return calculateTax(invoice.tax, afterDiscount);
    };
  
    const totalAmount = () => {
      return totalAmounts(invoice, subTotal());
    };
  </script>
  
  <div class="total-summary">
    <h3>Invoice Summary</h3>
    <div class="summary-line">
      <span>Subtotal:</span> <span>${subTotal().toFixed(2)}</span>
    </div>
    <div class="summary-line">
      <span>Discount:</span> <span>-${discountAmount().toFixed(2)}</span>
    </div>
    <div class="summary-line">
      <span>Tax:</span> <span>+${taxAmount().toFixed(2)}</span>
    </div>
    <div class="summary-line">
      <span>Shipping:</span> <span>+${invoice.shipping?.amount?.toFixed(2) || '0.00'}</span>
    </div>
    <div class="summary-total">
      <strong>Total:</strong> <strong>${totalAmount().toFixed(2)}</strong>
    </div>
  </div>
  
  <style>
    .total-summary {
      margin-top: 2rem;
      padding: 1.5rem;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
    }
    .total-summary h3 {
      margin-bottom: 1rem;
      font-size: 1.25rem;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }
    .summary-total {
      display: flex;
      justify-content: space-between;
      font-size: 1.25rem;
      margin-top: 1rem;
      font-weight: bold;
    }
  </style>
  