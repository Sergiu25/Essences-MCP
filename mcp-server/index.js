import express from 'express';
import cors from 'cors';
import { executeTool, toolDefinitions } from './tools.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/rpc', async (req, res) => {
    const { jsonrpc, id, method, params } = req.body;

    if (jsonrpc !== "2.0") return res.status(400).send({ error: "Invalid JSON-RPC version" });

    if (method === "executeTool") {
        const { toolName, parameters } = params;
        try {
            const result = await executeTool(toolName, parameters);
            res.json({ jsonrpc: "2.0", id, result });
        } catch (error) {
            console.error("Tool execution error:", error.message || error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || error.code || "Unknown error";
            res.json({ jsonrpc: "2.0", id, error: { code: -32603, message: errorMessage } });
        }
    } else if (method === "getTools") {
        res.json({ jsonrpc: "2.0", id, result: toolDefinitions });
    } else {
        res.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`MCP Server running on port ${PORT}`));
