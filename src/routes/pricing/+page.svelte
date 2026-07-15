<script lang="ts">
	import { page } from '$app/stores';

	// Layout data (from +layout.server.ts): current tier + whether Pro is live.
	let tier = $derived(($page.data.tier as 'pro' | 'free' | undefined) ?? 'free');
	let billingLive = $derived($page.data.monetizationEnabled === true);
	let isPro = $derived(tier === 'pro');

	// Non-blocking notice when returning from a failed/unavailable billing action.
	let billingNotice = $derived($page.url.searchParams.get('billing'));

	interface PlanCard {
		key: 'free' | 'pro_monthly' | 'pro_annual' | 'lifetime';
		name: string;
		price: string;
		cadence: string;
		blurb: string;
		features: string[];
		highlight?: boolean;
		badge?: string;
	}

	const plans: PlanCard[] = [
		{
			key: 'free',
			name: 'Free',
			price: '$0',
			cadence: 'forever',
			blurb: 'Everything you need to create and send invoices.',
			features: [
				'Unlimited invoices (guest or account)',
				'Client-side PDF export',
				'All 8 templates',
				'Up to 3 active share links',
				'English & Bengali, dark mode'
			]
		},
		{
			key: 'pro_monthly',
			name: 'Pro Monthly',
			price: '$6',
			cadence: 'per month',
			blurb: 'The full workflow, billed monthly.',
			features: [
				'Unlimited high-quality server-side PDFs',
				'Unlimited cloud invoices',
				'Unlimited share links, no badge',
				'“Pay this invoice” links'
			]
		},
		{
			key: 'pro_annual',
			name: 'Pro Annual',
			price: '$49',
			cadence: 'per year (~$4/mo)',
			blurb: 'Best value — two months free vs. monthly.',
			features: ['Everything in Pro Monthly', 'Save ~30% vs. monthly', 'Priced for how you invoice'],
			highlight: true,
			badge: 'Best value'
		},
		{
			key: 'lifetime',
			name: 'Lifetime',
			price: '$99',
			cadence: 'one-time',
			blurb: 'Pay once, keep Pro forever. Limited launch offer.',
			features: ['Everything in Pro', 'One payment, no renewals', 'Launch pricing — limited window'],
			badge: 'Launch deal'
		}
	];
</script>

<svelte:head>
	<title>Pricing — FreeInvoice</title>
	<meta
		name="description"
		content="FreeInvoice pricing. The core generator is free forever. Upgrade to Pro for server-side PDFs, unlimited cloud sync, and getting paid online."
	/>
	<meta property="og:title" content="Pricing — FreeInvoice" />
</svelte:head>

