<script>
  
    let { item ={ name: '', quantity: 1, price: 0, amount: 0 }, onUpdate } = $props();
  
    const updateField = (field, value) => {
      const updatedItem = { ...item, [field]: value };
      updatedItem.amount = updatedItem.quantity * updatedItem.price;
      onUpdate(updatedItem);
    };
  </script>
  
  <div class="item-form">
    <input
      type="text"
      placeholder="Item Name"
      bind:value={item.name}
      oninput={(e) => updateField('name', e.target.value)}
    />
  
    <input
      type="number"
      min="1"
      placeholder="Quantity"
      bind:value={item.quantity}
      oninput={(e) => updateField('quantity', +e.target.value)}
    />
  
    <input
      type="number"
      min="0"
      step="0.01"
      placeholder="Price"
      bind:value={item.price}
      oninput={(e) => updateField('price', +e.target.value)}
    />
  
    <p class="item-amount">
      Amount: {item.quantity * item.price}
    </p>
  </div>
  
  <style>
    .item-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .item-form input {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 1rem;
    }
    .item-amount {
      font-weight: bold;
      color: #374151;
    }
  </style>
  