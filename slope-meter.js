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
