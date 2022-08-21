'use strict';

/**
 * Imports
 */
import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import { Bannerbear } from 'bannerbear';
import probe from 'probe-image-size';

/**
 * Clients
 */
const twilioClient = twilio(process.env.TWILIO_API_KEY, 
    process.env.TWILIO_API_KEY_SECRET, 
    { accountSid: process.env.TWILIO_ACCOUNT_SID });

const bbClient = new Bannerbear(process.env.BANNER_BEAR_API_KEY);

/**
 * Express
 */
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const PORT = process.env.PORT || 8080;

app.post('/caption', async (req, res) => {
    try {
        const {headers, body} = req;

        if (process.env.NODE_ENV === 'production') {
            const twilioSignature = headers['x-twilio-signature'];
            const url = `${process.env.PRODUCTION_BASE_URL}/caption`;
            const requestIsValid = twilio.validateRequest(
                process.env.TWILIO_AUTH_TOKEN,
                twilioSignature,
                url,
                body
            );

            if(!requestIsValid) {
                return res.status(403).send('Forbidden');
            }
        }

        res.send('<Response></Response>');
        await driver(body);
    } catch (e) {
        console.error(`An error has occurred: \n${e}`);
        return res.status(500).send('Internal Server Error');
    }
});

const driver = async ({To, From, Body, ImageURL}) => {
    try {
        console.log(`Body: ${Body}`);
        console.log(`ImageURLs: ${ImageURL}`);

        const probeImageResult = await probe(ImageURL);
        const bbTemplateId = getAppropriateTemplateId(probeImageResult);
        const bbImage = await bbClient.create_image(
            bbTemplateId, {
                modifications: [
                    {
                        name: "image",
                        image_url: ImageURL
                    },
                    {
                        "name": "title",
                        "text": Body
                    }
                ]
            }, true
        );

        const {image_url_png, uid} = bbImage;

        console.log(`bbImageUID: ${uid}`);

        const twilioSMSResponse = await twilioClient.messages.create({
            to: From,
            from: To,
            mediaUrl: image_url_png,
        });

        const {sid} = twilioSMSResponse;

        console.log(`sid: ${sid}`);

        
        return sid;
    } catch(e) {
        console.error(`An error has occurred in the driver method. \n${e}`);
        await twilioClient.messages.create({
            to: From,
            from: To,
            body: 'Sorry, it looks like an error has occurred. Please try again later.'
        });
        throw e;
    }
}

const getAppropriateTemplateId = ({width, height}) => {
    let bbTemplateId;

    if(width > height) {
        // Landscape
        bbTemplateId = process.env.BANNER_BEAR_LANDSCAPE_TEMPLATE_ID;
    } else if(width < height) {
        // Portrait
        bbTemplateId = process.env.BANNER_BEAR_PORTRAIT_TEMPLATE_ID;
    } else {
        // Square
        bbTemplateId = process.env.BANNER_BEAR_SQUARE_TEMPLATE_ID;
    }

    return bbTemplateId;
}

app.listen(PORT, () => console.log(`Listening on ${PORT}.\nNode Environment is on ${process.env.NODE_ENV} mode.`));