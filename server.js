const express = require('express');


const app = express();

// Define the route that proxies to the dictionary API
app.get('/search/:word', async (req, res) => {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${req.params.word}`;

    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            // send error like cannot get if the api does not connect
            res.status(response.status).json({ message: response.statusText });
        }
    } catch (error) {
        // Cannot /Get
        res.status(500).json({ message: error.message });
    }
});

// if every check goes fine then print runnning
app.get('/', (req, res) => {
    res.send('Dictionary API is running.');
});

//port number
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
