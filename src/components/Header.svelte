<script>
	import { _ } from 'svelte-i18n';
	import ThemeToggle from './ThemeToggle.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
</script>

<header
	class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4"
>
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-6">
			<a href="/" class="flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-8 h-8 text-blue-600"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
					/>
				</svg>
				<span class="text-xl font-bold text-gray-900 dark:text-white">
					{$_('app.title')}
				</span>
			</a>

			<nav class="hidden md:flex items-center gap-4">
				<a
					href="/"
					class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
				>
					{$_('nav.home')}
				</a>
				<a
					href="/saved-invoices"
					class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
				>
					{$_('nav.saved_invoices')}
				</a>
			</nav>
		</div>

		<div class="flex items-center gap-3">
			<LanguageSelector />
			<ThemeToggle />
		</div>
	</div>
</header>
