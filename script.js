// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================
const CONFIG = {
  TABATA: {
    PREPARE_TIME: 10,
    WORK_TIME: 20,
    REST_TIME: 10,
    TOTAL_ROUNDS: 8
  },
  SOUNDS: {
    START_FREQ: 700,
    END_FREQ: 880,
    COUNTDOWN_FREQ: 440,
    WORK_FREQ: 660,
    VOLUME: 0.2,
    DURATION: 0.15
  },
  CAROUSEL_INTERVAL: 2500
};

// ============================================
// AUDIO MANAGER (Reutilizable)
// ============================================
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.isSoundEnabled = true;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  createBeep(frequency, volume, duration) {
    if (!this.isSoundEnabled) return;
    
    this.init();
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), duration * 1000);
  }

  playStartSound() {
    this.createBeep(CONFIG.SOUNDS.START_FREQ, CONFIG.SOUNDS.VOLUME, CONFIG.SOUNDS.DURATION);
  }

  playEndSound() {
    this.createBeep(CONFIG.SOUNDS.END_FREQ, 0.3, 0.2);
  }

  playCountdownBeep(time) {
    if (time <= 3 && time > 0) {
      this.createBeep(CONFIG.SOUNDS.COUNTDOWN_FREQ, 0.1, 0.1);
    }
  }

  playPhaseStartSound(phase) {
    const freq = phase === 'work' ? CONFIG.SOUNDS.WORK_FREQ : CONFIG.SOUNDS.COUNTDOWN_FREQ;
    this.createBeep(freq, CONFIG.SOUNDS.VOLUME, CONFIG.SOUNDS.DURATION);
  }

  toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
    return this.isSoundEnabled;
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// ============================================
// STOPWATCH MANAGER
// ============================================
class StopwatchManager {
  constructor(audioManager, elements) {
    this.audioManager = audioManager;
    this.elements = elements;
    this.interval = null;
    this.isRunning = false;
    this.isCountingUp = true;
    this.startTime = 0;
    this.elapsed = 0;
    this.targetTime = 0;
  }

  formatTime(ms) {
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

  getSelectedTimeMs() {
    const h = parseInt(this.elements.hours?.value) || 0;
    const m = parseInt(this.elements.minutes?.value) || 0;
    const s = parseInt(this.elements.seconds?.value) || 0;
    return (h * 3600 + m * 60 + s) * 1000;
  }

  updateDisplay(ms) {
    if (this.elements.display) {
      this.elements.display.textContent = this.formatTime(ms);
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    if (this.elements.startButton) {
      this.elements.startButton.textContent = 'Pausar';
    }
    this.audioManager.playStartSound();

    if (this.isCountingUp) {
      this.startTime = Date.now() - this.elapsed;
      this.targetTime = this.getSelectedTimeMs();
      
      this.interval = setInterval(() => {
        this.elapsed = Date.now() - this.startTime;
        this.updateDisplay(this.elapsed);
        
        if (this.targetTime > 0 && this.elapsed >= this.targetTime) {
          this.stop();
          this.updateDisplay(this.targetTime);
          this.audioManager.playEndSound();
        }
      }, 30);
    } else {
      this.startTime = Date.now();
      this.targetTime = this.getSelectedTimeMs();
      this.elapsed = this.targetTime;
      
      this.interval = setInterval(() => {
        const diff = Date.now() - this.startTime;
        let remaining = this.targetTime - diff;
        if (remaining < 0) remaining = 0;
        
        this.updateDisplay(remaining);
        
        if (remaining === 0) {
          this.stop();
          this.audioManager.playEndSound();
        }
      }, 30);
    }
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.elements.startButton) {
      this.elements.startButton.textContent = 'Iniciar';
    }
    clearInterval(this.interval);
  }

  reset() {
    this.stop();
    this.elapsed = 0;
    
    if (this.isCountingUp) {
      this.updateDisplay(0);
    } else {
      this.updateDisplay(this.getSelectedTimeMs());
    }
  }

  setMode(isCountingUp) {
    this.isCountingUp = isCountingUp;
    this.reset();
  }

  cleanup() {
    this.stop();
  }
}

// ============================================
// TABATA MANAGER
// ============================================
class TabataManager {
  constructor(audioManager, elements) {
    this.audioManager = audioManager;
    this.elements = elements;
    this.interval = null;
    this.time = 0;
    this.round = 0;
    this.phase = 'prepare';
    this.isRunning = false;
  }

  updateDisplay() {
    if (!this.elements.time || !this.elements.round) return;
    
    const minutes = Math.floor(this.time / 60);
    const seconds = this.time % 60;
    
    this.elements.time.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.elements.round.textContent = `Ronda: ${this.round}/${CONFIG.TABATA.TOTAL_ROUNDS}`;
  }

