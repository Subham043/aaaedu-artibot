require('dotenv').config()
const express = require('express');
const helmet = require("helmet");
const hpp = require('hpp');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require("node-fetch");

const app = express();

// app.use(function(request, response, next) {

//     if (process.env.NODE_ENV != 'development' && !request.secure) {
//         return response.redirect("https://" + request.headers.host + request.url);
//     }

//     next();
// })

app.use(express.json(
    {
        // verify normally allows us to conditionally abort the parse, but we're using
        // to gain easy access to 'buf', which is a Buffer of the raw request body,
        // which we will need later when we validate the webhook signature
        verify: (req, res, buf) => {
            req.buf = buf;
        }
    }
)); //Used to parse JSON bodies
app.use(express.urlencoded({ extended: false })); //Parse URL-encoded bodies
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(hpp());
const corsOptions = {
    origin: function (origin, callback) {
        callback(null, true)
    }
}
app.use(cors(corsOptions))

const createSignature = (req) => {
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const payload = `${req.method.toUpperCase()}&${url}&${req.buf}`;
    const hmac = crypto.createHmac('sha1', 'AAAEDU@321');
    hmac.update(Buffer.from(payload), 'utf-8');
    return hmac.digest('hex');
};
const verifyWebhookSignature = (req, res, next) => {
    const signature = createSignature(req);
    if (!req.headers["x-artibot-signature"] || signature !== req.headers["x-artibot-signature"].toLowerCase()) {
        return res.status(403).json({
            message: "invalid signature"
        });
    }
    next();
};

const storeData = async (data) => {
    let headersList = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    let bodyContent = JSON.stringify(data);
    
    if(data.status=='created'){
        await fetch("https://aaaedu.in/api/v1/artibot-request/create", { 
            method: "POST",
            body: bodyContent,
            headers: headersList
        });
    }else{
        await fetch("https://aaaedu.in/api/v1/artibot-request/update/"+data.lead_id, { 
            method: "POST",
            body: bodyContent,
            headers: headersList
        });
    }

}

app.get('/artibot/test', async function (req, res) {
    console.log(req);
    return res.status(200).json({
        message: "working"
    });
});

app.post('/artibot/webhook', verifyWebhookSignature, async function (req, res) {
    const data = {
        name: req.body.lead.data?.Name?.input,
        email: req.body.lead.data?.Email?.input,
        phone: req.body.lead.data['Phone Number']?.input,
        multiple_choice_query: req.body.lead.data['Multiple Choice Query']?.input,
        visit_question: req.body.lead.data['Visit Question']?.input,
        admission_question: req.body.lead.data['Admission Question']?.input,
        contact_question: req.body.lead.data['Contact Us Question']?.input,
        course_location_question: req.body.lead.data['Course Location Question']?.input,
        course_standard_question: req.body.lead.data['Course Standard Question']?.input,
        school_course_question: req.body.lead.data['Course Standard Question']?.input=='Online' ? req.body.lead.data['Online Course Question']?.input : (req.body.lead.data['Course Standard Question']?.input=='School (Std. VIII to X)' ? req.body.lead.data['School Course Question']?.input : req.body.lead.data['PUC Course Question']?.input),
        final_callback_question: req.body.lead.data['Finall Call Back Question']?.input!=undefined ? req.body.lead.data['Finall Call Back Question']?.input : (req.body.lead.data['Call Back Question']?.input!=undefined ? req.body.lead.data['Call Back Question']?.input : null),
        schedule_callback_question: req.body.lead.data['Schedule Call Back Question']?.input,
        lead_id: req.body.lead.id,
        page_url: req.body.meta.chat_start_page,
        ip_address: req.body.meta.ip_address,
        country: req.body.meta.location.country,
        latitude: req.body.meta.location.latitude,
        longitude: req.body.meta.location.longitude,
        browser: req.body.meta.browser.name,
        is_mobile: req.body.meta.browser.is_mobile,
        status: req.body.action,
    }
    // console.log("data: ", data);
    await storeData(data);
    return res.status(200).json({
        message: "working"
    });
});

module.exports = app;