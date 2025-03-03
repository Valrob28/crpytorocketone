class Joystick {
    constructor(options) {
        this.options = {
            zone: options.zone || document.body,
            size: options.size || 100,
            color: options.color || '#30f2f2',
            backgroundColor: options.backgroundColor || 'rgba(0, 0, 0, 0.5)',
            lockX: options.lockX || false,
            lockY: options.lockY || false
        };

        this.active = false;
        this.value = { x: 0, y: 0 };
        this.position = { x: 0, y: 0 };
        this.offset = { x: 0, y: 0 };
        this.maxDistance = this.options.size / 2;
        
        this.createElements();
        this.bindEvents();
    }

    createElements() {
        // Conteneur principal
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            background: ${this.options.backgroundColor};
            border: 2px solid ${this.options.color};
            border-radius: 50%;
            touch-action: none;
            user-select: none;
        `;

        // Stick (partie mobile)
        this.stick = document.createElement('div');
        this.stick.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${this.options.size * 0.4}px;
            height: ${this.options.size * 0.4}px;
            background: ${this.options.color};
            border-radius: 50%;
            transition: transform 0.1s ease;
        `;

        this.container.appendChild(this.stick);
        document.body.appendChild(this.container);
    }

    bindEvents() {
        // Support tactile et souris
        this.container.addEventListener('mousedown', this.start.bind(this));
        this.container.addEventListener('touchstart', this.start.bind(this));
        document.addEventListener('mousemove', this.move.bind(this));
        document.addEventListener('touchmove', this.move.bind(this));
        document.addEventListener('mouseup', this.end.bind(this));
        document.addEventListener('touchend', this.end.bind(this));
    }

    start(e) {
        this.active = true;
        const touch = e.type === 'mousedown' ? e : e.touches[0];
        const rect = this.container.getBoundingClientRect();
        this.offset.x = rect.left + this.options.size / 2;
        this.offset.y = rect.top + this.options.size / 2;
        this.move(e);
    }

    move(e) {
        if (!this.active) return;

        e.preventDefault();
        const touch = e.type === 'mousemove' ? e : e.touches[0];

        const x = touch.clientX - this.offset.x;
        const y = touch.clientY - this.offset.y;
        const distance = Math.min(Math.sqrt(x * x + y * y), this.maxDistance);
        const angle = Math.atan2(y, x);

        const posX = Math.cos(angle) * distance;
        const posY = Math.sin(angle) * distance;

        this.position = {
            x: this.options.lockX ? 0 : posX,
            y: this.options.lockY ? 0 : posY
        };

        this.value = {
            x: this.position.x / this.maxDistance,
            y: this.position.y / this.maxDistance
        };

        this.updateStickPosition();
    }

    end() {
        if (!this.active) return;
        this.active = false;
        this.value = { x: 0, y: 0 };
        this.position = { x: 0, y: 0 };
        this.updateStickPosition();
    }

    updateStickPosition() {
        this.stick.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
    }

    getValues() {
        return this.value;
    }

    isActive() {
        return this.active;
    }

    // Création d'un second joystick pour le contrôle de la propulsion
    static createThrustJoystick() {
        return new Joystick({
            zone: document.body,
            size: 100,
            color: '#ff6600',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            lockX: true,
            position: { right: '20px', bottom: '20px' }
        });
    }
}

// Création des joysticks pour mobile
let rotationJoystick, thrustJoystick;

function initJoysticks() {
    if (isMobile()) {
        rotationJoystick = new Joystick({
            size: 150,
            color: '#30f2f2'
        });

        thrustJoystick = Joystick.createThrustJoystick();
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Mise à jour des contrôles en fonction des valeurs des joysticks
function updateJoystickControls() {
    if (!isMobile() || !rotationJoystick || !thrustJoystick) return;

    const rotation = rotationJoystick.getValues();
    const thrust = thrustJoystick.getValues();

    // Mise à jour de la rotation
    if (Math.abs(rotation.x) > 0.1) {
        keys.KeyD = rotation.x > 0;
        keys.KeyA = rotation.x < 0;
    } else {
        keys.KeyD = keys.KeyA = false;
    }

    if (Math.abs(rotation.y) > 0.1) {
        keys.KeyS = rotation.y > 0;
        keys.KeyW = rotation.y < 0;
    } else {
        keys.KeyS = keys.KeyW = false;
    }

    // Mise à jour de la propulsion
    keys.Space = thrust.y < -0.5;
} 