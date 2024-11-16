// Add these constants at the top with your other constants
const DEVICE_SUPPORT = {
    orientation: false,
    motion: false
};

// Enhanced device capability detection
function checkDeviceCapabilities() {
    return new Promise((resolve) => {
        // Check for orientation support
        if (window.DeviceOrientationEvent) {
            DEVICE_SUPPORT.orientation = true;
        }
        
        // Check for motion support
        if (window.DeviceMotionEvent) {
            DEVICE_SUPPORT.motion = true;
        }

        // iOS 13+ requires permission request
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            console.log('iOS 13+ detected, permission will be required');
            resolve('permission_required');
        } else if (DEVICE_SUPPORT.orientation) {
            resolve('supported');
        } else {
            resolve('unsupported');
        }
    });
}

// Enhanced start measuring function
async function startMeasuring() {
    console.log('Starting measurement system...');
    
    if (isMeasuring) {
        stopMeasuring();
        return;
    }

    const support = await checkDeviceCapabilities();
    
    if (support === 'permission_required') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                enableMeasuring();
            } else {
                console.error('Permission denied');
                // Could add UI feedback here
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            // Could add UI feedback here
        }
    } else if (support === 'supported') {
        enableMeasuring();
    } else {
        console.error('Device orientation not supported');
        // Could add UI feedback here
    }
}

// Enhanced orientation handling
function handleOrientation(event) {
    if (!isMeasuring || !event) return;

    let angle;
    const orientation = window.screen.orientation.type;
    
    try {
        // Enhanced orientation detection with fallbacks
        if (orientation.includes('landscape')) {
            // In landscape, prefer gamma (left/right tilt)
            angle = event.gamma || 0;
            // Handle device being upside down
            if (orientation.includes('secondary')) {
                angle = -angle;
            }
        } else {
            // In portrait, prefer beta (forward/backward tilt)
            angle = event.beta || 0;
            // Adjust for device being upside down
            if (Math.abs(event.gamma || 0) > 90) {
                angle = -angle;
            }
        }

        // Validate angle before processing
        if (typeof angle !== 'number' || isNaN(angle)) {
            console.warn('Invalid angle reading:', angle);
            return;
        }

        // Apply calibration offset
        angle -= calibrationOffset;
        
        // Enhanced smoothing with spike detection
        if (typeof lastAngle === 'number' && !isNaN(lastAngle)) {
            // Detect and handle sudden spikes
            const change = Math.abs(angle - lastAngle);
            if (change > 45) { // Threshold for spike detection
                console.warn('Detected sensor spike:', change);
                return; // Skip this reading
            }
            angle = lastAngle * SMOOTHING + angle * (1 - SMOOTHING);
        }
        
        // Clamp final angle to reasonable range
        angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle));
        
        lastAngle = angle;

        // Update UI
        requestAnimationFrame(() => updateMeasurements(angle));
    } catch (error) {
        console.error('Error in handleOrientation:', error);
        // Could add error recovery logic here
    }
}

// Enhanced enable measuring function
function enableMeasuring() {
    if (isMeasuring) return;
    
    console.log('Enabling measurement system...');
    isMeasuring = true;
    lastAngle = null;
    
    // Update button state
    const startButton = document.getElementById('startButton');
    startButton.textContent = translations[currentLanguage].stop;
    
    // Add orientation handler with error checking
    const orientationHandler = (event) => {
        if (!event) {
            console.warn('No orientation data received');
            return;
        }
        handleOrientation(event);
    };
    
    window.addEventListener('deviceorientation', orientationHandler);
    
    // Store handler reference for cleanup
    window.currentOrientationHandler = orientationHandler;
}

// Enhanced stop measuring function
function stopMeasuring() {
    console.log('Stopping measurement system...');
    isMeasuring = false;
    
    // Clean up event listeners
    if (window.currentOrientationHandler) {
        window.removeEventListener('deviceorientation', window.currentOrientationHandler);
        window.currentOrientationHandler = null;
    }
    
    // Reset UI
    const startButton = document.getElementById('startButton');
    startButton.textContent = translations[currentLanguage].start;
    
    const bubble = document.getElementById('bubble');
    bubble.style.left = '50%';
    bubble.classList.remove('off-level');
    
    // Reset state
    lastAngle = null;
}

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

