import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SCALE = 100
const FLOOR = 4

const ZONE_COLORS = {
  STOP:   { fill: 'rgba(226,75,74,0.2)',  stroke: '#E24B4A' },
  SLOW:   { fill: 'rgba(239,159,39,0.2)', stroke: '#EF9F27' },
  NORMAL: { fill: 'rgba(99,153,34,0.15)', stroke: '#639922' },
}

export default function WarehouseMap() {
  const canvasRef = useRef(null)
  const robotRef  = useRef({ x: 2, y: 2 })
  const zonesRef  = useRef([])
  const [status, setStatus]   = useState('NORMAL')
  const [zones, setZones]     = useState([])
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Socket connection
  useEffect(() => {
    const socket = io('http://localhost:3000')

    socket.on('robot_update', (data) => {
      robotRef.current = data.position
      setStatus(data.behavior)
      setPosition(data.position)
    })

    socket.on('zones_updated', (z) => {
      zonesRef.current = z
      setZones(z)
    })

    fetch('http://localhost:3000/api/zones')
      .then(r => r.json())
      .then(z => {
        zonesRef.current = z
        setZones(z)
      })

    return () => socket.disconnect()
  }, [])

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grid
      ctx.strokeStyle = '#2a2a4a'
      ctx.lineWidth = 1
      for (let i = 0; i <= FLOOR; i++) {
        ctx.beginPath(); ctx.moveTo(i*SCALE, 0); ctx.lineTo(i*SCALE, FLOOR*SCALE); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i*SCALE); ctx.lineTo(FLOOR*SCALE, i*SCALE); ctx.stroke()
      }

      // Zones
      zonesRef.current.forEach(zone => {
        const col = ZONE_COLORS[zone.type]
        ctx.fillStyle = col.fill
        ctx.strokeStyle = col.stroke
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        if (zone.shape === 'rect') {
          ctx.fillRect(zone.x*SCALE, zone.y*SCALE, zone.w*SCALE, zone.h*SCALE)
          ctx.strokeRect(zone.x*SCALE, zone.y*SCALE, zone.w*SCALE, zone.h*SCALE)
        } else {
          ctx.beginPath()
          ctx.arc(zone.cx*SCALE, zone.cy*SCALE, zone.r*SCALE, 0, Math.PI*2)
          ctx.fill(); ctx.stroke()
        }
        ctx.setLineDash([])
      })

      // Anchors
      const anchors = [{ x:0, y:0, label:'A1' }, { x:4, y:0, label:'A2' }]
      anchors.forEach(a => {
        ctx.fillStyle = '#3B82F6'
        ctx.beginPath()
        ctx.arc(a.x*SCALE, a.y*SCALE, 10, 0, Math.PI*2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px sans-serif'
        ctx.fillText(a.label, a.x*SCALE - 8, a.y*SCALE + 4)
      })

      // Robot
      const { x, y } = robotRef.current
      ctx.shadowColor = '#10B981'
      ctx.shadowBlur = 15
      ctx.fillStyle = '#10B981'
      ctx.beginPath()
      ctx.arc(x*SCALE, y*SCALE, 14, 0, Math.PI*2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.font = '14px sans-serif'
      ctx.fillText('🤖', x*SCALE - 9, y*SCALE + 5)

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  const changeZone = async (id, type) => {
    const updated = zones.map(z => z.id === id ? {...z, type} : z)
    setZones(updated)
    zonesRef.current = updated
    await fetch(`http://localhost:3000/api/zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    })
  }

  const statusColor = status === 'STOP' ? '#E24B4A' : status === 'SLOW' ? '#EF9F27' : '#10B981'

  return (
    <div style={{ display:'flex', gap:24, padding:24, background:'#0f0f1a', minHeight:'100vh', color:'#fff', fontFamily:'sans-serif' }}>
      
      {/* Map */}
      <div>
        <h2 style={{ marginBottom:12 }}>🗺️ ShadowTrack — Live Map</h2>
        <canvas
          ref={canvasRef}
          width={FLOOR * SCALE}
          height={FLOOR * SCALE}
          style={{ border:'2px solid #3B82F6', borderRadius:8 }}
        />
        <div style={{ marginTop:8, fontSize:14, color:'#aaa' }}>
          📍 Position: x={position.x}m, y={position.y}m
        </div>
      </div>

      {/* Side Panel */}
      <div style={{ minWidth:200 }}>
        
        {/* Status */}
        <div style={{ background:'#1a1a2e', padding:16, borderRadius:8, marginBottom:16 }}>
          <h3 style={{ marginBottom:8 }}>Robot Status</h3>
          <div style={{ color: statusColor, fontSize:20, fontWeight:'bold' }}>
            ● {status}
          </div>
        </div>

        {/* Anchors */}
        <div style={{ background:'#1a1a2e', padding:16, borderRadius:8, marginBottom:16 }}>
          <h3 style={{ marginBottom:8 }}>📡 Anchors</h3>
          <div style={{ fontSize:13, color:'#aaa' }}>A1 → (0, 0)</div>
          <div style={{ fontSize:13, color:'#aaa' }}>A2 → (4, 0)</div>
        </div>

        {/* Zone Editor */}
        <div style={{ background:'#1a1a2e', padding:16, borderRadius:8 }}>
          <h3 style={{ marginBottom:12 }}>🎛️ Zone Control</h3>
          {zones.map(z => (
            <div key={z.id} style={{ marginBottom:12 }}>
              <div style={{ fontSize:13, marginBottom:4, color:'#aaa' }}>{z.id}</div>
              <select
                value={z.type}
                onChange={e => changeZone(z.id, e.target.value)}
                style={{ width:'100%', padding:'6px 8px', borderRadius:4, background:'#2a2a4a', color:'#fff', border:'1px solid #3B82F6' }}
              >
                <option value="NORMAL">Normal</option>
                <option value="SLOW">Caution</option>
                <option value="STOP">Restricted</option>
              </select>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
