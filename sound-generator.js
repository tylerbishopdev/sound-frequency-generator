class SoundGenerator {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        this.filter = null;
        this.analyser = null;
        this.lfo = null;
        this.lfoGain = null;
        this.noiseNode = null;
        this.noiseGain = null;
        this.isPlaying = false;
        
        this.initializeAudio();
        this.setupEventListeners();
        this.setupVisualizer();
    }

    initializeAudio() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    setupEventListeners() {
        // Frequency controls
        const freqSlider = document.getElementById('frequency');
        const freqInput = document.getElementById('frequencyInput');
        
        freqSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            freqInput.value = value;
            document.getElementById('frequencyValue').textContent = `${value.toFixed(1)} Hz`;
            this.updateFrequency(value);
            this.updateInfo(value);
        });

        freqInput.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (value >= 0.5 && value <= 1000) {
                freqSlider.value = value;
                document.getElementById('frequencyValue').textContent = `${value.toFixed(1)} Hz`;
                this.updateFrequency(value);
                this.updateInfo(value);
            }
        });

        // Waveform selector
        document.getElementById('waveform').addEventListener('change', (e) => {
            if (this.oscillator) {
                this.oscillator.type = e.target.value;
            }
        });

        // Volume control
        document.getElementById('volume').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('volumeValue').textContent = `${value}%`;
            this.updateVolume(value / 100);
        });

        // LFO controls
        document.getElementById('modFreq').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('modFreqValue').textContent = `${value.toFixed(1)} Hz`;
            this.updateLFO();
        });

        document.getElementById('modDepth').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('modDepthValue').textContent = `${value}%`;
            this.updateLFO();
        });

        // Filter controls
        document.getElementById('filterType').addEventListener('change', () => {
            this.updateFilter();
        });

        document.getElementById('filterFreq').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('filterFreqValue').textContent = `${value} Hz`;
            this.updateFilter();
        });

        // Envelope controls
        document.getElementById('attack').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('attackValue').textContent = `${value.toFixed(2)} s`;
        });

        document.getElementById('decay').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('decayValue').textContent = `${value.toFixed(2)} s`;
        });

        // Noise checkbox
        document.getElementById('enableNoise').addEventListener('change', (e) => {
            if (this.noiseGain) {
                this.noiseGain.gain.value = e.target.checked ? 0.1 : 0;
            }
        });
    }

    createNoiseBuffer() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return noiseBuffer;
    }

    start() {
        if (this.isPlaying) return;

        // Create oscillator
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = document.getElementById('waveform').value;
        this.oscillator.frequency.value = parseFloat(document.getElementById('frequency').value);

        // Create gain node
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 0;

        // Create filter
        this.filter = this.audioContext.createBiquadFilter();
        this.updateFilter();

        // Create analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;

        // Create LFO (Low Frequency Oscillator) for modulation
        this.lfo = this.audioContext.createOscillator();
        this.lfoGain = this.audioContext.createGain();
        this.lfo.frequency.value = parseFloat(document.getElementById('modFreq').value);
        this.updateLFO();

        // Create noise source
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer();
        noiseSource.loop = true;
        this.noiseGain = this.audioContext.createGain();
        this.noiseGain.gain.value = document.getElementById('enableNoise').checked ? 0.1 : 0;

        // Connect LFO for frequency modulation
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.oscillator.frequency);

        // Connect main audio chain
        this.oscillator.connect(this.filter);
        this.filter.connect(this.gainNode);
        
        // Connect noise
        noiseSource.connect(this.noiseGain);
        this.noiseGain.connect(this.gainNode);

        // Connect to analyser and output
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        // Apply envelope
        const now = this.audioContext.currentTime;
        const attack = parseFloat(document.getElementById('attack').value);
        const decay = parseFloat(document.getElementById('decay').value);
        const volume = parseInt(document.getElementById('volume').value) / 100;

        this.gainNode.gain.setValueAtTime(0, now);
        this.gainNode.gain.linearRampToValueAtTime(volume, now + attack);
        this.gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + attack + decay);

        // Start oscillators
        this.oscillator.start();
        this.lfo.start();
        noiseSource.start();
        
        this.noiseNode = noiseSource;
        this.isPlaying = true;

        // Update button
        const playBtn = document.getElementById('playBtn');
        playBtn.classList.add('playing');
        playBtn.textContent = '⏸ Pause';
    }

    stop() {
        if (!this.isPlaying) return;

        const now = this.audioContext.currentTime;
        this.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

        setTimeout(() => {
            if (this.oscillator) {
                this.oscillator.stop();
                this.oscillator.disconnect();
                this.oscillator = null;
            }
            if (this.lfo) {
                this.lfo.stop();
                this.lfo.disconnect();
                this.lfo = null;
            }
            if (this.noiseNode) {
                this.noiseNode.stop();
                this.noiseNode.disconnect();
                this.noiseNode = null;
            }
            if (this.gainNode) {
                this.gainNode.disconnect();
                this.gainNode = null;
            }
            if (this.filter) {
                this.filter.disconnect();
                this.filter = null;
            }
            if (this.lfoGain) {
                this.lfoGain.disconnect();
                this.lfoGain = null;
            }
            if (this.noiseGain) {
                this.noiseGain.disconnect();
                this.noiseGain = null;
            }
        }, 100);

        this.isPlaying = false;

        // Update button
        const playBtn = document.getElementById('playBtn');
        playBtn.classList.remove('playing');
        playBtn.textContent = '▶ Play';
    }

    updateFrequency(freq) {
        if (this.oscillator) {
            this.oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        }
    }

    updateVolume(value) {
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(value, this.audioContext.currentTime);
        }
    }

    updateLFO() {
        if (this.lfo && this.lfoGain) {
            const freq = parseFloat(document.getElementById('modFreq').value);
            const depth = parseInt(document.getElementById('modDepth').value) / 100;
            const mainFreq = parseFloat(document.getElementById('frequency').value);
            
            this.lfo.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            this.lfoGain.gain.setValueAtTime(mainFreq * depth * 0.1, this.audioContext.currentTime);
        }
    }

    updateFilter() {
        if (this.filter) {
            const filterType = document.getElementById('filterType').value;
            const filterFreq = parseInt(document.getElementById('filterFreq').value);
            
            if (filterType === 'none') {
                this.filter.type = 'allpass';
            } else {
                this.filter.type = filterType;
                this.filter.frequency.setValueAtTime(filterFreq, this.audioContext.currentTime);
                this.filter.Q.setValueAtTime(1, this.audioContext.currentTime);
            }
        }
    }

    updateInfo(freq) {
        // Update frequency display
        document.getElementById('infoFreq').textContent = `${freq.toFixed(1)} Hz`;
        
        // Calculate and display note
        const note = this.frequencyToNote(freq);
        document.getElementById('infoNote').textContent = note;
        
        // Calculate period (in milliseconds)
        const period = (1000 / freq).toFixed(2);
        document.getElementById('infoPeriod').textContent = `${period} ms`;
        
        // Calculate wavelength (in cm, assuming speed of sound = 343 m/s)
        const wavelength = ((343 / freq) * 100).toFixed(1);
        document.getElementById('infoWavelength').textContent = `${wavelength} cm`;
    }

    frequencyToNote(freq) {
        const A4 = 440;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        const halfSteps = 12 * Math.log2(freq / A4);
        const noteIndex = Math.round(halfSteps + 9) % 12;
        const octave = Math.floor((halfSteps + 9 + 48) / 12);
        
        return notes[noteIndex >= 0 ? noteIndex : noteIndex + 12] + octave;
    }

    setupVisualizer() {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const draw = () => {
            requestAnimationFrame(draw);

            if (!this.analyser) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                return;
            }

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FF8F99';
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            // Draw frequency spectrum
            this.analyser.getByteFrequencyData(dataArray);
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height / 2;
                
                const r = barHeight + 25 * (i / bufferLength);
                const g = 250 * (i / bufferLength);
                const b = 50;
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };

        draw();
    }
}

