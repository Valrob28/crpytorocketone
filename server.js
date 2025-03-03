const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Activation de la compression gzip
app.use(compression());

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Variables pour stocker l'état du jeu
const players = new Map();
const missiles = new Map();

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    console.log('Nouveau joueur connecté:', socket.id);

    // Gestion de la connexion d'un joueur
    socket.on('playerJoin', (data) => {
        players.set(socket.id, {
            id: socket.id,
            pseudo: data.pseudo,
            position: data.position,
            rotation: data.rotation
        });

        // Envoyer la liste des joueurs au nouveau joueur
        socket.emit('players', Array.from(players.values()));
        
        // Informer les autres joueurs
        socket.broadcast.emit('playerJoined', {
            id: socket.id,
            pseudo: data.pseudo,
            position: data.position,
            rotation: data.rotation
        });
    });

    // Mise à jour de la position
    socket.on('updatePosition', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = data.position;
            player.rotation = data.rotation;
            player.velocity = data.velocity;
            socket.broadcast.emit('playerMoved', {
                id: socket.id,
                position: data.position,
                rotation: data.rotation,
                velocity: data.velocity
            });
        }
    });

    // Gestion des tirs de missiles
    socket.on('fireMissile', (data) => {
        const missileId = Date.now().toString();
        missiles.set(missileId, {
            id: missileId,
            playerId: socket.id,
            position: data.position,
            direction: data.direction,
            timestamp: Date.now()
        });

        // Informer tous les joueurs du tir
        io.emit('missilesFired', {
            missileId,
            playerId: socket.id,
            position: data.position,
            direction: data.direction
        });
    });

    // Gestion des collisions
    socket.on('missileHit', (data) => {
        io.emit('playerHit', {
            targetId: data.targetId,
            damage: data.damage
        });
    });

    // Déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log('Joueur déconnecté:', socket.id);
        players.delete(socket.id);
        io.emit('playerDisconnected', socket.id);
    });
});

// Nettoyage périodique des missiles expirés
setInterval(() => {
    const now = Date.now();
    missiles.forEach((missile, id) => {
        if (now - missile.timestamp > 5000) { // 5 secondes de durée de vie
            missiles.delete(id);
        }
    });
}, 1000);

// Configuration du port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
}); 