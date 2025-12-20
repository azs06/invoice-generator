<script lang="ts">
	import { TEMPLATE_OPTIONS, selectedTemplateId, setTemplateId } from '../stores/templateStore.js';

	const handleChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLSelectElement)) {
			return;
		}
		setTemplateId(target.value);
	};
</script>

<div class="template-selector">
	<label class="selector-label" for="template-select">Template</label>
	<select
		id="template-select"
		class="selector-control"
		value={$selectedTemplateId}
		onchange={handleChange}
		data-testid="template-select"
	>
		{#each TEMPLATE_OPTIONS as option}
			<option value={option.id}>
				{option.premium ? `${option.label} (PRO)` : option.label}
			</option>
		{/each}
	</select>
</div>

<style>
	.template-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
	}

	.selector-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.selector-control {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.25rem 1.75rem 0.25rem 0.25rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		position: relative;
	}

	.selector-control:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	@media (max-width: 640px) {
		.template-selector {
			width: 100%;
			justify-content: space-between;
		}

		.selector-control {
			width: 100%;
			padding-right: 0.5rem;
		}
	}
</style>
