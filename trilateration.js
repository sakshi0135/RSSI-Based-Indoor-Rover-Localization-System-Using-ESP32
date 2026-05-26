// 2 Anchors placed 4 meters apart
const ANCHORS = [
  { id: 'A1', x: 0, y: 0 },
  { id: 'A2', x: 4, y: 0 },
]

const L = 4 // distance between anchors in meters

// formula: d = 10^((A - RSSI) / (10 * n))
function rssiToDistance(rssi, A = -59, n = 2.5) {
  return Math.pow(10, (A - rssi) / (10 * n))
}

export function estimatePosition(rssi1, rssi2) {
  const d1 = rssiToDistance(rssi1) // distance from A1
  const d2 = rssiToDistance(rssi2) // distance from A2

  // Calculate x and y from 2 distances
  const x = (L*L + d1*d1 - d2*d2) / (2 * L)
  const y = Math.sqrt(Math.max(0, d1*d1 - x*x))

  // Clamp values so robot stays within map
  return {
    x: +Math.min(Math.max(x, 0), 4).toFixed(2),
    y: +Math.min(Math.max(y, 0), 4).toFixed(2)
  }
}
