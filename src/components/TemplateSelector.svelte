<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import UpgradePromptModal from './UpgradePromptModal.svelte';
	import { TEMPLATE_OPTIONS, selectedTemplateId, setTemplateId } from '../stores/templateStore.js';
	let availableTemplates = $derived(TEMPLATE_OPTIONS);

	let gatingActive = $derived(
		$page.data.monetizationEnabled === true && $page.data.tier !== 'pro'
	);
	let showUpgradeModal = $state(false);

	const handleChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLSelectElement)) {
			return;
		}
		const option = TEMPLATE_OPTIONS.find((t) => t.id === target.value);
		if (gatingActive && option?.premium) {
			// Revert selection and prompt to upgrade instead
			target.value = $selectedTemplateId;
			showUpgradeModal = true;
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
		{#each availableTemplates as option}
			<option value={option.id}>
				{option.label}{gatingActive && option.premium ? ` — ${$_('upgrade.pro_badge')}` : ''}
			</option>
		{/each}
	</select>
</div>

<UpgradePromptModal
	open={showUpgradeModal}
	message={$_('upgrade.template_locked')}
	onClose={() => (showUpgradeModal = false)}
/>

<style>
	.template-selector {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		background: transparent;
		border: none;
		transition: background-color var(--motion-fast) var(--motion-ease);
	}

	.template-selector:hover {
		background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
	}

	.selector-label {
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.selector-control {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 500;
		padding: 0.15rem 1.5rem 0.15rem 0.15rem;
		border-radius: 0.25rem;
		cursor: pointer;
		position: relative;
	}

	.selector-control:focus-visible {
		outline: none;
		background: color-mix(in srgb, var(--color-text-primary) 6%, transparent);
	}

	@media (max-width: 768px) {
		.selector-label {
			display: none;
		}

		.selector-control {
			padding: 0.15rem 1.2rem 0.15rem 0.1rem;
			font-size: 0.74rem;
		}
	}
</style>
