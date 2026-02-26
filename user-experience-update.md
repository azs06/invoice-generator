We will be providing two different experiences for users based on whether they are logged in or not.

1. History will be replaced for LoggedIn users with dashboard link.
2. Within the dashboard we will add a settings page now for logged in users to manage their profile and invoices. They would able to set invoice prefix and preferred curency from there. We will add stripe integration for paid plans later.
3. Remove the "Create Invoice" link as it's redundant with the logo link.
4. For the table list use a dropdown for actions, and we want to add another action, send invoice via email. This would open a modal to enter email and send the invoice as PDF attachment. We will just add the modal for now, actual email sending will be implemented later.
5. The goal is to make the experience more seamless for logged in users while keeping it simple for guest users.
