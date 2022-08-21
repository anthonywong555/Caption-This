//'use strict';

/**
 * Imports
 */
import 'dotenv/config';
import twilio from 'twilio';
import express from 'express';
import probe from 'probe-image-size';

/**
 * Clients
 */
const twilioClient = twilio(process.env.TWILIO_API_KEY, 
    process.env.TWILIO_API_KEY_SECRET, 
    { accountSid: process.env.TWILIO_ACCOUNT_SID });

/**
 * Express
 */
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/caption', async (req, res) => {
    const result = await probe('http://example.com/test.jpg');
    res.send(result);
});

app.listen(PORT, () => console.log(`Listening on ${PORT}.\nNode Environment is on ${process.env.NODE_ENV} mode.`));