let port;
let frequency = 0;
let volume = 0;
let osc;
let fft;
let video;
let handPose;
let hands = [];
let painting;
let px = 0;
let py = 0;

// Preload handPose model
function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  // Create canvas and place it in the container
  let canvas = createCanvas(800, 800);
  canvas.parent('canvas-container');
  
  // Video setup
  video = createCapture(VIDEO, { flipped: true });
  video.size(800, 400);
  video.hide();

  // Initialize handPose model
  handPose.detectStart(video, gotHands);

  // Hand pose setup
  painting = createGraphics(800, 400);
  painting.clear();

  // Serial port setup
  port = createSerial();

  // Button event listeners
  select('#connect-btn').mousePressed(connectBtnClick);
  select('#start-audio-btn').mousePressed(() => {
    userStartAudio().then(() => {
      togglePlay();
    });
  });
  select('#clear-btn').mousePressed(clearDrawing);

  // Audio setup
  userStartAudio();
  fft = new p5.FFT(0.8, 32);
  osc = new p5.TriOsc();
  osc.amp(0);
  osc.start();
  osc.connect(fft);
}

function clearDrawing() {
  painting.clear();
}

function draw() {
  background(10, 10, 10); // Darker background to match the new theme

  // Top section: Hand drawing
  image(video, 0, 0, 800, 400);
  if (hands.length > 0) {
    let hand = hands[0];
    let index = hand.index_finger_tip;
    let thumb = hand.thumb_tip;
    let x = (index.x + thumb.x) * 0.5;
    let y = (index.y + thumb.y) * 0.5;

    let d = dist(index.x, index.y, thumb.x, thumb.y);
    if (d < 20) {
      painting.stroke(255, 255, 0);
      painting.strokeWeight(8);
      painting.line(px, py, x, y);
    }
    px = x;
    py = y;
  }
  image(painting, 0, 0, 800, 400);

  // Bottom section: Audio visualizer
  push();
  translate(0, 400);

  // Serial data processing
  let data = port ? port.readUntil('\n') : null;
  if (data) {
    let values = data.trim().split('-');
    if (values.length === 2) {
      frequency = parseInt(values[0]);
      volume = parseInt(values[1]);

      if (osc.started) {
        osc.freq(frequency, 0.1);
        osc.amp(map(volume, 2, 240, 0, 0.5), 0.1);
      }
    }
  }

  // FFT spectrum visualization with enhanced colors
  let spectrum = fft.analyze();
  noStroke();
  for (let i = 0; i < spectrum.length; i++) {
    let x = map(i, 0, spectrum.length, 0, width);
    let h = -height / 4 + map(spectrum[i], 0, 255, height / 4, 0);
    // Enhanced color gradient
    let r = map(i, 0, spectrum.length, 255, 0);
    let g = map(spectrum[i], 0, 255, 0, 255);
    let b = map(i, 0, spectrum.length, 0, 255);

    fill(r, g, b, 200); // Added slight transparency
    rect(x, height / 4, width / spectrum.length, h);
  }

  // Waveform visualization with glowing effect
  let waveform = fft.waveform();
  push();
  // Glow effect
  drawingContext.shadowBlur = 10;
  drawingContext.shadowColor = 'rgba(0, 255, 0, 0.5)';
  
  noFill();
  beginShape();
  stroke(20, 255, 20);
  strokeWeight(2);
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, width);
    let y = map(waveform[i], -1, 1, height / 2 + 50, height - 50);
    vertex(x, y);
  }
  endShape();
  pop();

  pop();

  // Update status displays
  updateStatusDisplays();
}

function updateStatusDisplays() {
  select('#frequency-display').html(`Frequency: ${frequency} Hz`);
  select('#volume-display').html(`Volume: ${volume}`);
  select('#connection-status').html(port.opened() ? 'Connected' : 'Disconnected');
  select('#audio-context-status').html(`Audio Context: ${getAudioContext().state}`);
}

function modelReady() {
  console.log("Hand Pose model loaded");
}

function gotHands(results) {
  hands = results;
}

function connectBtnClick() {
  if (port && !port.open()) {
    port.open('Arduino', 9600);
  } else if (port) {
    port.close();
  }
}

function togglePlay() {
  if (!osc.started) {
    osc.start();
    osc.started = true;
  } else {
    osc.amp(0, 0.1);
    setTimeout(() => {
      osc.stop();
      osc.started = false;
    }, 100);
  }
}