<div class="pricing-page">
	<header class="pricing-hero">
		<h1>Simple pricing</h1>
		<p>The core invoice generator is free forever. Upgrade to Pro for the workflow around it.</p>
		{#if isPro}
			<div class="pro-banner">
				You're on <strong>Pro</strong>.
				<a href="/api/billing/portal">Manage billing →</a>
			</div>
		{:else if !billingLive}
			<div class="soft-banner">Pro plans are launching soon.</div>
		{/if}
		{#if billingNotice === 'unavailable'}
			<div class="soft-banner">Pro plans aren't available just yet — check back soon.</div>
		{:else if billingNotice === 'error'}
			<div class="warn-banner">Something went wrong starting checkout. Please try again.</div>
		{:else if billingNotice === 'no-customer'}
			<div class="soft-banner">No billing account found yet — upgrade to Pro to get started.</div>
		{/if}
	</header>

	<div class="plan-grid">
		{#each plans as plan (plan.key)}
			<section class="plan-card" class:highlight={plan.highlight}>
				{#if plan.badge}
					<span class="plan-badge">{plan.badge}</span>
				{/if}
				<h2 class="plan-name">{plan.name}</h2>
				<p class="plan-price">
					<span class="amount">{plan.price}</span>
					<span class="cadence">{plan.cadence}</span>
				</p>
				<p class="plan-blurb">{plan.blurb}</p>
				<ul class="plan-features">
					{#each plan.features as feature (feature)}
						<li>{feature}</li>
					{/each}
				</ul>
				<div class="plan-cta">
					{#if plan.key === 'free'}
						<a class="btn btn-secondary" href="/">Start free</a>
					{:else if isPro}
						<span class="btn btn-current" aria-disabled="true">Current plan</span>
					{:else if billingLive}
						<a class="btn btn-primary" href={`/api/billing/checkout?plan=${plan.key}`}
							>Upgrade</a
						>
					{:else}
						<span class="btn btn-disabled" aria-disabled="true">Coming soon</span>
					{/if}
				</div>
			</section>
		{/each}
	</div>

	<p class="pricing-foot">
		Prices in USD. Billing is handled by Polar as merchant of record; taxes may apply at checkout.
	</p>
</div>

<style>
	.pricing-page {
		max-width: 1080px;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 4rem;
	}

	.pricing-hero {
		text-align: center;
		margin-bottom: 2.5rem;
	}

	.pricing-hero h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary, #111827);
	}

	.pricing-hero p {
		margin: 0 auto;
		max-width: 46ch;
		color: var(--color-text-secondary, #6b7280);
	}

	.pro-banner,
	.soft-banner,
	.warn-banner {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
	}

	.pro-banner {
		background: color-mix(in srgb, var(--color-success, #16a34a) 12%, transparent);
		color: var(--color-text-primary, #111827);
	}

	.pro-banner a {
		color: var(--color-accent-blue, #2563eb);
		font-weight: 600;
		text-decoration: none;
	}

	.soft-banner {
		background: var(--color-bg-secondary, #f3f4f6);
		color: var(--color-text-secondary, #6b7280);
	}

	.warn-banner {
		background: color-mix(in srgb, var(--color-error, #dc2626) 12%, transparent);
		color: var(--color-text-primary, #111827);
	}

	.plan-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.25rem;
	}

	.plan-card {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		background: var(--color-bg-primary, #fff);
		border: 1px solid var(--color-border-primary, #e5e7eb);
		border-radius: 0.9rem;
	}

	.plan-card.highlight {
		border-color: var(--color-accent-blue, #2563eb);
		box-shadow: 0 0 0 1px var(--color-accent-blue, #2563eb);
	}

	.plan-badge {
		position: absolute;
		top: -0.7rem;
		left: 1.5rem;
		padding: 0.15rem 0.6rem;
		border-radius: 999px;
		background: var(--color-accent-blue, #2563eb);
		color: #fff;
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.plan-name {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-primary, #111827);
	}

	.plan-price {
		margin: 0 0 0.75rem;
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.plan-price .amount {
		font-size: 1.9rem;
		font-weight: 700;
		color: var(--color-text-primary, #111827);
	}

	.plan-price .cadence {
		font-size: 0.85rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.plan-blurb {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.plan-features {
		list-style: none;
		margin: 0 0 1.5rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.plan-features li {
		position: relative;
		padding-left: 1.4rem;
		font-size: 0.88rem;
		color: var(--color-text-primary, #111827);
	}

	.plan-features li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--color-success, #16a34a);
		font-weight: 700;
	}

	.plan-cta {
		margin-top: auto;
	}

	.btn {
		display: block;
		width: 100%;
		padding: 0.65rem 1rem;
		text-align: center;
		font-weight: 600;
		font-size: 0.92rem;
		border-radius: 0.55rem;
		text-decoration: none;
		box-sizing: border-box;
		cursor: pointer;
	}

	.btn-primary {
		background: var(--color-accent-blue, #2563eb);
		color: #fff;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		background: var(--color-bg-secondary, #f3f4f6);
		color: var(--color-text-primary, #111827);
		border: 1px solid var(--color-border-primary, #e5e7eb);
	}

	.btn-current {
		background: color-mix(in srgb, var(--color-success, #16a34a) 14%, transparent);
		color: var(--color-text-primary, #111827);
		cursor: default;
	}

	.btn-disabled {
		background: var(--color-bg-secondary, #f3f4f6);
		color: var(--color-text-secondary, #9ca3af);
		cursor: not-allowed;
	}

	.pricing-foot {
		margin-top: 2rem;
		text-align: center;
		font-size: 0.8rem;
		color: var(--color-text-secondary, #6b7280);
	}
</style>
