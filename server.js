const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;


app.use(cors({
    origin: 'http://localhost:3000' // !! this is where front-end runs !!
}));
  

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const logFilePath = path.join(__dirname, 'claims.log');

app.get('/claims', (req, res) => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist, return empty array, not error
      if (err.code === 'ENOENT') {
        console.log('Log file not found, returning empty claims array');
        return res.json([]);
      }

      // Other errors, return server error
      console.error('Failed to read log file:', err);
      return res.status(500).json({ message: 'Server error.' });
    }

    // If file is empty or only whitespace, return empty array
    if (!data.trim()) {
      console.log('Log file empty, returning empty claims array');
      return res.json([]);
    }

    // Parse claims lines into objects
    const claims = data
      .trim()
      .split('\n')
      .map(line => {
        const match = line.match(/\[.*\] ID: (\d+), Claim Date: (.*?), Category: (.*?), Description: (.*)/);
        if (match) {
          return {
            id: Number(match[1]),
            claimDate: match[2],
            category: match[3],
            description: match[4],
          };
        }
        return null;
      })
      .filter(Boolean);

    // Return the array (may be empty)
    return res.json(claims);
  });
});
  

app.post('/submit-claim', (req, res) => {
  const { claimDate, category, description } = req.body;

  if (!claimDate || !category || !description) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const id = Math.floor(Math.random() * 1000000);

  const logEntry = `[${new Date().toISOString()}] ID: ${id}, Claim Date: ${claimDate}, Category: ${category}, Description: ${description}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
      return res.status(500).json({ message: 'Server error.' });
    }

    res.status(200).json({ 
        message: 'Claim submitted successfully.', 
        claim: { claimDate, category, description, id } 
      });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
