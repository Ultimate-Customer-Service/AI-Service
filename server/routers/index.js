require("dotenv").config();

const express =  require('express')
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Hello World!')
})

//=====================================================
//============== OPEN AI ASSISTANT LOGIC ==============
//=====================================================
const OpenAI = require('openai')
const { OPENAI_API_KEY, ASSISTANT_ID } = process.env;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
})

const assistantId = ASSISTANT_ID;
let pollingInterval;

async function createThread() {
    console.log('Creating a new thread...');
    const thread = await openai.beta.threads.create();
    return thread;
}

async function addMessage(threadId, message) {
    console.log('Adding a new message to the thread: ' + threadId);
    const response = await openai.beta.threads.messages.create(
        threadId,
        {
            role: "user",
            content: message
        }
    );
    return response;
}

async function runAssistant(threadId) {
    console.log('Running assistant for thread: ' + threadId)
    const response = await openai.beta.threads.runs.create(
        threadId,
        {
            assistant_id: assistantId
        }
    );

    return response;
}

async function checkingStatus(res, threadId, runId) {
    const runObject = await openai.beta.threads.runs.retrieve(
        threadId,
        runId
    );

    const status = runObject.status;
    console.log(runObject);
    console.log('Current status: ' + status);

    if (status == 'completed') {
        clearInterval(pollingInterval)

        const messageList = await openai.beta.threads.messages.list(threadId);
        let messages = []

        messageList.body.data.forEach(message => {
            messages.push(message.content)
        });

        res.json({ messages })
    }
}

/* Creating a new thread */
router.get('/thread', (req, res) => {
    createThread().then(thread => {
        res.json({ threadId: thread.id })
    })
})

/* Send a new message */
router.post('/message', (req, res) => {
    const { message, threadId } = req.body;

    try {
        
        addMessage(threadId, message).then(message => {
            // res.json({ messageId: message.id })
    
            /* Run the assistant */
            runAssistant(threadId).then(run => {
                const runId = run.id
                
                /* Check status */
                pollingInterval = setInterval(() => {
                    checkingStatus(res, threadId, runId);
                }, 5000)
            })
        })
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server' })
    }
})

module.exports = router;