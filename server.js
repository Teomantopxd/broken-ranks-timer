const WebSocket = require('ws');
const http = require('http');

// Tworzenie serwera HTTP
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
    console.log('Nowe połączenie WebSocket');

    // Dodaj klienta do listy
    clients.push(ws);

    // Odbiór wiadomości od klienta
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message); // Parsowanie wiadomości JSON
            console.log('Otrzymano wiadomość:', parsedMessage);

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
