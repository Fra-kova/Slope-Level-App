// Translations 
const translations = {
    en: {
        title: "Slope & Level Meter",
        angle: "Angle",
        slope: "Slope",
        start: "Start Measuring",
        stop: "Stop",
        calibrate: "Calibrate",
        setZero: "Set Zero",
        calibrating: "Place device on level surface...",
        calibrated: "Calibration complete!",
        changeUnits: "Change Units"
    },
    es: {
        title: "Medidor de Pendiente y Nivel",
        angle: "Ángulo",
        slope: "Pendiente",
        start: "Comenzar",
        stop: "Detener",
        calibrate: "Calibrar",
        setZero: "Fijar Cero",
        calibrating: "Coloque el dispositivo en una superficie plana...",
        calibrated: "¡Calibración completa!",
        changeUnits: "Cambiar Unidades"
    }
};

// Constants
const SMOOTHING = 0.8;
const MAX_ANGLE = 20;
const CALIBRATION_SAMPLES = 10;

// State variables
let currentLanguage = 'en';
let currentUnit = 'degree';
let isCalibrating = false;
let isMeasuring = false;
let calibrationOffset = 0;
let lastAngle = 0;
let calibrationReadings = [];

// Helper to check device support and permissions
async function checkDeviceSupport() {
    if (!window.DeviceOrientationEvent) {
        console.error('Device orientation not supported');
        return false;
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting device permission:', error);
            return false;
        }
    }
    
    return true;
}

// Debug function to monitor sensor data
function debugOrientation(event) {
    console.log(`[${new Date().toISOString()}] Orientation:`, {
        alpha: event?.alpha?.toFixed(2) || 'null',
        beta: event?.beta?.toFixed(2) || 'null',
        gamma: event?.gamma?.toFixed(2) || 'null',
        orientation: window.screen.orientation.type
    });
}

// Start measuring function
async function startMeasuring() {
    if (isMeasuring) {
        stopMeasuring();
        return;
    }

    const hasSupport = await checkDeviceSupport();
    if (!hasSupport) {
        // Could add UI feedback here
        return;
    }

    enableMeasuring();
}

// Enable measuring function
function enableMeasuring() {
    console.log('Enabling measurement system...');
    isMeasuring = true;
    lastAngle = null;
    
    const startButton = document.getElementById('startButton');
    startButton.textContent = translations[currentLanguage].stop;

    let lastValidReading = Date.now();
    const TIMEOUT_THRESHOLD = 1000; // 1 second timeout

    function orientationHandler(event) {
        if (!event) return;
        
        lastValidReading = Date.now();
        handleOrientation(event);
    }

    // Add reading timeout check
    const timeoutChecker = setInterval(() => {
        if (isMeasuring && (Date.now() - lastValidReading > TIMEOUT_THRESHOLD)) {
            console.warn('No sensor readings received for 1 second');
            // Could add UI feedback here
        }
    }, TIMEOUT_THRESHOLD);

    window.addEventListener('deviceorientation', orientationHandler);
    
    // Store references for cleanup
    window.currentOrientationHandler = orientationHandler;
    window.currentTimeoutChecker = timeoutChecker;
}

// Stop measuring function
function stopMeasuring() {
    console.log('Stopping measurement system...');
    isMeasuring = false;
    
    // Clean up event listeners and intervals
    if (window.currentOrientationHandler) {
        window.removeEventListener('deviceorientation', window.currentOrientationHandler);
        window.currentOrientationHandler = null;
    }
    
    if (window.currentTimeoutChecker) {
        clearInterval(window.currentTimeoutChecker);
        window.currentTimeoutChecker = null;
    }
    
    const startButton = document.getElementById('startButton');
    startButton.textContent = translations[currentLanguage].start;
    
    resetUI();
}

// Reset UI helper
function resetUI() {
    const bubble = document.getElementById('bubble');
    bubble.style.left = '50%';
    bubble.classList.remove('off-level');
    
    document.getElementById('angle').textContent = '0.0';
    document.getElementById('slope').textContent = '0.0';
    
    lastAngle = null;
}

// Handle orientation function
function handleOrientation(event) {
    if (!isMeasuring || !event) return;

    let angle;
    const isLandscape = window.screen.orientation.type.includes('landscape');
    
    try {
        // Get base angle from correct axis
        if (isLandscape) {
            angle = event.gamma || 0;
            // Handle device being upside down in landscape
            if (Math.abs(event.beta || 0) > 90) {
                angle = -angle;
            }
        } else {
            angle = event.beta || 0;
            // Handle device being upside down in portrait
            if (Math.abs(event.gamma || 0) > 90) {
                angle = 180 - angle;
            }
        }

        // Validate angle
        if (isNaN(angle)) {
            console.warn('Invalid angle reading');
            return;
        }

        // Apply calibration
        angle -= calibrationOffset;
        
        // Enhanced smoothing with spike detection
        if (typeof lastAngle === 'number' && !isNaN(lastAngle)) {
            const change = Math.abs(angle - lastAngle);
            if (change > 45) {
                console.warn('Detected sensor spike:', change);
                return;
            }
            angle = lastAngle * SMOOTHING + angle * (1 - SMOOTHING);
        }
        
        // Clamp angle to reasonable range
        angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
        
        lastAngle = angle;

        // Optimize UI updates
        requestAnimationFrame(() => updateMeasurements(angle));
    } catch (error) {
        console.error('Error in handleOrientation:', error);
    }
}

