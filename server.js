const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

let clients = new Set();
// drawingHistory tárolja a stroke-okat és a fill parancsokat is
let drawingHistory = [];
let clientColors = {};  // Ez tárolja az egyes kliensek színét

server.on('connection', (ws) => {
    console.log('New client connected');

    // Egyedi azonosító a kliensnek
    const clientId = ws._socket.remoteAddress + ":" + ws._socket.remotePort;
    const color = getRandomColor();
    clientColors[clientId] = color;

    // Küldjük el a klienseknek a saját színt
    ws.send(JSON.stringify({ type: 'color', color: color }));

    clients.add(ws);

    // Új kliensnek küldjük el a teljes history-t
    ws.send(JSON.stringify({ type: 'history', data: drawingHistory }));

    ws.on('message', (message) => {
        console.log('Received:', message);
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'draw') {
            // Élő rajzolás: broadcastoljuk a szegmens adatokat
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'draw', data: parsedMessage.data }));
                }
            });
        }

        if (parsedMessage.type === 'finalize') {
            // Tároljuk a teljes stroke-ot, majd broadcastoljuk
            const stroke = parsedMessage.data.stroke;
            drawingHistory.push(stroke);
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'finalize', data: { stroke } }));
                }
            });
        }

        if (parsedMessage.type === 'clear') {
            drawingHistory = [];
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'clear' }));
                }
            });
        }

        if (parsedMessage.type === 'undo') {
            const strokeId = parsedMessage.data.strokeId;
            drawingHistory = drawingHistory.filter(stroke => stroke.id !== strokeId);
            clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'undo', data: { strokeId } }));
                }
            });
        }

        // Új ág a fill parancshoz
        if (parsedMessage.type === "fill") {
            const fillData = {
                type: "fill",
                x: parsedMessage.data.x,
                y: parsedMessage.data.y,
                color: parsedMessage.data.color
            };
            drawingHistory.push(fillData);
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'fill', data: fillData }));
                }
            });
        }

        if (parsedMessage.type === "chat") {
            // A küldő színét is hozzáadjuk az üzenethez
            parsedMessage.data.color = clientColors[clientId];
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsedMessage));
                }
            });
        }        
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        delete clientColors[clientId];
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Segédfüggvény a véletlenszerű szín generálásához
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

console.log('WebSocket server running on ws://localhost:8080');
