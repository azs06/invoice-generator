<script>
	import { locale, locales } from 'svelte-i18n';

	const languages = {
		en: 'English',
		bn: 'বাংলা'
	};

	function changeLanguage(event) {
		locale.set(event.target.value);
	}
</script>

<div class="flex items-center gap-2">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="w-5 h-5"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802"
		/>
	</svg>
	<select
		onchange={changeLanguage}
		value={$locale}
		class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100"
	>
		{#each Object.entries(languages) as [code, name]}
			<option value={code}>{name}</option>
		{/each}
	</select>
</div>
