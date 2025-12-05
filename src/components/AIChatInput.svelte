<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { ParsedInvoice } from '$lib/server/ai';

	interface Props {
		onApplyParsedData?: (data: ParsedInvoice) => void;
	}

	let { onApplyParsedData = () => {} }: Props = $props();

	let message = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let parsedData = $state<ParsedInvoice | null>(null);
	let showResult = $state(false);

	const examplePrompts = [
		'Create an invoice for John Smith at ABC Corp for $500 web development, due in 30 days, with 10% tax',
		'Invoice for Jane Doe: 2 hours of consulting at $150/hour, 5% discount',
		'Bill Tech Solutions LLC for 3 website pages at $200 each, with payment terms net 15'
	];

	const parseInvoice = async (): Promise<void> => {
		if (!message.trim()) {
			error = 'Please enter an invoice description';
			return;
		}

		isLoading = true;
		error = null;
		parsedData = null;
		showResult = false;

		try {
			const response = await fetch('/api/ai/parse-invoice', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: message.trim() })
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to parse invoice';
				return;
			}

			parsedData = result.data;
			showResult = true;
		} catch (err) {
			console.error('Parse error:', err);
			error = 'Failed to connect to AI service';
		} finally {
			isLoading = false;
		}
	};

	const applyToForm = (): void => {
		if (parsedData) {
			onApplyParsedData(parsedData);
			showResult = false;
			message = '';
			parsedData = null;
		}
	};

	const useExample = (example: string): void => {
		message = example;
	};

	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			parseInvoice();
		}
	};

	const dismissResult = (): void => {
		showResult = false;
		parsedData = null;
	};
</script>

<div class="ai-chat-container">
	<div class="ai-chat-header">
		<div class="ai-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
				/>
			</svg>
		</div>
		<div class="ai-header-text">
			<h3>{$_('ai.chat_title')}</h3>
			<p>{$_('ai.chat_description')}</p>
		</div>
	</div>

	<div class="ai-input-area">
		<textarea
			bind:value={message}
			placeholder={$_('ai.chat_placeholder')}
			onkeydown={handleKeydown}
			disabled={isLoading}
			class="ai-textarea"
			rows="3"
		></textarea>
		<button
			type="button"
			class="ai-submit-btn"
			onclick={parseInvoice}
			disabled={isLoading || !message.trim()}
		>
			{#if isLoading}
				<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
				</svg>
				{$_('ai.parsing')}
			{:else}
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
						clip-rule="evenodd"
					/>
				</svg>
				{$_('ai.parse_button')}
			{/if}
		</button>
	</div>

	{#if !showResult && !isLoading}
		<div class="ai-examples">
			<span class="examples-label">{$_('ai.try_examples')}</span>
			<div class="example-chips">
				{#each examplePrompts as example, i}
					<button type="button" class="example-chip" onclick={() => useExample(example)}>
						{$_(`ai.example_${i + 1}`)}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if error}
		<div class="ai-error">
			<svg viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>{error}</span>
		</div>
	{/if}

	{#if showResult && parsedData}
		<div class="ai-result">
			<div class="result-header">
				<h4>{$_('ai.parsed_result')}</h4>
				<button type="button" class="dismiss-btn" onclick={dismissResult} aria-label="Dismiss">
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
						/>
					</svg>
				</button>
			</div>

			<div class="result-content">
				{#if parsedData.invoiceTo}
					<div class="result-field">
						<span class="field-label">{$_('ai.client')}</span>
						<span class="field-value">{parsedData.invoiceTo}</span>
					</div>
				{/if}

				{#if parsedData.items && parsedData.items.length > 0}
					<div class="result-field">
						<span class="field-label">{$_('ai.items')}</span>
						<ul class="items-list">
							{#each parsedData.items as item}
								<li>
									{item.name} × {item.quantity} @ ${item.price.toFixed(2)}
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if parsedData.dueDate}
					<div class="result-field">
						<span class="field-label">{$_('ai.due_date')}</span>
						<span class="field-value">{parsedData.dueDate}</span>
					</div>
				{/if}

				{#if parsedData.tax && parsedData.tax.rate > 0}
					<div class="result-field">
						<span class="field-label">{$_('ai.tax')}</span>
						<span class="field-value">
							{parsedData.tax.rate}{parsedData.tax.type === 'percent' ? '%' : ' flat'}
						</span>
					</div>
				{/if}

				{#if parsedData.discount && parsedData.discount.rate > 0}
					<div class="result-field">
						<span class="field-label">{$_('ai.discount')}</span>
						<span class="field-value">
							{parsedData.discount.rate}{parsedData.discount.type === 'percent' ? '%' : ' flat'}
						</span>
					</div>
				{/if}
			</div>

			<button type="button" class="apply-btn" onclick={applyToForm}>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
						clip-rule="evenodd"
					/>
				</svg>
				{$_('ai.apply_to_form')}
			</button>
		</div>
	{/if}
</div>

<style>
	.ai-chat-container {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	.ai-chat-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.ai-icon {
		width: 2.5rem;
		height: 2.5rem;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ai-icon svg {
		width: 1.25rem;
		height: 1.25rem;
		color: white;
	}

	.ai-header-text h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.ai-header-text p {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.ai-input-area {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
	}

	.ai-textarea {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.9375rem;
		resize: none;
		transition: border-color 0.2s;
	}

	.ai-textarea:focus {
		outline: none;
		border-color: #8b5cf6;
		box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
	}

	.ai-textarea:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.ai-submit-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.9375rem;
		cursor: pointer;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	.ai-submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.ai-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ai-submit-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.spin {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.ai-examples {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-primary);
	}

	.examples-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
		display: block;
		margin-bottom: 0.5rem;
	}

	.example-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.example-chip {
		padding: 0.375rem 0.75rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-pill);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.example-chip:hover {
		border-color: #8b5cf6;
		color: #8b5cf6;
	}

	.ai-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-md);
		color: #dc2626;
		font-size: 0.875rem;
	}

	:global(.dark) .ai-error {
		background: rgba(220, 38, 38, 0.1);
		border-color: rgba(220, 38, 38, 0.3);
	}

	.ai-error svg {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.ai-result {
		margin-top: 1rem;
		padding: 1rem;
		background: var(--color-bg-primary);
		border: 1px solid #a5b4fc;
		border-radius: var(--radius-md);
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.result-header h4 {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.dismiss-btn {
		padding: 0.25rem;
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.dismiss-btn:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-secondary);
	}

	.dismiss-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.result-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.result-field {
		display: flex;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.field-label {
		color: var(--color-text-secondary);
		min-width: 80px;
		flex-shrink: 0;
	}

	.field-value {
		color: var(--color-text-primary);
	}

	.items-list {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--color-text-primary);
	}

	.items-list li {
		margin-bottom: 0.25rem;
	}

	.apply-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: #10b981;
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.apply-btn:hover {
		background: #059669;
	}

	.apply-btn svg {
		width: 1rem;
		height: 1rem;
	}

	@media (max-width: 640px) {
		.ai-input-area {
			flex-direction: column;
			align-items: stretch;
		}

		.ai-submit-btn {
			justify-content: center;
		}
	}
</style>
