const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

let clients = new Set();
let drawingHistory = []; // Store all the drawing actions

server.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);

    // Send the drawing history to the newly connected client
    ws.send(JSON.stringify({ type: 'history', data: drawingHistory }));

    ws.on('message', (message) => {
        console.log('Received:', message);

        const parsedMessage = JSON.parse(message);

        // Handle drawing data
        if (parsedMessage.type === 'draw') {
            drawingHistory.push(parsedMessage.data); // Store the drawing data for history

            // Broadcast the drawing data to all other connected clients
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'draw', data: parsedMessage.data }));
                }
            });
        }

        // Handle clear (reset the canvas)
        if (parsedMessage.type === 'clear') {
            drawingHistory = []; // Reset history
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'clear' }));
                }
            });
        }

        // Handle undo (remove last drawing)
        if (parsedMessage.type === 'undo') {
            drawingHistory.pop(); // Remove last drawing
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'undo' }));
                }
            });
        }

        // Handle eraser (clear part of the canvas)
        if (parsedMessage.type === 'erase') {
            // For erase, we only broadcast the erase action
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'erase', data: parsedMessage.data }));
                }
            });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log('WebSocket server running on ws://localhost:8080');
