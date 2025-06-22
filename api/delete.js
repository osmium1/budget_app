const { google } = require('googleapis');
const { auth } = require('google-auth-library');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST method is allowed' });
    }

    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        const client = auth.fromJSON(credentials);
        client.scopes = ['https://www.googleapis.com/auth/spreadsheets'];
        const sheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = '1ns_a_d_4ylTSyWqOBD1Mijw1hIf17tWs_2Xl3MCLKlQ'

        const { sheetName, rowIndex } = req.body;
        
        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        const sheet = spreadsheetInfo.data.sheets.find(s => s.properties.title === sheetName);

        if (!sheet) {
            return res.status(404).json({ message: `Sheet '${sheetName}' not found.` });
        }
        const sheetId = sheet.properties.sheetId;

        const request = {
            deleteDimension: {
                range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: parseInt(rowIndex, 10) - 1,
                    endIndex: parseInt(rowIndex, 10)
                }
            }
        };

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests: [request] }
        });

        res.status(200).json({ message: 'Row deleted successfully' });

    } catch (error) {
        console.error('API Error in /api/delete:', error);
        res.status(500).json({ message: 'An internal server error occurred.', error: error.message });
    }
}