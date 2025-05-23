<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getAllInvoices,
		deleteInvoice,
		clearAllInvoices,
		saveInvoice,
		getInvoice
	} from '$lib/db.js';

	export const prerender = true;

	let savedInvoices = [];
	let search = '';
	let showInvoiceDeleteModal = false;
	let invoiceToDelete = null;
	let showArchived = false;

	const loadInvoices = async () => {
		const invoices = await getAllInvoices();
		if (showArchived) {
			savedInvoices = invoices.filter(({ invoice }) => invoice?.archived);
		} else {
			savedInvoices = invoices.filter(({ invoice }) => !invoice?.archived);
		}
	};

	const searchItems = async () => {
		const invoices = await getAllInvoices();
		if (search.trim()) {
			savedInvoices = invoices.filter(({ invoice }) =>
				invoice?.invoiceTo?.toLowerCase().includes(search.toLowerCase())
			);
		} else {
			savedInvoices = invoices;
		}
	};

	const removeInvoice = async (id = invoiceToDelete) => {
		if (!id) return;
		await deleteInvoice(id);
		await loadInvoices();
	};

	const clearData = async () => {
		await clearAllInvoices();
		savedInvoices = [];
	};

	const archiveInvoice = async (id) => {
		const data = await getInvoice(id);
		if (data) {
			data.archived = true;
			await saveInvoice(id, data);
			await loadInvoices();
		}
	};
	const unarchiveInvoice = async (id) => {
		const data = await getInvoice(id);
		if (data) {
			data.archived = false;
			await saveInvoice(id, data);
			await loadInvoices();
		}
	};

	const confirmDeleteInvoice = (id) => {
		invoiceToDelete = id;
		showInvoiceDeleteModal = true;
	};

	const cancelDelete = () => {
		invoiceToDelete = null;
		showInvoiceDeleteModal = false;
	};

	onMount(() => {
		loadInvoices();
	});
</script>

