<script lang="ts">
	type FileSource = string | File | null | undefined;

	export let file: FileSource = undefined;

	const getFileUrl = (value: FileSource): string | undefined => {
		if (value instanceof File) {
			return URL.createObjectURL(value);
		}
		return typeof value === 'string' ? value : undefined;
	};
</script>

{#if file}
	<div class="file-preview">
		{#if typeof file === 'string'}
			{#if getFileUrl(file)}
				<img src={getFileUrl(file)} alt="File Preview" class="preview-image" />
			{:else}
				<p>Preview not available for this file type.</p>
			{/if}
		{:else if file instanceof File}
			{#if file.type.startsWith('image/')}
				{#if getFileUrl(file)}
					<img src={getFileUrl(file)} alt="File Preview" class="preview-image" />
				{:else}
					<p>Preview not available for this file type.</p>
				{/if}
			{:else}
				<p>Preview not available for this file type.</p>
			{/if}
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
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-soft);
	}
</style>