  updatePhase(phase, text) {
    if (!this.elements.phase) return;
    
    this.elements.phase.className = `tabata-phase ${phase}`;
    this.elements.phase.textContent = text;
  }

  start() {
    if (this.isRunning) {
      this.stop();
      return;
    }

    this.isRunning = true;
    if (this.elements.startButton) {
      this.elements.startButton.textContent = 'Pausar';
    }

    this.time = CONFIG.TABATA.PREPARE_TIME;
    this.round = 0;
    this.phase = 'prepare';
    
    this.updateDisplay();
    this.updatePhase('prepare', 'Preparados');
    this.audioManager.playStartSound();

    this.interval = setInterval(() => {
      if (this.time > 0) {
        this.audioManager.playCountdownBeep(this.time);
        this.time--;
        this.updateDisplay();
      }

      if (this.time === 0) {
        this.audioManager.playEndSound();
        this.handlePhaseTransition();
      }
    }, 1000);
  }

  handlePhaseTransition() {
    switch (this.phase) {
      case 'prepare':
        this.phase = 'work';
        this.time = CONFIG.TABATA.WORK_TIME;
        this.round++;
        this.updatePhase('work', '¡Trabajo!');
        this.audioManager.playPhaseStartSound('work');
        break;

      case 'work':
        if (this.round >= CONFIG.TABATA.TOTAL_ROUNDS) {
          this.stop();
          return;
        }
        this.phase = 'rest';
        this.time = CONFIG.TABATA.REST_TIME;
        this.updatePhase('rest', 'Descanso');
        this.audioManager.playPhaseStartSound('rest');
        break;

      case 'rest':
        this.phase = 'work';
        this.time = CONFIG.TABATA.WORK_TIME;
        this.round++;
        this.updatePhase('work', '¡Trabajo!');
        this.audioManager.playPhaseStartSound('work');
        break;
    }
    this.updateDisplay();
  }

  stop() {
    clearInterval(this.interval);
    this.isRunning = false;
    if (this.elements.startButton) {
      this.elements.startButton.textContent = 'Iniciar';
    }
  }

  reset() {
    this.stop();
    this.time = 0;
    this.round = 0;
    this.phase = 'prepare';
    this.updateDisplay();
    this.updatePhase('prepare', 'Preparados');
  }

