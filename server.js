const WebSocket = require('ws');
const http = require('http');

// Tworzenie serwera HTTP
const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('pong');
        console.log('Ping? Pong!');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const wss = new WebSocket.Server({ server });

let clients = [];

let timers = {};
let timerStartTimes = {};
let timerInfo = {};
let disabledButtons = {};

function syncTimersToClients(client) {
    // Oblicz pozostały czas dla każdego timera
    const currentTimers = {};
    for (const monsterId in timers) {
        const elapsed = Math.floor((Date.now() - timerStartTimes[monsterId]) / 1000);
        currentTimers[monsterId] = timers[monsterId] - elapsed;
    }

    // Wysyłanie stanu wszystkich timerów do nowego klienta
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'sync', timers: currentTimers, timerInfo, disabledButtons }));
    }
}

wss.on('connection', (ws) => {
    console.log('Nowe połączenie WebSocket');

    // Dodaj klienta do listy
    clients.push(ws);

    // Synchronizuj stan timerów z nowym klientem
    syncTimersToClients(ws);
    
    // Odbiór wiadomości od klienta
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message); // Parsowanie wiadomości JSON
            console.log('Otrzymano wiadomość:', parsedMessage);

            // Aktualizuj stan na serwerze
            switch (parsedMessage.type) {
                case 'start':
                    timers[parsedMessage.monsterId] = parsedMessage.duration;
                    timerStartTimes[parsedMessage.monsterId] = Date.now();
                    disabledButtons[parsedMessage.monsterId] = true;
                    break;
                case 'reset':
                    delete timers[parsedMessage.monsterId];
                    delete timerStartTimes[parsedMessage.monsterId];
                    delete timerInfo[parsedMessage.monsterId];
                    disabledButtons[parsedMessage.monsterId] = false;
                    break;
                case 'clear':
                    delete timerInfo[parsedMessage.monsterId];
                    break;
                case 'updateInfo':
                    timerInfo[parsedMessage.monsterId] = parsedMessage.info;
                    break;
                default:
                    console.error('Nieznany typ wiadomości:', parsedMessage.type);
            }

            // Rozsyłanie wiadomości do wszystkich klientów
            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsedMessage)); // Wysyłanie wiadomości w formacie JSON
                }
            });
        } catch (error) {
            console.error('Błąd podczas parsowania wiadomości:', error);
        }
    });

    // Usuwanie klienta po rozłączeniu
    ws.on('close', () => {
        console.log('Klient rozłączony');
        clients = clients.filter((client) => client !== ws);
    });
});

// Start serwera
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});