// Debug function to monitor sensor data
function debugOrientation(event) {
    console.log(`[${new Date().toISOString()}] Orientation:`, {
        alpha: event?.alpha?.toFixed(2) || 'null',
        beta: event?.beta?.toFixed(2) || 'null',
        gamma: event?.gamma?.toFixed(2) || 'null',
        orientation: window.screen.orientation.type
    });
}

// Device orientation handling
function handleOrientation(event) {
    if (!isMeasuring || !event) return;

    let angle;
    const isLandscape = window.screen.orientation.type.includes('landscape');
    
    try {
        if (isLandscape) {
            angle = event.gamma || 0;
        } else {
            angle = event.beta || 0;
        }

        // Apply calibration offset
        angle -= calibrationOffset;
        
        // Apply smoothing with bounds checking
        if (typeof lastAngle === 'number' && !isNaN(lastAngle)) {
            angle = lastAngle * SMOOTHING + angle * (1 - SMOOTHING);
        }
        lastAngle = angle;

        // Update UI
        updateMeasurements(angle);
    } catch (error) {
        console.error('Error in handleOrientation:', error);
    }
}

        // Update UI
        function updateMeasurements(angle) {
    const angleElement = document.getElementById('angle');
    const slopeElement = document.getElementById('slope');
    const bubble = document.getElementById('bubble');
    const angleLabel = document.getElementById('angleLabel');
    const slopeLabel = document.getElementById('slopeLabel');

    // Calculate values for different units
    const degreeValue = parseFloat(angle.toFixed(1));
    const slopeValue = parseFloat((Math.tan(angle * Math.PI / 180) * 12).toFixed(1));
    const percentValue = parseFloat((Math.tan(angle * Math.PI / 180) * 100).toFixed(1));

    // Update displays based on current unit
    switch (currentUnit) {
        case 'slope':
            angleElement.textContent = slopeValue;
            angleLabel.textContent = translations[currentLanguage].slope;
            slopeElement.textContent = degreeValue;
            slopeLabel.textContent = translations[currentLanguage].angle;
            break;
        case 'percent':
            angleElement.textContent = percentValue;
            angleLabel.textContent = '%';
            slopeElement.textContent = degreeValue;
            slopeLabel.textContent = translations[currentLanguage].angle;
            break;
        default: // 'degree'
            angleElement.textContent = degreeValue;
            angleLabel.textContent = translations[currentLanguage].angle;
            slopeElement.textContent = slopeValue;
            slopeLabel.textContent = translations[currentLanguage].slope;
    }

    // Update bubble position
    const bubblePosition = (angle / MAX_ANGLE) * 50; // Convert angle to percentage of max
    const clampedPosition = Math.max(-50, Math.min(50, bubblePosition)); // Clamp between -50% and 50%
    const centerOffset = 50; // Center position (50%)
    bubble.style.left = `${centerOffset + clampedPosition}%`;

    // Update bubble color based on level
    const isLevel = Math.abs(angle) < 0.5; // Consider level if within ±0.5 degrees
    bubble.classList.toggle('off-level', !isLevel);

    // Update DOM elements
    document.getElementById('title').textContent = translations[currentLanguage].title;
    document.getElementById('startButton').textContent = 
        isMeasuring ? translations[currentLanguage].stop : translations[currentLanguage].start;
    document.getElementById('calibrateButton').textContent = translations[currentLanguage].calibrate;
    document.getElementById('languageButton').textContent = currentLanguage === 'en' ? 'Español' : 'English';
}

// Add window resize and orientation change handlers
window.addEventListener('resize', () => {
    if (isMeasuring) {
        updateMeasurements(lastAngle || 0);
    }
});

window.screen.orientation.addEventListener('change', () => {
    if (isMeasuring) {
        lastAngle = null; // Reset smoothing on orientation change
        updateMeasurements(0);
    }
});

// Initialize graduations
function initializeGraduations() {
    const graduationsContainer = document.getElementById('graduations');
    const numGraduations = 20; // Number of graduation marks on each side

    for (let i = -numGraduations; i <= numGraduations; i++) {
        const graduation = document.createElement('div');
        graduation.className = 'graduation';
        if (i === 0) {
            graduation.className += ' center';
        }
        const position = (i / numGraduations) * 50 + 50;
        graduation.style.left = `${position}%`;
        graduationsContainer.appendChild(graduation);
    }
}

// Initialize the app
function initializeApp() {
    initializeGraduations();
    updateUI();
}

