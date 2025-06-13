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
            date: match[2],
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

app.delete('/claims/:id', (req, res) => {
  const claimIdToDelete = req.params.id;

  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'Log file not found.' });
      }
      return res.status(500).json({ message: 'Server error while reading file.' });
    }

    const lines = data.trim().split('\n');

    // Filter out the claim with the matching ID
    const filteredLines = lines.filter(line => {
      const match = line.match(/ID: (\d+),/);
      return match && match[1] !== claimIdToDelete;
    });

    // Check if any claim was actually removed
    if (lines.length === filteredLines.length) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    // Rewrite the file with the remaining claims
    fs.writeFile(logFilePath, filteredLines.join('\n') + '\n', (writeErr) => {
      if (writeErr) {
        console.error('Error writing to file:', writeErr);
        return res.status(500).json({ message: 'Server error while deleting claim.' });
      }

      res.status(200).json({ message: 'Claim deleted successfully.' });
    });
  });
});
  
app.put('/claims/:id', (req, res) => {
  const claimIdToUpdate = req.params.id;
  const { date, category, description } = req.body;

  if (!date || !category || !description) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ message: 'Log file not found.' });
      }
      return res.status(500).json({ message: 'Server error while reading file.' });
    }

    const lines = data.trim().split('\n');

    let found = false;

    const updatedLines = lines.map(line => {
      const match = line.match(/ID: (\d+), Claim Date: (.*?), Category: (.*?), Description: (.*)/);
      if (match && match[1] === claimIdToUpdate) {
        found = true;
        return `[${new Date().toISOString()}] ID: ${claimIdToUpdate}, Claim Date: ${date}, Category: ${category}, Description: ${description}`;
      }
      return line;
    });

    if (!found) {
      return res.status(404).json({ message: 'Claim not found.' });
    }

    fs.writeFile(logFilePath, updatedLines.join('\n') + '\n', (writeErr) => {
      if (writeErr) {
        console.error('Error writing to file:', writeErr);
        return res.status(500).json({ message: 'Server error while updating claim.' });
      }

      res.status(200).json({ message: 'Claim updated successfully.' });
    });
  });
});


app.post('/submit-claim', (req, res) => {
  const { date, category, description } = req.body;

  if (!date || !category || !description) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const id = Math.floor(Math.random() * 1000000);

  const logEntry = `[${new Date().toISOString()}] ID: ${id}, Claim Date: ${date}, Category: ${category}, Description: ${description}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
      return res.status(500).json({ message: 'Server error.' });
    }

    res.status(200).json({ 
        message: 'Claim submitted successfully.', 
        claim: { date, category, description, id } 
      });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
