<script lang="ts">
	import { _ } from 'svelte-i18n';

	type UpdateHandler = (value: string) => void;

	export let terms: string = '';
	export let notes: string = '';
	export let onUpdateTerms: UpdateHandler = () => {};
	export let onUpdateNotes: UpdateHandler = () => {};

	const handleTermsChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLTextAreaElement)) {
			return;
		}
		onUpdateTerms(target.value);
	};

	const handleNotesChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLTextAreaElement)) {
			return;
		}
		onUpdateNotes(target.value);
	};
</script>

<div class="terms-notes">
	<div class="field">
		<label for="terms-textarea">{$_('fields.terms')}</label>
		<textarea
			id="terms-textarea"
			rows="4"
			bind:value={terms}
			oninput={handleTermsChange}
			placeholder={$_('placeholders.terms')}
		></textarea>
	</div>

	<div class="field">
		<label for="notes-textarea">{$_('fields.notes')}</label>
		<textarea
			id="notes-textarea"
			rows="4"
			bind:value={notes}
			oninput={handleNotesChange}
			placeholder={$_('placeholders.notes')}
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
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
	}

	textarea {
		padding: 0.55rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		min-height: 100px;
		font-size: 0.875rem;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
		resize: vertical;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}
</style>
