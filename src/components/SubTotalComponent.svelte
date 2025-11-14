<script lang="ts">
	import { toUSCurrency } from '$lib/currency.js';
	import type { InvoiceItem } from '$lib/types';

	interface Props {
		items?: InvoiceItem[];
	}

	let { items = [] }: Props = $props();

	const calculateSubTotal = (): number =>
		items.reduce((sum, item) => sum + (item.amount || (item.price || 0) * (item.quantity || 0)), 0);
</script>

<div class="subtotal">
	<div class="subtotal-meta">
		<span class="subtotal-eyebrow">Running total</span>
		<h3>Subtotal</h3>
	</div>
	<p>{$toUSCurrency(calculateSubTotal())}</p>
</div>

<style>
	.subtotal {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		padding: 1.25rem 1.5rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-secondary);
	}

	.subtotal-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.subtotal-eyebrow {
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	.subtotal h3 {
		margin: 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.subtotal p {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-accent-blue);
	}

	@media (max-width: 640px) {
		.subtotal {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
