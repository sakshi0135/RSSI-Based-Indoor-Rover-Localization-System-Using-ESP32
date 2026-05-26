import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mqtt from 'mqtt'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

// ── MQTT connection (port 1884) ──────────────────────────
const mqttClient = mqtt.connect('mqtt://127.0.0.1:1884')

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT broker')
  mqttClient.subscribe('shadowtrack/rover_01/rssi')
})

mqttClient.on('message', (topic, payload) => {
  const data = JSON.parse(payload)
  io.emit('robot_update', {
    position: data.position,
    behavior: data.behavior,
    zone: data.zone
  })
})

// ── Zone config ──────────────────────────────────────────
let zones = [
  { id: 'vault', type: 'STOP',   shape: 'rect',   x:0.4, y:0.4, w:1.6, h:1.4 },
  { id: 'bay',   type: 'SLOW',   shape: 'circle', cx:5.0, cy:5.0, r:1.1 },
]

app.get('/api/zones', (req, res) => res.json(zones))
app.patch('/api/zones/:id', (req, res) => {
  zones = zones.map(z =>
    z.id === req.params.id ? { ...z, type: req.body.type } : z
  )
  io.emit('zones_updated', zones)
  res.json({ ok: true })
})

// ── Simulation (robot moves in circle) ──────────────────
let angle = 0
setInterval(() => {
  angle += 0.05
  const position = {
    x: +(3 + 2 * Math.cos(angle)).toFixed(2),
    y: +(3 + 2 * Math.sin(angle)).toFixed(2)
  }
  io.emit('robot_update', { position, behavior: 'NORMAL' })
}, 100)

httpServer.listen(3000, () => console.log('🚀 Backend running on http://localhost:3000'))
