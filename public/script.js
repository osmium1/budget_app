// A mapping from our frontend description to the backend 'Type'
const expenseTypeMapping = {
    'Groceries': 'Food',
    'Rent': 'Housing',
    'Utilities': 'Housing',
    'Transportation': 'Transportation',
    'Entertainment': 'Entertainment',
    'Other': 'Other'
};

document.addEventListener('DOMContentLoaded', () => {
    // Get all UI elements
    const todayExpensesTotalEl = document.getElementById('today-expenses-total');
    const monthExpensesTotalEl = document.getElementById('month-expenses-total');
    const addExpenseForm = document.getElementById('add-expense-form');
    const expenseDateInput = document.getElementById('expense-date');
    const expenseDescriptionInput = document.getElementById('expense-description');
    const expenseAmountInput = document.getElementById('expense-amount');
    const expensesTableBody = document.getElementById('expenses-table-body');
    const addFundForm = document.getElementById('add-fund-form');
    const fundDateInput = document.getElementById('fund-date');
    const fundAmountInput = document.getElementById('fund-amount');
    const fundsTableBody = document.getElementById('funds-table-body');

    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    expenseDateInput.value = today;
    fundDateInput.value = today;

    // ----- DATA FETCHING AND RENDERING -----

    async function fetchData() {
        try {
            const response = await fetch('/api/get-data');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderExpenses(data.expenses || []);
            renderFunds(data.funds || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            expensesTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Failed to load expenses.</td></tr>`;
            fundsTableBody.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-red-500">Failed to load funds.</td></tr>`;
        }
    }

    function renderExpenses(expenses) {
        expensesTableBody.innerHTML = ''; // Clear existing rows
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No expenses added yet.</td></tr>`;
        } else {
             // Sort by date, most recent first
            expenses.sort((a, b) => new Date(b[1]) - new Date(a[1]));
            expenses.forEach(exp => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                // Note: The indices [1], [4], [6] correspond to the columns in your Google Sheet
                // Make sure they match your sheet: Date, Description, Amount
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${exp[1]}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${exp[4]}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹${parseFloat(exp[6] || 0).toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button data-row-index="${exp[0]}" data-sheet="Expenses" class="delete-btn text-red-600 hover:text-red-900">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                expensesTableBody.appendChild(row);
            });
        }
        updateExpenseTotals(expenses);
    }

    function renderFunds(funds) {
        fundsTableBody.innerHTML = ''; // Clear existing rows
        if (funds.length === 0) {
            fundsTableBody.innerHTML = `<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No funds added yet.</td></tr>`;
        } else {
            // Sort by date, most recent first
            funds.sort((a, b) => new Date(b[0]) - new Date(a[0]));
            funds.forEach(fund => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                // Note: The indices [0], [1] correspond to Date and Amount in the 'Funds' sheet
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${fund[0]}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹${parseFloat(fund[1] || 0).toFixed(2)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <button data-row-index="${fund[2]}" data-sheet="Funds" class="delete-btn text-red-600 hover:text-red-900">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                fundsTableBody.appendChild(row);
            });
        }
    }


    function updateExpenseTotals(expenses) {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let totalToday = 0;
        let totalMonth = 0;

        expenses.forEach(exp => {
            const expenseDate = new Date(exp[1]); // Assuming date is in the second column
            const amount = parseFloat(exp[6] || 0); // Assuming amount is in the seventh column

            if (
                expenseDate.getDate() === today.getDate() &&
                expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear
            ) {
                totalToday += amount;
            }

            if (
                expenseDate.getMonth() === currentMonth &&
                expenseDate.getFullYear() === currentYear
            ) {
                totalMonth += amount;
            }
        });

        todayExpensesTotalEl.textContent = `₹${totalToday.toFixed(2)}`;
        monthExpensesTotalEl.textContent = `₹${totalMonth.toFixed(2)}`;
    }

    // ----- EVENT HANDLERS -----

    async function handleAddExpense(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = 'Adding...';

        const newExpense = {
            date: expenseDateInput.value,
            description: expenseDescriptionInput.value.trim(),
            amount: parseFloat(expenseAmountInput.value)
        };

        try {
            const response = await fetch('/api/add-expense', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newExpense),
            });
            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Failed to add expense');
            }
            addExpenseForm.reset();
            expenseDateInput.value = today; // Reset date to today
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Error adding expense:", error);
            alert(`Error: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus mr-2"></i> Add Expense';
        }
    }

    async function handleAddFund(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = 'Adding...';
        
        const newFund = {
            date: fundDateInput.value,
            amount: parseFloat(fundAmountInput.value)
        };

        try {
             const response = await fetch('/api/add-fund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFund),
            });
             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || 'Failed to add fund');
            }
            addFundForm.reset();
            fundDateInput.value = today; // Reset date to today
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Error adding fund:", error);
            alert(`Error: ${error.message}`);
        } finally {
             btn.disabled = false;
             btn.innerHTML = '<i class="fas fa-wallet mr-2"></i> Add Fund';
        }
    }

    async function handleDelete(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (!deleteBtn) return;
        
        const rowIndex = deleteBtn.dataset.rowIndex;
        const sheetName = deleteBtn.dataset.sheet;

        if (!confirm(`Are you sure you want to delete this item from ${sheetName}?`)) {
            return;
        }

        deleteBtn.disabled = true;

        try {
            const response = await fetch('/api/delete-row', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetName, rowIndex }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete row');
            }
            
            fetchData(); // Refresh the tables
        } catch (error) {
            console.error("Error deleting row:", error);
            alert(`Error: ${error.message}`);
            deleteBtn.disabled = false;
        }
    }


    // ----- INITIALIZATION -----

    addExpenseForm.addEventListener('submit', handleAddExpense);
    addFundForm.addEventListener('submit', handleAddFund);
    document.body.addEventListener('click', handleDelete);
    fetchData(); // Initial data load
});