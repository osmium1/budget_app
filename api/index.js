const { google } = require('googleapis');
const { auth } = require('google-auth-library');

// This function is the main entry point for Vercel Serverless Functions
export default async function handler(req, res) {
    // Set up CORS headers to allow requests from your Vercel domain
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // --- Authentication ---
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const client = auth.fromJSON(credentials);
    client.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // <-- IMPORTANT: Make sure this is your actual Spreadsheet ID

    // --- API Routing ---
    // We use the URL path to determine what action to take
    const action = req.url.split('/').pop();

    try {
        switch (action) {
            case 'get-data':
                await getData(req, res, sheets, spreadsheetId);
                break;
            case 'add-expense':
                await addExpense(req, res, sheets, spreadsheetId);
                break;
            case 'add-fund':
                await addFund(req, res, sheets, spreadsheetId);
                break;
            case 'delete-row':
                await deleteRow(req, res, sheets, spreadsheetId);
                break;
            default:
                res.status(404).json({ message: 'Not Found' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
}


// --- API Functions ---

async function getData(req, res, sheets, spreadsheetId) {
    // Get all expenses
    const expensesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Expenses!A2:G', // Adjust range if needed
    });
    // Add row index to each expense item
    const expenses = expensesResponse.data.values ? expensesResponse.data.values.map((row, index) => [...row, index + 2]) : [];


    // Get all funds
    const fundsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Funds!A2:B', // Adjust range if needed
    });
    // Add row index to each fund item
    const funds = fundsResponse.data.values ? fundsResponse.data.values.map((row, index) => [...row, index + 2]) : [];

    res.status(200).json({ expenses, funds });
}

async function addExpense(req, res, sheets, spreadsheetId) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST method is allowed' });
    }
    const { date, description, amount } = req.body;
    
    // Basic validation
    if (!date || !description || !amount) {
        return res.status(400).json({ message: 'Missing required fields: date, description, amount' });
    }

    const newRow = [
        new Date().toISOString(), // Timestamp
        date,                     // Date of Expense
        null,                     // Day (can be auto-filled by sheet formula if needed)
        null,                     // Month (can be auto-filled by sheet formula if needed)
        description,              // Name/Description
        'Other',                  // Type - defaulting to 'Other'
        amount,                   // Amount
        'Personal'                // Category - defaulting
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Expenses!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [newRow],
        },
    });

    res.status(201).json({ message: 'Expense added successfully' });
}

async function addFund(req, res, sheets, spreadsheetId) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST method is allowed' });
    }
    const { date, amount } = req.body;

    if (!date || !amount) {
        return res.status(400).json({ message: 'Missing required fields: date, amount' });
    }

    const newRow = [date, amount];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Funds!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [newRow],
        },
    });
    
    res.status(201).json({ message: 'Fund added successfully' });
}

async function deleteRow(req, res, sheets, spreadsheetId) {
    if (req.method !== 'POST') {
         return res.status(405).json({ message: 'Only POST method is allowed for this action' });
    }
    const { sheetName, rowIndex } = req.body;

    if (!sheetName || !rowIndex) {
        return res.status(400).json({ message: 'Missing required fields: sheetName, rowIndex' });
    }

    // Find the sheetId (gid) for the given sheetName
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === sheetName);

    if (!sheet) {
        return res.status(404).json({ message: `Sheet '${sheetName}' not found.`});
    }
    const sheetId = sheet.properties.sheetId;
    
    const requests = [{
        deleteDimension: {
            range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: parseInt(rowIndex, 10) - 1, // API is 0-indexed
                endIndex: parseInt(rowIndex, 10)
            }
        }
    }];

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests }
    });

    res.status(200).json({ message: 'Row deleted successfully' });
}