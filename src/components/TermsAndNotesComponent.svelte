<script>
    let {
        terms = '',
        notes = '',
        onUpdateTerms = () => {},
        onUpdateNotes = () => {}
    } = $props();

    const handleTermsChange = (e) => {
      onUpdateTerms(e.target.value);
    };
    const handleNotesChange = (e) => {
      onUpdateNotes(e.target.value);
    };
  </script>
  
  <div class="terms-notes">
    <div class="field">
      <label for="terms-textarea">Terms</label>
      <textarea
        id="terms-textarea"
        rows="4"
        bind:value={terms}
        oninput={handleTermsChange}
        placeholder="Enter payment terms..."
      ></textarea>
    </div>

    <div class="field">
      <label for="notes-textarea">Notes</label>
      <textarea
        id="notes-textarea"
        rows="4"
        bind:value={notes}
        oninput={handleNotesChange}
        placeholder="Additional notes..."
      ></textarea>
    </div>
  </div>
  
  <style>
    .terms-notes {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }
    .field {
      display: flex;
      flex-direction: column;
    }
    label {
      margin-bottom: 0.5rem;
      font-weight: bold;
      color: #374151;
    }
    textarea {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 1rem;
    }
  </style>
  