// Gestion des sons
const thrustSound = document.getElementById('thrustSound');
const missileSound = document.getElementById('missileSound');
const explosionSound = document.getElementById('explosionSound');
const backgroundMusic = document.getElementById('backgroundMusic');

// Ajustement du volume
thrustSound.volume = 0.3;
missileSound.volume = 0.4;
explosionSound.volume = 0.5;
backgroundMusic.volume = 0.2;

let isThrustPlaying = false;

function playThrustSound() {
    if (!isThrustPlaying) {
        thrustSound.currentTime = 0;
        thrustSound.play();
        isThrustPlaying = true;
    }
}

function stopThrustSound() {
    if (isThrustPlaying) {
        thrustSound.pause();
        isThrustPlaying = false;
    }
}

function playMissileSound() {
    missileSound.currentTime = 0;
    missileSound.play();
}

function playExplosionSound() {
    explosionSound.currentTime = 0;
    explosionSound.play();
}

function startBackgroundMusic() {
    backgroundMusic.play();
}

// Gestion des erreurs audio
const audioElements = [thrustSound, missileSound, explosionSound, backgroundMusic];
audioElements.forEach(audio => {
    audio.addEventListener('error', (e) => {
        console.error('Erreur de chargement audio:', e);
    });
});

// Démarrer la musique de fond au lancement du jeu
document.addEventListener('click', () => {
    if (isGameStarted) {
        startBackgroundMusic();
    }
}, { once: true });

class SoundManager {
    constructor() {
        this.sounds = {
            thrust: document.getElementById('thrustSound'),
            missile: document.getElementById('missileSound'),
            explosion: document.getElementById('explosionSound'),
            background: document.getElementById('backgroundMusic'),
            warp: document.getElementById('warpSound'),
            alert: document.getElementById('alertSound'),
            hit: document.getElementById('hitSound'),
            powerup: document.getElementById('powerupSound'),
            shield: document.getElementById('shieldSound'),
            engineIdle: document.getElementById('engineIdleSound'),
            engineBoost: document.getElementById('engineBoostSound')
        };

        this.volumes = {
            thrust: 0.4,
            missile: 0.3,
            explosion: 0.5,
            background: 0.2,
            warp: 0.4,
            alert: 0.3,
            hit: 0.4,
            powerup: 0.4,
            shield: 0.4,
            engineIdle: 0.2,
            engineBoost: 0.3
        };

        this.initializeSounds();
    }

    initializeSounds() {
        // Initialiser les volumes
        Object.keys(this.sounds).forEach(key => {
            if (this.sounds[key]) {
                this.sounds[key].volume = this.volumes[key] || 0.5;
            }
        });

        // Démarrer le son du moteur au ralenti
        if (this.sounds.engineIdle) {
            this.sounds.engineIdle.volume = 0;
            this.sounds.engineIdle.play();
        }
    }

    play(soundName, options = {}) {
        const sound = this.sounds[soundName];
        if (!sound) return;

        if (options.loop !== undefined) {
            sound.loop = options.loop;
        }

        if (options.volume !== undefined) {
            sound.volume = options.volume * (this.volumes[soundName] || 1);
        }

        // Pour les sons qui doivent redémarrer même s'ils sont en cours
        if (options.restart) {
            sound.currentTime = 0;
        }

        sound.play().catch(e => console.log('Erreur de lecture audio:', e));
    }

    stop(soundName) {
        const sound = this.sounds[soundName];
        if (!sound) return;

        sound.pause();
        sound.currentTime = 0;
    }

    fadeIn(soundName, duration = 1000) {
        const sound = this.sounds[soundName];
        if (!sound) return;

        sound.volume = 0;
        sound.play();

        const startTime = Date.now();
        const targetVolume = this.volumes[soundName] || 0.5;

        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                sound.volume = targetVolume;
                clearInterval(fadeInterval);
            } else {
                sound.volume = progress * targetVolume;
            }
        }, 50);
    }

    fadeOut(soundName, duration = 1000) {
        const sound = this.sounds[soundName];
        if (!sound) return;

        const startVolume = sound.volume;
        const startTime = Date.now();

        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress >= 1) {
                sound.pause();
                sound.volume = startVolume;
                clearInterval(fadeInterval);
            } else {
                sound.volume = (1 - progress) * startVolume;
            }
        }, 50);
    }

    updateEngineSound(thrust, speed) {
        if (!this.sounds.engineIdle || !this.sounds.engineBoost) return;

        // Ajuster le volume du son du moteur en fonction de la poussée
        const idleVolume = 0.1 + (speed * 0.1);
        const boostVolume = thrust ? 0.3 : 0;

        this.sounds.engineIdle.volume = Math.min(this.volumes.engineIdle, idleVolume);
        this.sounds.engineBoost.volume = Math.min(this.volumes.engineBoost, boostVolume);

        if (thrust && !this.sounds.engineBoost.playing) {
            this.play('engineBoost', { loop: true });
        } else if (!thrust) {
            this.fadeOut('engineBoost', 500);
        }
    }

    playCollisionSound(intensity) {
        // Jouer un son différent selon l'intensité de la collision
        if (intensity > 0.8) {
            this.play('explosion', { volume: intensity });
        } else if (intensity > 0.4) {
            this.play('hit', { volume: intensity });
        }
    }

    startBackgroundMusic() {
        this.fadeIn('background', 2000);
    }

    playAlert() {
        this.play('alert', { restart: true });
    }

    playWarp() {
        this.play('warp', { volume: 0.6 });
    }

    playPowerup() {
        this.play('powerup');
    }

    playShield() {
        this.play('shield');
    }
}

// Créer une instance globale du gestionnaire de sons
const soundManager = new SoundManager();

function startBackgroundMusic() {
    soundManager.startBackgroundMusic();
}

// Fonction pour mettre à jour les sons du moteur
function updateEngineSounds(thrust, speed) {
    soundManager.updateEngineSound(thrust, speed);
} 