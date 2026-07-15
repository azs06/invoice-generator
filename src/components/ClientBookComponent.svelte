<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import { authClient } from '$lib/auth';
	import ClientFormModal, { type ClientFormValues } from './ClientFormModal.svelte';
	import UpgradePromptModal from './UpgradePromptModal.svelte';

	interface Client {
		id: string;
		name: string;
		email: string | null;
		phone: string | null;
		address: string | null;
		notes: string | null;
	}

	interface Props {
		/** Current "bill to" value, used to prefill the save-as-client form. */
		invoiceTo?: string;
		/** Fill the invoice "bill to" field from a chosen client. */
		onFill?: (value: string) => void;
	}

	let { invoiceTo = '', onFill = () => {} }: Props = $props();

	const session = authClient.useSession();

	let isSignedIn = $derived(Boolean($session.data));
	let gatingActive = $derived(
		$page.data.monetizationEnabled === true && $page.data.tier !== 'pro'
	);

	let clients = $state<Client[]>([]);
	let loaded = $state<boolean>(false);
	let selectedId = $state<string>('');
	let showFormModal = $state<boolean>(false);
	let showUpgradeModal = $state<boolean>(false);

	const loadClients = async (): Promise<void> => {
		try {
			const res = await fetch('/api/clients');
			if (res.ok) {
				const body = (await res.json()) as { clients: Client[] };
				clients = body.clients ?? [];
			}
		} catch {
			// Leave the list empty on failure.
		} finally {
			loaded = true;
		}
	};

	// Load the address book once the user is signed in.
	$effect(() => {
		if (isSignedIn && !loaded) {
			loadClients();
		}
	});

	/** Compose a "bill to" block from a client's structured fields. */
	const composeBillTo = (client: Client): string => {
		return [client.name, client.address, client.email, client.phone]
			.map((line) => (line ?? '').trim())
			.filter((line) => line !== '')
			.join('\n');
	};

	const handleSelect = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLSelectElement)) return;
		selectedId = target.value;
		const client = clients.find((c) => c.id === selectedId);
		if (client) {
			onFill(composeBillTo(client));
		}
	};

	const handleSaveClick = (): void => {
		// Server-side gating is authoritative; this is only a UX hint so guests
		// and free users get the upgrade prompt before hitting a 401/402.
		if (!isSignedIn || gatingActive) {
			showUpgradeModal = true;
			return;
		}
		showFormModal = true;
	};

	/** Prefill the save form from the current "bill to" text. */
	let prefill = $derived.by<Partial<ClientFormValues>>(() => {
		const lines = invoiceTo
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '');
		return {
			name: lines[0] ?? '',
			address: lines.slice(1).join('\n')
		};
	});

	const handleSaved = (): void => {
		// Refresh the picker so the newly saved client appears immediately.
		loadClients();
	};
</script>

<div class="client-book">
	<div class="client-book-row">
		{#if isSignedIn && clients.length > 0}
			<label class="visually-hidden" for="client-picker">{$_('clients.picker_label')}</label>
			<select
				id="client-picker"
				class="client-select"
				value={selectedId}
				onchange={handleSelect}
			>
				<option value="">{$_('clients.picker_placeholder')}</option>
				{#each clients as client (client.id)}
					<option value={client.id}>{client.name}</option>
				{/each}
			</select>
		{/if}

		<button type="button" class="save-client-btn" onclick={handleSaveClick}>
			<span aria-hidden="true">+</span>
			{$_('clients.save_as_client')}
			{#if gatingActive}
				<span class="pro-badge">{$_('upgrade.pro_badge')}</span>
			{/if}
		</button>
	</div>
</div>

{#if showFormModal}
	<ClientFormModal
		client={prefill}
		onClose={() => (showFormModal = false)}
		onSaved={handleSaved}
	/>
{/if}

<UpgradePromptModal
	open={showUpgradeModal}
	message={$_('clients.upgrade_message')}
	onClose={() => (showUpgradeModal = false)}
/>

<style>
	.client-book {
		margin-top: 0.5rem;
	}

	.client-book-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.client-select {
		flex: 1 1 200px;
		min-width: 0;
		padding: 0.45rem 0.6rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--editor-input-radius, 0.36rem);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.82rem;
	}

	.client-select:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.save-client-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.8rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-weight: 600;
		font-size: 0.78rem;
		border: 1px solid var(--color-border-primary);
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	.save-client-btn:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-secondary);
		color: var(--color-accent-blue);
	}

	.pro-badge {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-accent-blue);
		background: color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