// Call initialize function when the page loads
window.addEventListener('load', initializeApp);

// Error handling for device orientation
window.addEventListener('error', (error) => {
    console.error('App Error:', error);
    stopMeasuring(); // Stop measuring on error
    // Could add user notification here
});

// Start measuring function
function startMeasuring() {
    console.log('Attempting to enable measuring...');
    if (isMeasuring) {
        stopMeasuring();
    } else {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        enableMeasuring();
                    }
                })
                .catch(console.error);
        } else {
            enableMeasuring();
        }
    }
}

// Enable measuring after permission granted
function enableMeasuring() {
    console.log('Enabling measurement system...');
    isMeasuring = true;
    lastAngle = null; // Reset smoothing
    document.getElementById('startButton').textContent = translations[currentLanguage].stop;
    
    const orientationHandler = (event) => {
        debugOrientation(event);
        handleOrientation(event);
    };
    
    window.addEventListener('deviceorientation', orientationHandler);
}

// Stop measuring function
function stopMeasuring() {
    console.log('Stopping measurement system...');
    isMeasuring = false;
    document.getElementById('startButton').textContent = translations[currentLanguage].start;
    
    window.removeEventListener('deviceorientation', handleOrientation);
    const bubble = document.getElementById('bubble');
    bubble.style.left = '50%';
    bubble.classList.remove('off-level');
}

// Calibration function
function startCalibration() {
    console.log('Calibration state:', isCalibrating);
    const calibrateButton = document.getElementById('calibrateButton');
    const statusDiv = document.getElementById('calibrationStatus');

    if (!isCalibrating) {
        // Start calibration
        isCalibrating = true;
        calibrationReadings = [];
        calibrateButton.classList.add('calibrating');
        calibrateButton.textContent = translations[currentLanguage].setZero;
        statusDiv.textContent = translations[currentLanguage].calibrating;

        // Start collecting calibration samples
        const calibrationHandler = (event) => {
            if (!isCalibrating) return;

            const isLandscape = window.screen.orientation.type.includes('landscape');
            const currentAngle = isLandscape ? (event.gamma || 0) : (event.beta || 0);
            
            calibrationReadings.push(currentAngle);
            console.log(`Calibration sample ${calibrationReadings.length}:`, currentAngle);

            if (calibrationReadings.length >= CALIBRATION_SAMPLES) {
                // Calculate average offset
                calibrationOffset = calibrationReadings.reduce((a, b) => a + b, 0) / CALIBRATION_SAMPLES;
                
                // Complete calibration
                completeCalibration(calibrateButton, statusDiv);
                window.removeEventListener('deviceorientation', calibrationHandler);
            }
        };

        window.addEventListener('deviceorientation', calibrationHandler);
    } else {
        // Force complete current calibration
        if (calibrationReadings.length > 0) {
            calibrationOffset = calibrationReadings.reduce((a, b) => a + b, 0) / calibrationReadings.length;
        }
        completeCalibration(calibrateButton, statusDiv);
    }
}

// Helper function to complete calibration
function completeCalibration(button, statusDiv) {
    isCalibrating = false;
    button.classList.remove('calibrating');
    button.textContent = translations[currentLanguage].calibrate;
    statusDiv.textContent = translations[currentLanguage].calibrated;
    console.log('Calibration completed. Offset:', calibrationOffset);
    
    setTimeout(() => {
        if (!isCalibrating) {
            statusDiv.textContent = '';
        }
    }, 2000);
}

// Language toggle function
function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'es' : 'en';
    updateUI();
}

// Unit toggle function
function toggleUnit() {
    const units = ['degree', 'slope', 'percent'];
    const currentIndex = units.indexOf(currentUnit);
    currentUnit = units[(currentIndex + 1) % units.length];
    updateUI();
}

// Update measurements function
function updateMeasurements(angle) {
    const angleElement = document.getElementById('angle');
    const slopeElement = document.getElementById('slope');
    const bubble = document.getElementById('bubble');

    // Calculate values for different units
    const degreeValue = parseFloat(angle.toFixed(1));
    const slopeValue = parseFloat((Math.tan(angle * Math.PI / 180) * 12).toFixed(1));
    const percentValue = parseFloat((Math.tan(angle * Math.PI / 180) * 100).toFixed(1));

    // Update displays based on current unit
    switch (currentUnit) {
        case 'slope':
            angleElement.
