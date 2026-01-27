<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { parseInvoiceFromFile, validateOcrFile, type OcrInvoiceData } from '$lib/ocrParser';

	interface Props {
		onDataExtracted?: (data: OcrInvoiceData) => void;
		disabled?: boolean;
	}

	let { onDataExtracted = () => {}, disabled = false }: Props = $props();

	let isProcessing = $state(false);
	let error = $state<string | null>(null);
	let isDragging = $state(false);
	let fileInputRef = $state<HTMLInputElement | null>(null);

	const handleFile = async (file: File) => {
		error = null;

		// Validate file
		const validation = validateOcrFile(file);
		if (!validation.valid) {
			error = validation.error || 'Invalid file';
			return;
		}

		isProcessing = true;

		try {
			const result = await parseInvoiceFromFile(file);

			if (!result.success || !result.data) {
				error = result.message || result.error || 'Failed to extract invoice data';
				return;
			}

			// Call the callback with extracted data
			onDataExtracted(result.data);
		} catch (err) {
			console.error('OCR processing error:', err);
			error = err instanceof Error ? err.message : 'An error occurred while processing the file';
		} finally {
			isProcessing = false;
			// Reset file input
			if (fileInputRef) {
				fileInputRef.value = '';
			}
		}
	};

	const handleFileChange = (event: Event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement) || !target.files?.length) {
			return;
		}
		handleFile(target.files[0]);
	};

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault();
		if (!disabled && !isProcessing) {
			isDragging = true;
		}
	};

	const handleDragLeave = (event: DragEvent) => {
		event.preventDefault();
		isDragging = false;
	};

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		isDragging = false;

		if (disabled || isProcessing) return;

		const files = event.dataTransfer?.files;
		if (files?.length) {
			handleFile(files[0]);
		}
	};

	const handleClick = () => {
		if (!disabled && !isProcessing && fileInputRef) {
			fileInputRef.click();
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick();
		}
	};

	const dismissError = () => {
		error = null;
	};
</script>

<div class="ocr-upload-wrapper">
	<div
		class="ocr-upload-area"
		class:dragging={isDragging}
		class:disabled={disabled || isProcessing}
		role="button"
		tabindex={disabled || isProcessing ? -1 : 0}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={handleClick}
		onkeydown={handleKeydown}
	>
		<input
			bind:this={fileInputRef}
			type="file"
			accept="image/*,application/pdf"
			onchange={handleFileChange}
			disabled={disabled || isProcessing}
			class="file-input"
		/>

		<div class="upload-content">
			{#if isProcessing}
				<div class="processing-indicator">
					<svg class="spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<circle
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="2"
							stroke-dasharray="45 15"
							stroke-linecap="round"
						/>
					</svg>
					<span class="processing-text">{$_('ocr.processing')}</span>
				</div>
			{:else}
				<svg class="upload-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<div class="upload-text">
					<span class="upload-title">{$_('ocr.upload_title')}</span>
					<span class="upload-subtitle">{$_('ocr.upload_subtitle')}</span>
				</div>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-message" role="alert">
			<svg class="error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>{error}</span>
			<button type="button" class="dismiss-btn" onclick={dismissError} aria-label="Dismiss error">
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</div>
	{/if}
</div>

<style>
	.ocr-upload-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ocr-upload-area {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem 1.25rem;
		border: 2px dashed var(--color-border-secondary);
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		cursor: pointer;
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease;
	}

	.ocr-upload-area:hover:not(.disabled) {
		border-color: var(--color-accent-blue);
		background: rgba(59, 130, 246, 0.05);
	}

	.ocr-upload-area:focus-visible {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.ocr-upload-area.dragging {
		border-color: var(--color-accent-blue);
		background: rgba(59, 130, 246, 0.1);
		border-style: solid;
	}

	.ocr-upload-area.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.file-input {
		display: none;
	}

	.upload-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.upload-icon {
		width: 2rem;
		height: 2rem;
		color: var(--color-accent-blue);
		flex-shrink: 0;
	}

	.upload-text {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.upload-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.upload-subtitle {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.processing-indicator {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.spinner {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-accent-blue);
		animation: spin 1s linear infinite;
	}

	.processing-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		color: #dc2626;
	}

	:global(.dark) .error-message {
		color: #f87171;
		background: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.25);
	}

	.error-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.error-message span {
		flex: 1;
	}

	.dismiss-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.2s ease;
	}

	.dismiss-btn:hover {
		opacity: 1;
	}

	.dismiss-btn svg {
		width: 1rem;
		height: 1rem;
	}

	/* Mobile adjustments */
	@media (max-width: 640px) {
		.ocr-upload-area {
			padding: 0.875rem 1rem;
		}

		.upload-content {
			flex-direction: column;
			text-align: center;
		}

		.upload-text {
			align-items: center;
		}
	}
</style>
