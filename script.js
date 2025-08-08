// Variables globales
let youtubePlayer = null;
let isYouTubeAPIReady = false;
let tabataInterval;
let tabataTime = 0;
let tabataRound = 0;
let tabataPhase = 'prepare';
let isTabataRunning = false;
let isSoundEnabled = true;

// Funcionalidad del menú desplegable
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('_toggle');
    const items = document.getElementById('_items');

    toggle.addEventListener('click', () => {
        items.classList.toggle('open');
        toggle.classList.toggle('close');
    });

    // Referencias a elementos del DOM para el cronómetro y tabata
    const stopwatchDisplay = document.getElementById('stopwatch');
    const startButton = document.getElementById('start');
    const resetButton = document.getElementById('reset');
    const hoursInput = document.getElementById('hours');
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    const timerModeInputs = document.querySelectorAll('input[name="timer-mode"]');
    const soundToggle = document.getElementById('sound-toggle');
    const tabataStartButton = document.getElementById('tabata-start');
    const tabataResetButton = document.getElementById('tabata-reset');
    const tabataTimeElement = document.getElementById('tabata-time');
    const tabataRoundElement = document.getElementById('tabata-round');
    const tabataPhaseElement = document.getElementById('tabata-phase');
    const timerTabs = document.querySelectorAll('.timer-tab');
    const timerSections = document.querySelectorAll('.timer-section');

    // ----------- CRONÓMETRO MEJORADO -----------
    let stopwatchInterval = null;
    let isRunning = false;
    let isCountingUp = true;
    let startTime = 0;
    let elapsed = 0;
    let targetTime = 0;

    function createBeep(frequency, volume, duration) {
        if (!isSoundEnabled) return;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        gainNode.gain.value = volume;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioContext.close();
        }, duration * 1000);
    }
    function playStartSound() { createBeep(700, 0.2, 0.15); }
    function playEndSound() { createBeep(880, 0.3, 0.2); }

    function getSelectedTimeMs() {
        const h = parseInt(hoursInput?.value) || 0;
        const m = parseInt(minutesInput?.value) || 0;
        const s = parseInt(secondsInput?.value) || 0;
        return (h * 3600 + m * 60 + s) * 1000;
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = ms % 1000;
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString().padStart(2, '0')}:${seconds
            .toString().padStart(2, '0')}.${milliseconds
            .toString().padStart(3, '0')}`;
    }

    function updateStopwatchDisplay(ms) {
        if (stopwatchDisplay) stopwatchDisplay.textContent = formatTime(ms);
    }

    function startStopwatch() {
        if (isRunning) return;
        isRunning = true;
        if (startButton) startButton.textContent = 'Pausar';
        playStartSound();

        if (isCountingUp) {
            startTime = Date.now() - elapsed;
            targetTime = getSelectedTimeMs();
            stopwatchInterval = setInterval(() => {
                elapsed = Date.now() - startTime;
                updateStopwatchDisplay(elapsed);
                if (targetTime > 0 && elapsed >= targetTime) {
                    stopStopwatch();
                    updateStopwatchDisplay(targetTime);
                    playEndSound();
                }
            }, 30);
        } else {
            startTime = Date.now();
            targetTime = getSelectedTimeMs();
            elapsed = targetTime;
            stopwatchInterval = setInterval(() => {
                const diff = Date.now() - startTime;
                let remaining = targetTime - diff;
                if (remaining < 0) remaining = 0;
                updateStopwatchDisplay(remaining);
                if (remaining === 0) {
                    stopStopwatch();
                    playEndSound();
                }
            }, 30);
        }
    }

    function stopStopwatch() {
        if (!isRunning) return;
        isRunning = false;
        if (startButton) startButton.textContent = 'Iniciar';
        clearInterval(stopwatchInterval);
    }

    function resetStopwatch() {
        stopStopwatch();
        elapsed = 0;
        if (isCountingUp) {
            updateStopwatchDisplay(0);
        } else {
            updateStopwatchDisplay(getSelectedTimeMs());
        }
    }

    // Event listeners para el cronómetro
    if (startButton) {
        startButton.addEventListener('click', function() {
            if (isRunning) {
                stopStopwatch();
            } else {
                startStopwatch();
            }
        });
    }
    if (resetButton) {
        resetButton.addEventListener('click', resetStopwatch);
    }
    timerModeInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            isCountingUp = e.target.value === 'up';
            resetStopwatch();
        });
    });
    [hoursInput, minutesInput, secondsInput].forEach(input => {
        if (input) input.addEventListener('change', resetStopwatch);
    });

    // Inicializa el cronómetro en modo ascendente en 00:00:00.000
    resetStopwatch();

    // ----------- TABATA -----------
    function playCountdownBeep(time) {
        if (!isSoundEnabled) return;
        if (time <= 3 && time > 0) {
            createBeep(440, 0.1, 0.1);
        }
    }
    function playPhaseStartSound(phase) {
        if (!isSoundEnabled) return;
        if (phase === 'work') {
            createBeep(660, 0.2, 0.15);
        } else if (phase === 'rest') {
            createBeep(440, 0.2, 0.15);
        }
    }
    function updateTabataDisplay() {
        if (!tabataTimeElement || !tabataRoundElement) return;
        const minutes = Math.floor(tabataTime / 60);
        const seconds = tabataTime % 60;
        tabataTimeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        tabataRoundElement.textContent = `Ronda: ${tabataRound}/8`;
    }
    function startTabata() {
        if (!isTabataRunning) {
            isTabataRunning = true;
            if (tabataStartButton) tabataStartButton.textContent = 'Pausar';
            tabataTime = 10; // Tiempo de preparación
            tabataRound = 0;
            tabataPhase = 'prepare';

            updateTabataDisplay();
            if (tabataPhaseElement) {
                tabataPhaseElement.className = 'tabata-phase prepare';
                tabataPhaseElement.textContent = 'Preparados';
            }

            playStartSound();

            tabataInterval = setInterval(() => {
                if (tabataTime > 0) {
                    playCountdownBeep(tabataTime);
                    tabataTime--;
                    updateTabataDisplay();
                }

                if (tabataTime === 0) {
                    playEndSound();

                    switch (tabataPhase) {
                        case 'prepare':
                            tabataPhase = 'work';
                            tabataTime = 20;
                            tabataRound++;
                            if (tabataPhaseElement) {
                                tabataPhaseElement.className = 'tabata-phase work';
                                tabataPhaseElement.textContent = '¡Trabajo!';
                            }
                            playPhaseStartSound('work');
                            break;

                        case 'work':
                            if (tabataRound >= 8) {
                                stopTabata();
                                return;
                            }
                            tabataPhase = 'rest';
                            tabataTime = 10;
                            if (tabataPhaseElement) {
                                tabataPhaseElement.className = 'tabata-phase rest';
                                tabataPhaseElement.textContent = 'Descanso';
                            }
                            playPhaseStartSound('rest');
                            break;

                        case 'rest':
                            tabataPhase = 'work';
                            tabataTime = 20;
                            tabataRound++;
                            if (tabataPhaseElement) {
                                tabataPhaseElement.className = 'tabata-phase work';
                                tabataPhaseElement.textContent = '¡Trabajo!';
                            }
                            playPhaseStartSound('work');
                            break;
                    }
                    updateTabataDisplay();
                }
            }, 1000);
        } else {
            stopTabata();
        }
    }
    function stopTabata() {
        clearInterval(tabataInterval);
        isTabataRunning = false;
        if (tabataStartButton) tabataStartButton.textContent = 'Iniciar';
    }
    function resetTabata() {
        stopTabata();
        tabataTime = 0;
        tabataRound = 0;
        tabataPhase = 'prepare';
        updateTabataDisplay();
        if (tabataPhaseElement) {
            tabataPhaseElement.className = 'tabata-phase';
            tabataPhaseElement.textContent = 'Preparados';
        }
    }
    if (tabataStartButton) {
        tabataStartButton.addEventListener('click', startTabata);
    }
    if (tabataResetButton) {
        tabataResetButton.addEventListener('click', resetTabata);
    }

    // ----------- YOUTUBE EMBED -----------
    function createYouTubeEmbed(videoId) {
        const youtubePlayer = document.getElementById('youtube-player');
        if (!videoId || !youtubePlayer) return;
        youtubePlayer.innerHTML = `
            <iframe 
                width="100%" 
                height="80" 
                src="https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        `;
    }
    const playlistSelector = document.getElementById('playlist-selector');
    if (playlistSelector) {
        playlistSelector.addEventListener('change', (e) => {
            createYouTubeEmbed(e.target.value);
        });
    }

    // ----------- SONIDO -----------
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            isSoundEnabled = !isSoundEnabled;
            soundToggle.querySelector('i').className = isSoundEnabled ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
        });
    }

    // ----------- CAMBIO DE PESTAÑAS -----------
    timerTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            timerTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const timerType = tab.getAttribute('data-timer');
            timerSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${timerType}-section`) {
                    section.classList.add('active');
                }
            });
        });
    });

    // ----------- CALCULADORA DE RM -----------
    const calculateButton = document.getElementById('calculate');
    const exerciseSelect = document.getElementById('exercise');
    const weightInput = document.getElementById('weight');
    const resultElement = document.getElementById('result');

    if (calculateButton && exerciseSelect && weightInput && resultElement) {
        calculateButton.addEventListener('click', function() {
            const weight = parseFloat(weightInput.value);
            const selectedExercise = exerciseSelect.value;

            if (isNaN(weight) || weight <= 0) {
                resultElement.innerHTML = '<div style="text-align:center;">Por favor, introduce un peso válido.</div>';
                return;
            }

            if (!selectedExercise) {
                resultElement.innerHTML = '<div style="text-align:center;">Por favor, selecciona un ejercicio.</div>';
                return;
            }

            let percentages = '';
            let percentage = 95;
            while (percentage >= 30) {
                percentages += `<div style="text-align:center;">${percentage}%: ${(weight * (percentage / 100)).toFixed(2)} kg</div>`;
                percentage -= 5;
            }

            resultElement.innerHTML = percentages;
        });
    }

    // ----------- INICIALIZACIONES -----------
    updateTabataDisplay();
});

// Reloj en tiempo real
function updateClock() {
    const clock = document.getElementById('clock');
    if (!clock) return;
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    clock.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();