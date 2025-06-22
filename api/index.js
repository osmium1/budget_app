// /api/index.js

// Import necessary libraries
const express = require('express');
const { google } = require('googleapis');
const path = require('path');

// Initialize the express app
const app = express();
// Use express.json() middleware to parse JSON request bodies
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Google Sheets API Configuration ---

// The ID of your Google Sheet. Found in the URL of your sheet.
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // <-- IMPORTANT: REPLACE THIS

// Function to get authenticated Google Sheets API client
async function getSheetsClient() {
  // Scopes define the permissions the app is requesting.
  // 'https://www.googleapis.com/auth/spreadsheets' allows read and write access.
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

  // This is the authentication part. It uses the credentials file.
  const credentialsJson = process.env.GOOGLE_CREDENTIALS;
  if (!credentialsJson) {
    throw new Error('The GOOGLE_CREDENTIALS environment variable is not set.');
  }
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: scopes,
});

  // Create an authorized client
  const authClient = await auth.getClient();

  // Get the Google Sheets API client
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  return sheets;
}

// --- API Endpoints ---

// Endpoint to GET all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      // Specify the sheet name and range. 'A2:G' gets all data from the second row onwards.
      range: 'Transactions!A2:G', 
    });

    // Send the retrieved data back to the frontend, defaulting to an empty array if no data
    res.json(response.data.values ||);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Send a 500 Internal Server Error response if something goes wrong
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Endpoint to POST a new transaction
app.post('/api/transactions', async (req, res) => {
  try {
    // Get the data from the request body sent by the frontend
    const { date, name, amount, type, category, remarks } = req.body;

    // Basic validation to ensure required fields are present
    if (!date ||!name ||!amount ||!type ||!category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sheets = await getSheetsClient();
    
    // Make amount negative if it's an expense
    const finalAmount = type === 'Expense'? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));

    // The new row of data to be added to the sheet, including an automatic timestamp
    const newRow =;

    // Use the 'append' method to add the new row to the end of the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Transactions!A:G', // Append to the 'Transactions' sheet
      valueInputOption: 'USER_ENTERED', // Interprets the data as if a user typed it in
      resource: {
        values:,
      },
    });

    // Send a success response
    res.status(201).json({ message: 'Transaction added successfully' });
  } catch (error) {
    console.error('Error adding transaction:', error);
    // Send a 500 Internal Server Error response if something goes wrong
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// --- Server Start ---
// This part is mainly for local development. Vercel handles the server listening.
const PORT = process.env.PORT |
| 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel's serverless environment
module.exports = app;