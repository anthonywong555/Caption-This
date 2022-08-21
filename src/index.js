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
        const {headers, body, params} = req;

        console.log(`headers`, headers);
        console.log(`body`, body);
        console.log(`params`, params);
        if (process.env.NODE_ENV === 'production') {
            const twilioSignature = headers['x-twilio-signature'];
            const url = `${process.env.PRODUCTION_BASE_URL}/caption`;
            console.log(`url: ${url}`);
            console.log(`twilioSignature: ${twilioSignature}`);
            const requestIsValid = twilio.validateRequest(
                process.env.TWILIO_AUTH_TOKEN,
                twilioSignature,
                url,
                params
            );
            console.log(`requestIsValid: ${requestIsValid}`);

            if(!requestIsValid) {
                return res.status(403).send('Forbidden');
            }
        }

        res.send('<Response></Response>');
        //await driver(body);
    } catch (e) {
        console.error(`An error has occurred: \n${e}`);
        return res.status(500).send('Internal Server Error');
    }
});

const driver = async ({To, From, Body, ImageURLs}) => {
    try {
        console.log(`Body: ${Body}`);
        console.log(`ImageURLs: ${ImageURLs}`);

        const bbPromises = ImageURLs.map(async(anImageURL) => {
            const probeImageResult = await probe(anImageURL);
            const bbTemplateId = getAppropriateTemplateId(probeImageResult);
            const bbImage = await bbClient.create_image(
                bbTemplateId, {
                    modifications: [
                        {
                            name: "image",
                            image_url: anImageURL
                        },
                        {
                            "name": "title",
                            "text": Body
                        }
                    ]
                }, true
            );
            return bbImage;
        });

        const bbResults = await Promise.all(bbPromises);
        const bbPNGImageUrls = bbResults.map((bbResult) => bbResult.image_url_png);
        const bbImageUIDs = bbResults.map((bbImage) => bbImage.uid);

        console.log(`bbImageUIDs: ${bbImageUIDs}`);

        const twilioSMSPromises = bbPNGImageUrls.map(async(mediaUrl) => {
            const sms = await twilioClient.messages.create({
                mediaUrl,
                to: From,
                from: To,
            });
            return sms;
        });

        const twilioSMSResponses  = await Promise.all(twilioSMSPromises);
        const twilioSMSSIDs = twilioSMSResponses.map((aSMSResponse) => aSMSResponse.sid);
        console.log(`twilioSMSSIDs: ${twilioSMSSIDs}`);

        return twilioSMSSIDs;
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