  cleanup() {
    this.stop();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function filterElements(searchInput, elements, displayProperty = '') {
  const searchValue = searchInput.toLowerCase();
  elements.forEach(element => {
    const matches = element.textContent.toLowerCase().includes(searchValue);
    element.style.display = matches ? displayProperty : 'none';
  });
}

function createYouTubeEmbed(videoId, containerId) {
  const container = document.getElementById(containerId);
  if (!videoId || !container) return;
  
  container.innerHTML = `
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

// ============================================
// CLOCK MODULE
// ============================================
class ClockManager {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.interval = null;
  }

  start() {
    this.update();
    this.interval = setInterval(() => this.update(), 1000);
  }

  update() {
    if (!this.element) return;
    
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    
    this.element.textContent = `${h}:${m}:${s}`;
  }

  cleanup() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// ============================================
// CAROUSEL MODULE
// ============================================
class CarouselManager {
  constructor() {
    this.slides = document.querySelectorAll('.carrusel-slide');
    this.prevBtn = document.getElementById('carrusel-prev');
    this.nextBtn = document.getElementById('carrusel-next');
    this.current = 0;
    this.interval = null;
  }

  init() {
    if (this.slides.length === 0) return;

    this.showSlide(this.current);
    
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prev());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.next());
    }

    this.interval = setInterval(() => this.next(), CONFIG.CAROUSEL_INTERVAL);
  }

  showSlide(index) {
    this.slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
  }

  next() {
    this.current = (this.current + 1) % this.slides.length;
    this.showSlide(this.current);
  }

  prev() {
    this.current = (this.current - 1 + this.slides.length) % this.slides.length;
    this.showSlide(this.current);
  }

  cleanup() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// ============================================
// MAIN APP INITIALIZATION
// ============================================
class BenditoCrossApp {
  constructor() {
    this.audioManager = new AudioManager();
    this.stopwatchManager = null;
    this.tabataManager = null;
    this.clockManager = null;
    this.carouselManager = null;
  }

  init() {
    // Menu toggle
    this.initMenu();
    
    // Stopwatch
    this.initStopwatch();
    
    // Tabata
    this.initTabata();
    
    // Clock
    this.clockManager = new ClockManager('clock');
    this.clockManager.start();
    
    // Carousel
    this.carouselManager = new CarouselManager();
    this.carouselManager.init();
    
    // Calculator
    this.initCalculator();
    
    // Filters
    this.initFilters();
    
    // Timer tabs
    this.initTimerTabs();
    
    // YouTube player
    this.initYouTubePlayer();
    
    // Sound toggle
    this.initSoundToggle();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  initMenu() {
    const toggle = document.getElementById('_toggle');
    const items = document.getElementById('_items');

    if (toggle && items) {
      toggle.addEventListener('click', () => {
        items.classList.toggle('open');
        toggle.classList.toggle('close');
      });
    }
  }

  initStopwatch() {
    const elements = {
      display: document.getElementById('stopwatch'),
      startButton: document.getElementById('start'),
      resetButton: document.getElementById('reset'),
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds')
    };

    this.stopwatchManager = new StopwatchManager(this.audioManager, elements);

    if (elements.startButton) {
      elements.startButton.addEventListener('click', () => {
        if (this.stopwatchManager.isRunning) {
          this.stopwatchManager.stop();
        } else {
          this.stopwatchManager.start();
        }
      });
    }

    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', () => {
        this.stopwatchManager.reset();
      });
    }

    const timerModeInputs = document.querySelectorAll('input[name="timer-mode"]');
    timerModeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.stopwatchManager.setMode(e.target.value === 'up');
      });
    });

    [elements.hours, elements.minutes, elements.seconds].forEach(input => {
      if (input) {
        input.addEventListener('change', () => this.stopwatchManager.reset());
      }
    });

    this.stopwatchManager.reset();
  }

  initTabata() {
    const elements = {
      startButton: document.getElementById('tabata-start'),
      resetButton: document.getElementById('tabata-reset'),
      time: document.getElementById('tabata-time'),
      round: document.getElementById('tabata-round'),
      phase: document.getElementById('tabata-phase')
    };

    this.tabataManager = new TabataManager(this.audioManager, elements);

    if (elements.startButton) {
      elements.startButton.addEventListener('click', () => {
        this.tabataManager.start();
      });
    }

    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', () => {
        this.tabataManager.reset();
      });
    }

    this.tabataManager.updateDisplay();
  }

  initCalculator() {
    const calculateButton = document.getElementById('calculate');
    const exerciseSelect = document.getElementById('exercise');
    const weightInput = document.getElementById('weight');
    const resultElement = document.getElementById('result');

    if (!calculateButton || !exerciseSelect || !weightInput || !resultElement) return;

    calculateButton.addEventListener('click', () => {
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
      for (let percentage = 95; percentage >= 30; percentage -= 5) {
        const value = (weight * (percentage / 100)).toFixed(2);
        percentages += `<div style="text-align:center;">${percentage}%: ${value} kg</div>`;
      }

      resultElement.innerHTML = percentages;
    });
  }

  initFilters() {
    // Dictionary filter
    const diccionarioBuscador = document.querySelector('.diccionario-buscador');
    const diccionarioTarjetas = document.querySelectorAll('.diccionario-item');

    if (diccionarioBuscador && diccionarioTarjetas.length) {
      diccionarioBuscador.addEventListener('input', () => {
        filterElements(diccionarioBuscador.value, diccionarioTarjetas);
      });
    }

    // Exercises filter
    const buscadorEjercicios = document.getElementById('buscador-ejercicios');
    const contenedorEjercicios = document.getElementById('videos_ejercicios');

    if (buscadorEjercicios && contenedorEjercicios) {
      buscadorEjercicios.addEventListener('input', () => {
        const tarjetas = contenedorEjercicios.querySelectorAll('.video-card');
        filterElements(buscadorEjercicios.value, tarjetas);
      });
    }
  }

  initTimerTabs() {
    const timerTabs = document.querySelectorAll('.timer-tab');
    const timerSections = document.querySelectorAll('.timer-section');

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
  }

  initYouTubePlayer() {
    const playlistSelector = document.getElementById('playlist-selector');
    if (playlistSelector) {
      playlistSelector.addEventListener('change', (e) => {
        createYouTubeEmbed(e.target.value, 'youtube-player');
      });
    }
  }

  initSoundToggle() {
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        const isEnabled = this.audioManager.toggleSound();
        const icon = soundToggle.querySelector('i');
        if (icon) {
          icon.className = isEnabled ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
        }
      });
    }
  }

  cleanup() {
    this.audioManager.cleanup();
    this.stopwatchManager?.cleanup();
    this.tabataManager?.cleanup();
    this.clockManager?.cleanup();
    this.carouselManager?.cleanup();
  }
}

// ============================================
// INITIALIZE APP
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const app = new BenditoCrossApp();
  app.init();
});