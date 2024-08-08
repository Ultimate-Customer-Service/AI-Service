require("dotenv").config();
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World!");
});

//=====================================================
//============== OPEN AI ASSISTANT LOGIC ==============
//=====================================================
const OpenAI = require("openai");
const { OPENAI_API_KEY, ASSISTANT_ID, COLLABORATOR_ID } = process.env;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const collaborator = new OpenAI({
  apiKey: COLLABORATOR_ID
});

const assistantId = ASSISTANT_ID;
let pollingInterval;

async function createThread() {
  console.log("Creating a new thread...");
  const thread = await openai.beta.threads.create();
  return thread;
}

async function addMessage(threadId, message, res) {
    console.log("Adding a new message to the thread: " + threadId);

    // Convert message to lowercase for case-insensitive matching
    const lowerCaseMessage = message.toLowerCase();

    // Example product database for demonstration
    const products = {
        "product x": { name: "Product X", price: "$99.99", availability: "In Stock" },
        "product y": { name: "Product Y", price: "$149.99", availability: "Out of Stock" }
    };

    // Check if the message is asking for a specific product
    const productInfo = Object.entries(products).find(([key]) => lowerCaseMessage.includes(key));

    if (productInfo) {
        const [productName, details] = productInfo;
        const productMessage = `The product '${details.name}' is priced at ${details.price} and is currently ${details.availability}.`;
        
        // Record the user's message and product information in the conversation history
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: message,
        });
        await openai.beta.threads.messages.create(threadId, {
            role: "assistant",
            content: productMessage,
        });

        res.json({
            messages: [productMessage]
        });
        return; // Exit the function after handling the product query
    }

    // If not a product query, proceed with normal conversation handling
    const userMessageResponse = await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: message,
    });
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
    });

    // Check the assistant's response status
    pollingInterval = setInterval(async () => {
        const runObject = await openai.beta.threads.runs.retrieve(threadId, run.id);
        const status = runObject.status;
        console.log(runObject);
        console.log("Current status: " + status);

        if (status === "completed") {
            clearInterval(pollingInterval);

            const messageList = await openai.beta.threads.messages.list(threadId);
            let messages = [];

            messageList.body.data.forEach((message) => {
                messages.push(message.content);
            });

            res.json({ messages });
        }
    }, 5000);
}



async function runAssistant(threadId) {
  console.log("Running assistant for thread: " + threadId);
  const response = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId,
  });
  return response;
}

async function checkingStatus(res, threadId, runId) {
  const runObject = await openai.beta.threads.runs.retrieve(threadId, runId);
  const status = runObject.status;
  console.log(runObject);
  console.log("Current status: " + status);

  if (status == "completed") {
    clearInterval(pollingInterval);

    const messageList = await openai.beta.threads.messages.list(threadId);
    let messages = [];

    messageList.body.data.forEach((message) => {
      messages.push(message.content);
    });

    res.json({ messages });
  }
}

/* Creating a new thread */
router.get("/thread", (req, res) => {
  createThread().then((thread) => {
    res.json({ threadId: thread.id });
  });
});

/* Send a new message */
router.post("/message", (req, res) => {
  const { message, threadId } = req.body;

  try {
    addMessage(threadId, message, res).then((message) => {
      // If product search is handled, don't continue to OpenAI
      if (!message) return;

      /* Run the assistant */
      runAssistant(threadId).then((run) => {
        const runId = run.id;

        /* Check status */
        pollingInterval = setInterval(() => {
          checkingStatus(res, threadId, runId);
        }, 5000);
      });
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Internal Server" });
  }
});

module.exports = router;
