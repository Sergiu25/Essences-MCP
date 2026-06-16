import Groq from 'groq-sdk';
import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const modelName = process.env.MODEL || 'llama-3.3-70b-versatile';
const temperature = parseFloat(process.env.TEMPERATURE) || 0;
const baseURL = process.env.BASE_URL;

let client;
if (baseURL) {
    client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: baseURL
    });
} else {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:5000/rpc';

let conversationHistory = [];


async function getAvailableTools() {
    try {
        const res = await axios.post(MCP_SERVER_URL, {
            jsonrpc: "2.0", id: 1, method: "getTools", params: {}
        });
        return res.data.result;
    } catch (err) {
        console.error("Error fetching tools from MCP Server:", err.message);
        throw new Error("Unable to connect to the MCP Server.");
    }
}

export async function handleUserQuery(userQuery) {
    let tools;
    try {
        tools = await getAvailableTools();
    } catch (err) {
        return { answer: "Sorry, I am currently unable to access the tool registry." };
    }

    const historyString = conversationHistory.length > 0
        ? "\nRecent Conversation History:\n" + conversationHistory.map(h => `User: ${h.user}\nAssistant: ${h.bot}`).join("\n\n") + "\n"
        : "";

    const prompt = `
You are a routing assistant for a perfume review database.

Database structure:
- Products: { id, name, brand, category, price, description }
- Reviews: { id, productId, authorName, ratingValue, reviewBody, datePublished }

Available tools: ${JSON.stringify(tools)}
${historyString}
User query: "${userQuery}"

Instructions:
- If the user asks to query products by brand, use getProductsByBrand.
- For queries about reviews of a *specific* product, use getReviewsByProductName.
- If the user filters over or above a rating, use getProductsWithMinRating.
- If the user asks to add a review, infer the correct tool based on the product name:
    - For "Sauvage" (or ID "1"), use addReviewToProduct. Pass "productId" as a string ("1"), and "review" as an OBJECT containing { "authorName", "ratingValue", "reviewBody", "datePublished" }.
    - For "Santal 33", use addReviewInGql (requires productName, authorName, ratingValue, reviewBody, datePublished).
    - For "Tobacco Vanille", use addReviewInRdf (requires productName, authorName, ratingValue, reviewBody, datePublished).
- If the query includes both brand and name, extract just the relevant parameters for the tool.
- Based on the tools available, pick the best tool and exactly specify its parameters as a structured JSON object.
- Return ONLY valid JSON matching this schema:
{
  "selectedTool": "toolName",
  "parameters": { "param1": "value1" }
}
Do not return any markdown wrappers like \`\`\`json. Just the raw JSON. IMPORTANT: Make sure 'ratingValue' is a Number (e.g. 4.8), NOT a string.
`;

    let result;
    try {
        result = await client.chat.completions.create({
            messages: [
                { role: "user", content: prompt }
            ],
            model: modelName,
            temperature: temperature,
            response_format: { type: "json_object" }
        });
    } catch (err) {
        console.error("Error communicating with AI service:", err.message);
        return { answer: "Sorry, I am currently unable to process your request due to an AI service error. Please check your API key." };
    }

    let responseText = result.choices[0]?.message?.content || "";
    responseText = responseText.trim();


    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) {
        responseText = jsonMatch[1].trim();
    }

    let llmDecision;
    try {
        llmDecision = JSON.parse(responseText);
    } catch (err) {
        console.error("Failed to parse LLM JSON:", responseText, "Error:", err.message);
        return { answer: "Sorry, I couldn't understand how to process your request." };
    }

    if (!llmDecision.selectedTool) {
        return { answer: "I couldn't identify the right action for your request." };
    }


    const rpcPayload = {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "executeTool",
        params: {
            toolName: llmDecision.selectedTool,
            parameters: llmDecision.parameters
        }
    };

    let rpcResponse;
    try {
        rpcResponse = await axios.post(MCP_SERVER_URL, rpcPayload);
    } catch (err) {
        console.error(`Error executing MCP tool (${llmDecision.selectedTool}):`, err.message);
        return {
            answer: "Sorry, I encountered a connection error while executing the requested action.",
            action: llmDecision.selectedTool
        };
    }

    if (rpcResponse.data.error) {
        const errMsg = rpcResponse.data.error.message || JSON.stringify(rpcResponse.data.error);
        return {
            answer: `Error executing operation: ${errMsg}`,
            action: llmDecision.selectedTool
        };
    }

    const toolExecutionResult = rpcResponse.data.result;


    const formatPrompt = `
You are a friendly customer service AI for the 'Essences' perfume shop.
Provide a natural language, conversation-style response answering the user's original query. 
Do NOT include internal thoughts, code comments, or placeholder variables like '%s'. 
Do NOT explain your formatting process. Just write the final message directly.

${historyString}

Original query: "${userQuery}"
Data returned by the system:
${JSON.stringify(toolExecutionResult, null, 2)}

If the data is empty or indicates no results, politely say we couldn't find any items. 
If the user added a review or data (the tool returned a success message or an ID), confirm the addition in a SINGLE short sentence. DO NOT hallucinate other reviews, do not recommend other products, and do not add filler text.
If the user is asking for "more", "others", or follow-ups, deliberately analyze the 'Recent Conversation History' and DO NOT repeat the exact same reviews or products you previously mentioned. Pick different ones from the data returned by the system to ensure variety.
Always use HTML formatting natively (like <br> for new lines or <strong> for bold text) to ensure it renders beautifully on our web app.
Do NOT invent or hallucinate URLs or redirect the user to non-existent links like "read more here". Present the raw facts precisely and entirely in your message based ONLY on the data returned.
`;
    try {
        const finalResult = await client.chat.completions.create({
            messages: [
                { role: "user", content: formatPrompt }
            ],
            model: modelName,
            temperature: temperature
        });

        const generatedAnswer = finalResult.choices[0]?.message?.content || "";


        conversationHistory.push({ user: userQuery, bot: generatedAnswer });
        if (conversationHistory.length > 5) conversationHistory.shift();

        return { answer: generatedAnswer, action: llmDecision.selectedTool };
    } catch (err) {
        console.error("Error generating final response:", err.message);
        return {
            answer: "I fetched the information, but encountered an error formatting it for you.",
            action: llmDecision.selectedTool
        };
    }
}