// Initialize the sound generator
let soundGen = new SoundGenerator();

// Global functions for buttons
function togglePlay() {
    if (soundGen.isPlaying) {
        soundGen.stop();
    } else {
        soundGen.start();
    }
}

function stopAll() {
    soundGen.stop();
}

function loadPreset(preset) {
    const presets = {
        'meditation': { freq: 7.83, wave: 'sine', volume: 30 },  // Schumann resonance
        'alpha': { freq: 10, wave: 'sine', volume: 30 },         // Alpha brain waves
        'beta': { freq: 20, wave: 'sine', volume: 30 },          // Beta brain waves
        'a440': { freq: 440, wave: 'sine', volume: 50 },         // Concert A
        'c256': { freq: 256, wave: 'sine', volume: 50 }          // Scientific C
    };

    if (presets[preset]) {
        const p = presets[preset];
        document.getElementById('frequency').value = p.freq;
        document.getElementById('frequencyInput').value = p.freq;
        document.getElementById('frequencyValue').textContent = `${p.freq.toFixed(1)} Hz`;
        document.getElementById('waveform').value = p.wave;
        document.getElementById('volume').value = p.volume;
        document.getElementById('volumeValue').textContent = `${p.volume}%`;
        
        soundGen.updateInfo(p.freq);
        
        if (soundGen.isPlaying) {
            soundGen.stop();
            setTimeout(() => soundGen.start(), 100);
        }
    }
}