const { google } = require('googleapis');
const { auth } = require('google-auth-library');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST method is allowed' });
    }

    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const client = auth.fromJSON(credentials);
        client.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
        const sheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // <-- IMPORTANT: Make sure this is your actual Spreadsheet ID

        const { type, data } = req.body;

        if (type === 'expense') {
            const { date, description, amount } = data;
            const newRow = [new Date().toISOString(), date, null, null, description, 'Other', amount, 'Personal'];
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Expenses!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] },
            });
            res.status(201).json({ message: 'Expense added successfully' });

        } else if (type === 'fund') {
            const { date, amount } = data;
            const newRow = [date, amount];
            await sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Funds!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] },
            });
            res.status(201).json({ message: 'Fund added successfully' });

        } else {
            res.status(400).json({ message: 'Invalid type specified. Must be "expense" or "fund".' });
        }
    } catch (error) {
        console.error('API Error in /api/add:', error);
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
}