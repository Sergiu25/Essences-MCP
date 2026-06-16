const chatForm = document.getElementById('chatForm');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const resultBox = document.getElementById('resultBox');


const API_URL = 'http://localhost:5001/api/chat';

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;


    resultBox.innerHTML = `<strong>You:</strong> ${message}<br><br><em>Thinking...</em>`;
    userInput.value = '';
    sendBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        let htmlResp = `<strong>You:</strong> ${message}<br><br>`;
        if (data.error) {
            htmlResp += `<span style="color:red;">Error: ${data.error}</span>`;
        } else {
            htmlResp += `<strong>Essences AI [Action: ${data.action}]:</strong><br>${data.answer}`;
        }

        resultBox.innerHTML = htmlResp;
    } catch (err) {
        console.error("Fetch error:", err);
        resultBox.innerHTML = `<span style="color:red;">Failed to reach the AI assistant. Ensure MCP Client is running on port 5001. Error: ${err.message}</span>`;
    } finally {
        sendBtn.disabled = false;
    }
});

