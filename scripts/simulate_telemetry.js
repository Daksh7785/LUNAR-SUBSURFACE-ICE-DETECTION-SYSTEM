/**
 * 🌕 Chandrayaan-2 Live Rover Telemetry Monitor & Simulator Client
 * This script establishes a WebSocket connection to the backend gateway
 * and streams live telemetry to verify connection integrity.
 */

const WebSocket = require('ws');

// Configure gateway address
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:3000/ws/telemetry';

console.log(`📡 Connecting to Lunar Subsurface Telemetry Stream: ${BACKEND_WS_URL}`);

const ws = new WebSocket(BACKEND_WS_URL);

ws.on('open', () => {
  console.log('✅ Telemetry Stream Connection established successfully!');
  console.log('------------------------------------------------------------');
});

ws.on('message', (data) => {
  try {
    const telemetry = JSON.parse(data.toString());
    console.log(`⏰ Time: ${telemetry.timestamp}`);
    console.log(`📍 Position: Lat ${telemetry.rover.lat.toFixed(6)}, Lng ${telemetry.rover.lng.toFixed(6)} | Heading: ${telemetry.rover.heading}° | Speed: ${telemetry.rover.speedKmh} km/h`);
    console.log(`🔋 Battery: ${telemetry.battery.percentage}% | Solar Gen: ${telemetry.battery.solarGenerationW}W | Cons: ${telemetry.battery.consumptionW}W`);
    console.log(`📐 Slope: ${telemetry.terrain.slopeDegrees}° | Boulders: ${telemetry.terrain.boulderProximityM}m | Roughness: ${telemetry.terrain.surfaceRoughness}`);
    console.log(`📡 Radar: CPR: ${telemetry.radar.cprValue} | DOP: ${telemetry.radar.dopValue} | Ice Detected: ${telemetry.radar.iceFlag ? 'YES (CPR>1 & DOP<0.13)' : 'NO'}`);
    console.log(`⚙️ State: ${telemetry.mission.state} - Task: ${telemetry.mission.activeTask} | Signal: ${telemetry.mission.signalStrengthDbm} dBm`);
    console.log('------------------------------------------------------------');
  } catch (error) {
    console.error('❌ Failed to parse incoming telemetry data packet:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket connection error occurred:', error.message);
  console.log('💡 Tip: Make sure the backend server container is running (docker-compose up backend).');
});

ws.on('close', () => {
  console.log('📡 Telemetry Stream connection closed.');
});
