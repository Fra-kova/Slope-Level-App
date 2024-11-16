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

// Add this function before the getOrientationReading function:

// Update measurements display
function updateMeasurements(angle) {
    // Update angle display
    document.getElementById('angle').textContent = Math.abs(angle).toFixed(1);
    
    // Update slope display (1 degree = 0.2085 inches per foot)
    const slopeInchesPerFoot = Math.abs(Math.tan(angle * Math.PI / 180) * 12).toFixed(1);
    document.getElementById('slope').textContent = slopeInchesPerFoot;
    
    // Update bubble position
    const bubble = document.getElementById('bubble');
    const maxDisplacement = 100; // Maximum percentage displacement from center
    const displacement = (angle / MAX_ANGLE) * maxDisplacement;
    const leftPosition = 50 + displacement; // 50 is the center position
    
    bubble.style.left = `${Math.max(0, Math.min(100, leftPosition))}%`;
    
    // Add/remove off-level class based on angle
    if (Math.abs(angle) > 0.5) {
        bubble.classList.add('off-level');
    } else {
        bubble.classList.remove('off-level');
    }
}

// [Rest of your existing code stays the same]

// Get orientation reading based on device orientation
function getOrientationReading(event) {
    if (!event) return null;

    const isLandscape = window.screen.orientation.type.includes('landscape');
    let angle;

    if (isLandscape) {
        angle = event.gamma || 0;
        if (Math.abs(event.beta || 0) > 90) {
            angle = -angle;
        }
    } else {
        angle = event.beta || 0;
        if (Math.abs(event.gamma || 0) > 90) {
            angle = 180 - angle;
        }
    }

    return isNaN(angle) ? null : angle;
}

// Start calibration process
async function startCalibration() {
    if (!await checkDeviceSupport()) {
        console.error('Device sensors not available for calibration');
        return;
    }

    const calibrateButton = document.getElementById('calibrateButton');
    const statusElement = document.getElementById('calibrationStatus');
    
    // Reset calibration state
    isCalibrating = true;
    calibrationReadings = [];
    
    // Update UI
    calibrateButton.classList.add('calibrating');
    statusElement.textContent = translations[currentLanguage].calibrating;
    
    // Start collecting calibration samples
    let calibrationHandler;
    
    const cleanupCalibration = () => {
        window.removeEventListener('deviceorientation', calibrationHandler);
        isCalibrating = false;
        calibrateButton.classList.remove('calibrating');
    };

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanupCalibration();
            statusElement.textContent = 'Calibration timeout - please try again';
            reject(new Error('Calibration timeout'));
        }, 10000); // 10 second timeout

        calibrationHandler = (event) => {
            if (!isCalibrating) return;
            
            try {
                const reading = getOrientationReading(event);
                if (reading !== null) {
                    calibrationReadings.push(reading);
                    
                    // Once we have enough samples, process them
                    if (calibrationReadings.length >= CALIBRATION_SAMPLES) {
                        clearTimeout(timeout);
                        processCalibrationData();
                        cleanupCalibration();
                        statusElement.textContent = translations[currentLanguage].calibrated;
                        resolve();
                    }
                }
            } catch (error) {
                console.error('Error during calibration:', error);
                cleanupCalibration();
                statusElement.textContent = 'Calibration error - please try again';
                reject(error);
            }
        };

        window.addEventListener('deviceorientation', calibrationHandler);
    });
}

// Process collected calibration data
function processCalibrationData() {
    if (calibrationReadings.length === 0) return;

    // Remove outliers using IQR method
    const sorted = [...calibrationReadings].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const validReadings = sorted.filter(x => 
        x >= q1 - 1.5 * iqr && 
        x <= q3 + 1.5 * iqr
    );

    // Calculate new offset as mean of valid readings
    if (validReadings.length > 0) {
        calibrationOffset = validReadings.reduce((a, b) => a + b, 0) / validReadings.length;
        
        // Save calibration to localStorage
        try {
            localStorage.setItem('slopeMeterCalibration', JSON.stringify({
                offset: calibrationOffset,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to save calibration:', e);
        }
    }
}

// Load saved calibration on startup
function loadCalibration() {
    try {
        const saved = localStorage.getItem('slopeMeterCalibration');
        if (saved) {
            const { offset, timestamp } = JSON.parse(saved);
            // Only use calibration if it's less than 24 hours old
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                calibrationOffset = offset;
                return true;
            }
        }
    } catch (e) {
        console.warn('Failed to load calibration:', e);
    }
    return false;
}

// Add vibration feedback during calibration
function vibrateDevice(pattern) {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.warn('Vibration failed:', e);
        }
    }
}

// Initialize calibration on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCalibration();
});