<section class="container myinvoicePart">
	<div class="columns is-mobile myinvoicePart">
		<div
			class="column is-offset-2-desktop is-8-desktop is-offset-2-tablet is-8-tablet is-offset-1-mobile is-10-mobile myinvoicePart-Color"
		>
			<div class="has-text-centered myInvoice-Font">My Invoice</div>
			<p class="has-text-centered weAutomatically">
				We automatically save your invoice drafts to your device.
			</p>
			<div class="filter-toggle">
				<button
					class:active={!showArchived}
					on:click={() => {
						showArchived = false;
						loadInvoices();
					}}
				>
					Active Invoices
				</button>
				<button
					class:active={showArchived}
					on:click={() => {
						showArchived = true;
						loadInvoices();
					}}
				>
					Archived Invoices
				</button>
			</div>
			<nav class="field navPart">
				<div class="control has-icons-right inputPart">
					<input
						class="input"
						type="text"
						placeholder="Search by invoice to name"
						bind:value={search}
						on:input={searchItems}
					/>
					<span class="icon is-right">
						<i class="fas fa-search"></i>
					</span>
				</div>

				<div class="control newInvoice-Button">
					<a class="button is-success" on:click={() => goto('/')}> New Invoice </a>
				</div>
			</nav>

			{#each Object.entries(savedInvoices) as [key, invoice]}
				{#if invoice}
					<div class="columns is-centered invoicespdf-part">
						<div class="box column is-7">
							<div class="testPart">
								<div class="itemPartBlock">
									<a href={`/#/${key}`}>
										<div class="boxDesign">
											<figure class="image is-64x64 boxImage">
												<img
													src="https://eosillumination.com/wp-content/uploads/2017/11/Pdf-image-281x300.png"
													alt="PDF Icon"
												/>
											</figure>
											<div class="boxContent">
												<p>${invoice.dueAmount}</p>
												<p>{invoice.invoiceTo}</p>
												<p>{invoice.date}</p>
											</div>
										</div>
									</a>
								</div>
								<div class="removeIconButton actions">
									<button
										class="iconButton delete-btn"
										on:click={() => confirmDeleteInvoice(invoice.id)}
										aria-label="Remove Invoice"
									>
										<i class="fas fa-times"></i>
									</button>
									{#if showArchived}
										<button class="unarchive-btn" on:click={() => unarchiveInvoice(invoice.id)}
											>Unarchive</button
										>
									{:else}
										<button class="archive-btn" on:click={() => archiveInvoice(invoice.id)}
											>Archive</button
										>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/each}

			<div class="linePart"></div>

			<p class="theseInvoice">
				These invoices are stored in your device and not online. Clearing your browser cache could
				cause you to lose these invoices. We recommend keeping a copy of each invoice.
			</p>

			<div class="clearEverything">
				<button class="button is-link" on:click={clearData}> Clear Everything </button>
			</div>
		</div>
	</div>
	{#if showInvoiceDeleteModal}
		<div class="modal-backdrop">
			<div class="modal">
				<p>Are you sure you want to delete this invoice?</p>
				<div class="modal-actions">
					<button class="confirm-btn" on:click={removeInvoice}>Yes, Delete</button>
					<button class="cancel-btn" on:click={cancelDelete}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	/* Include your exact same CSS you posted earlier */
	/* (You can copy-paste the previous <style> block here) */

	.myinvoicePart {
		padding: 50px;
	}
	.myinvoicePart-Color {
		background-color: cornsilk;
	}
	.weAutomatically {
		padding: 10px;
		padding-bottom: 30px;
	}
	.myInvoice-Font {
		font-size: 24px;
	}
	.navPart {
		padding-bottom: 30px;
		text-align: center;
	}
	.inputPart {
		width: 40%;
		display: inline-block;
	}
	.inputPart .input {
		box-shadow: none;
		border-radius: 0;
	}
	.newInvoice-Button {
		width: 20%;
		display: inline-block;
		margin-left: 5px;
	}
	.newInvoice-Button .button {
		width: 100%;
		border-radius: 0;
	}
	@media (max-width: 680px) {
		.inputPart {
			width: 85%;
		}
		.newInvoice-Button {
			width: 42%;
			margin: 0 auto;
			margin-top: 5px;
		}
	}
	.linePart {
		width: 100%;
		border-bottom: 1px solid #ccc;
	}
	.theseInvoice {
		padding: 20px 0;
	}
	.clearEverything {
		text-align: center;
	}
	.clearEverything button {
		padding: 0 25px;
		border-radius: 0;
	}
	.invoicespdf-part {
		margin-bottom: 20px;
	}
	.box {
		cursor: pointer;
	}
	.boxDesign {
		border-radius: 0;
		margin: 0 auto;
		display: flex;
	}
	.boxImage {
		margin-right: 50px;
	}
	.boxContent {
		text-align: left;
		width: 72%;
	}
	@media (max-width: 600px) {
		.myinvoicePart {
			padding: 50px 0;
		}
		.boxDesign {
			width: 275px;
			padding: 10px 0;
		}
		.boxImage {
			margin-right: 10px;
		}
		.myinvoicePart-Color {
			padding: 12px 6px;
		}
		.boxContent {
			width: 71%;
			font-size: 15px;
		}
	}
	.iconButton {
		cursor: pointer;
	}
	.testPart {
		display: flex;
	}
	.removeIconButton {
		display: flex;
		justify-content: flex-end;
		width: 10%;
	}
	.itemPartBlock {
		width: 100%;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.archive-btn,
	.delete-btn {
		padding: 0.3rem 0.8rem;
		font-size: 0.875rem;
		border-radius: 0.375rem;
		border: none;
		cursor: pointer;
	}
	.archive-btn {
		background-color: #3b82f6; /* Blue */
		color: white;
	}
	.archive-btn:hover {
		background-color: #2563eb;
	}
	.delete-btn {
		background-color: #ef4444; /* Red */
		color: white;
	}
	.delete-btn:hover {
		background-color: #dc2626;
	}
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}
	.modal {
		background: white;
		padding: 2rem;
		border-radius: 0.5rem;
		text-align: center;
		max-width: 400px;
		width: 90%;
	}
	.modal-actions {
		display: flex;
		justify-content: space-between;
		margin-top: 1.5rem;
	}
	.confirm-btn {
		background-color: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
	}
	.confirm-btn:hover {
		background-color: #dc2626;
	}
	.cancel-btn {
		background-color: #9ca3af;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
	}
	.cancel-btn:hover {
		background-color: #6b7280;
	}
	.filter-toggle {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		justify-content: center;
	}
	.filter-toggle button {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		background-color: white;
		color: #374151;
		cursor: pointer;
		border-radius: 0.375rem;
	}
	.filter-toggle button.active {
		background-color: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}
	.unarchive-btn {
		background-color: #10b981;
		color: white;
		border: none;
		padding: 0.3rem 0.8rem;
		border-radius: 0.375rem;
		cursor: pointer;
	}
	.unarchive-btn:hover {
		background-color: #059669;
	}
</style>
