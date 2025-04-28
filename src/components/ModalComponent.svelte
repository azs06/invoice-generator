<script>
    import { createEventDispatcher } from 'svelte';
  
    export let open = false;
    export let title = '';
  
    const dispatch = createEventDispatcher();
  
    const close = () => {
      dispatch('close');
    };
  </script>
  
  {#if open}
    <div class="modal-backdrop" on:click={close}>
      <div class="modal-content" on:click|stopPropagation>
        <header class="modal-header">
          <h2>{title}</h2>
          <button class="close-btn" on:click={close}>×</button>
        </header>
  
        <div class="modal-body">
          <slot />
        </div>
  
        <footer class="modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  {/if}
  
  <style>
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 50;
    }
    .modal-content {
      background: white;
      border-radius: 0.5rem;
      width: 90%;
      max-width: 600px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      padding: 1rem;
      background: #f3f4f6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
    }
    .modal-body {
      padding: 1rem;
    }
    .modal-footer {
      padding: 1rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
    }
  </style>
  