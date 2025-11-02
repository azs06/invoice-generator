<script>
	let { open = false, title = '', onClose, children, footer } = $props();

	const close = () => {
		onClose && onClose();
	};
	const onkeydown = () => {};
</script>

{#if open}
	<div role="button" tabindex="0" class="modal-backdrop" onclick={close} {onkeydown}>
		<div
			role="button"
			tabindex="0"
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			{onkeydown}
		>
			<header class="modal-header">
				<h2>{title}</h2>
				<button class="close-btn" onclick={close}>×</button>
			</header>

			<div class="modal-body">
				{@render children?.()}
			</div>

			<footer class="modal-footer">
				{@render footer?.()}
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 50;
	}
	.modal-content {
		background: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		width: 90%;
		max-width: 600px;
		overflow: hidden;
		box-shadow: var(--shadow-medium);
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border-primary);
	}
	.modal-header {
		padding: 1rem;
		background: var(--color-bg-secondary);
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--color-border-secondary);
	}
	.modal-body {
		padding: 1rem;
	}
	.modal-footer {
		padding: 1rem;
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border-secondary);
	}
	.close-btn {
		background: transparent;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		line-height: 1;
	}
</style>
