<script>
	let { file } = $props();

	const getFileUrl = (file) => {
		if (file instanceof File) {
			return URL.createObjectURL(file);
		}
		return file; // Assume it is already a URL
	};
</script>

{#if file}
	<div class="file-preview">
		{#if typeof file === 'string' || file.type.startsWith('image/')}
			<img src={getFileUrl(file)} alt="File Preview" class="preview-image" />
		{:else}
			<p>Preview not available for this file type.</p>
		{/if}
	</div>
{/if}

<style>
	.file-preview {
		margin-top: 1rem;
		text-align: center;
	}
	.preview-image {
		max-width: 100px;
		height: auto;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
</style>
