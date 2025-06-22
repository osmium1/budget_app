// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transaction-form');
    const todayTotalEl = document.getElementById('today-total');
    const monthTotalEl = document.getElementById('month-total');
    const tableBody = document.querySelector('#transaction-table tbody');

    // Set the date input to today's date by default
    document.getElementById('date').valueAsDate = new Date();

    // --- Function to fetch and display transactions ---
    async function fetchAndDisplayTransactions() {
        try {
            // Fetch data from our backend API
            const response = await fetch('/api/transactions');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const transactions = await response.json();

            // Clear existing table and totals
            tableBody.innerHTML = '';
            let todaySpend = 0;
            let monthSpend = 0;

            const today = new Date().toISOString().split('T'); // YYYY-MM-DD format
            const currentMonth = today.substring(0, 7); // YYYY-MM format

            // Process transactions in reverse order to show newest first
            transactions.slice().reverse().forEach(tx => {
                // The data from sheets is an array of values for each row.
                // Schema:
                const txDate = tx[18];
                const txName = tx[1];
                const txAmount = parseFloat(tx[2]);
                const txCategory = tx[4];

                // Calculate totals for expenses (negative amounts)
                if (txAmount < 0) {
                    if (txDate === today) {
                        todaySpend += txAmount;
                    }
                    if (txDate.startsWith(currentMonth)) {
                        monthSpend += txAmount;
                    }
                }

                // Create and append table row
                const row = document.createElement('tr');
                const amountClass = txAmount >= 0? 'income' : 'expense';
                row.innerHTML = `
                    <td>${txDate}</td>
                    <td>${txName}</td>
                    <td class="${amountClass}">${txAmount.toFixed(2)}</td>
                    <td>${txCategory}</td>
                `;
                tableBody.appendChild(row);
            });

            // Update the display for totals (show as positive numbers)
            todayTotalEl.textContent = `$${Math.abs(todaySpend).toFixed(2)}`;
            monthTotalEl.textContent = `$${Math.abs(monthSpend).toFixed(2)}`;

        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            alert('Could not load transactions. Please check the console for errors.');
        }
    }

    // --- Event listener for form submission ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        // Create a data object from the form
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Ensure amount is a number before sending
        data.amount = parseFloat(data.amount);

        try {
            // Send the data to our backend API
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add transaction');
            }

            // Reset the form and refresh the transaction list
            form.reset();
            document.getElementById('date').valueAsDate = new Date(); // Reset date to today
            fetchAndDisplayTransactions();

        } catch (error) {
            console.error('Error submitting form:', error);
            alert(`Failed to add transaction: ${error.message}. Please try again.`);
        }
    });

    // Initial load of transactions when the page loads
    fetchAndDisplayTransactions();
});