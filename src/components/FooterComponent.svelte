<script>
	let { companyName, year } = $props();
</script>

<footer class="footer">
	<p>&copy; {year} {companyName}. All rights reserved.</p>
</footer>

<style>
	.footer {
		margin-top: 3rem;
		padding: 1rem;
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
		background-color: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}
</style>
