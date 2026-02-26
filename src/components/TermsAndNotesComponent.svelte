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
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	label {
		font-weight: 600;
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	textarea {
		padding: 0.58rem 0.72rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		min-height: 108px;
		font-size: 0.84rem;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease);
		resize: vertical;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}
</style>
