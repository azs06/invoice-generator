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
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	label {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}

	textarea {
		padding: 0.7rem 0.9rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		min-height: 130px;
		font-size: 0.93rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		resize: vertical;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}
</style>
  
