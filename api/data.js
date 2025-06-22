const { google } = require('googleapis');
const { auth } = require('google-auth-library');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Only GET method is allowed' });
    }

    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const client = auth.fromJSON(credentials);
        client.scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
        const sheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = '1ns_a_d_4ylTSyWqOBD1Mijw1hIf17tWs_2Xl3MCLKlQ'

        // Get all expenses and add a row index
        const expensesResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Expenses!A2:G',
        });
        const expenses = expensesResponse.data.values ? expensesResponse.data.values.map((row, index) => [...row, index + 2]) : [];

        // Get all funds and add a row index
        const fundsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Funds!A2:B',
        });
        const funds = fundsResponse.data.values ? fundsResponse.data.values.map((row, index) => [...row, index + 2]) : [];

        res.status(200).json({ expenses, funds });
    } catch (error) {
        console.error('API Error in /api/data:', error);
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
}