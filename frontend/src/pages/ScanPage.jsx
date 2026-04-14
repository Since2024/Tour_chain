import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useWallet } from '@solana/wallet-adapter-react'
import axios from 'axios'
import BackgroundLayer from '../components/BackgroundLayer'
import { useNavigate } from 'react-router-dom'

export default function ScanPage() {
  const { publicKey } = useWallet()
  const navigate = useNavigate()
  const [result, setResult] = useState(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [scanningStatus, setScanningStatus] = useState('System Online')
  const [showHUD, setShowHUD] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const scannerRef = useRef(null)
  const fileInputRef = useRef(null)
  const initializationRef = useRef(false)

  // Initialize Master Scanner Once
  useEffect(() => {
    if (!initializationRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader')
        initializationRef.current = true
        setTimeout(() => setShowHUD(true), 100)
        startLivingFeed()
    }
    
    return () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
        }
    }
  }, [])

  const startLivingFeed = async () => {
    if (!scannerRef.current) return
    
    setScanningStatus('Activating Optical Sensors...')
    // Ensure the container is visible for the library
    setIsCameraActive(true) 
    
    try {
        await scannerRef.current.start(
            { facingMode: 'environment' },
            { 
                fps: 20, 
                qrbox: (viewWidth, viewHeight) => {
                    const min = Math.min(viewWidth, viewHeight)
                    return { width: min * 0.7, height: min * 0.7 }
                }
            },
            onDataCaptured,
            () => {} 
        )
        setScanningStatus('Live Feed Online')
    } catch (err) {
        console.error("Camera failed:", err)
        setIsCameraActive(false)
        setScanningStatus('Hardware Unavailable')
    }
  }

  const stopLivingFeed = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        try {
            await scannerRef.current.stop()
            setIsCameraActive(false)
        } catch (e) {
            console.warn("Stop failed:", e)
        }
    }
  }

  const onDataCaptured = async (decodedText) => {
    await stopLivingFeed()
    processVisit(decodedText)
  }

  const processVisit = async (qrData) => {
    setLoading(true)
    setScanningStatus('Authenticating Gateway...')

    if (!publicKey) {
        setResult({ error: 'Identity Required: Please connect your wallet first.' })
        setLoading(false)
        return
    }

    try {
        const res = await axios.post('http://localhost:3001/api/visits/verify-visit', {
            qrData,
            walletAddress: publicKey.toString()
        })
        setResult({ success: true, message: res.data.message })
        setScanningStatus('Access Verified')
    } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Verification Error'
        setResult({ error: errorMsg })
        setScanningStatus('Gateway Rejected')
    } finally {
        setLoading(false)
    }
  }

  const handleFileImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setResult(null)
    setLoading(true)
    setScanningStatus('Releasing Live Sensors...')

    await stopLivingFeed()

    setScanningStatus('Analyzing High-Res Data...')
    try {
        const scanner = scannerRef.current || new Html5Qrcode('qr-reader')
        const decodedText = await scanner.scanFile(file, false)
        processVisit(decodedText)
    } catch (err) {
        console.error("File scan error:", err)
        setResult({ error: 'No valid QR signature detected. Please upload a clear image of the badge.' })
        setScanningStatus('Data Corrupted')
        setLoading(false)
    }
  }

  const rebootSystem = async () => {
    setResult(null)
    setLoading(false)
    await stopLivingFeed()
    startLivingFeed()
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      color: '#fff',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      <BackgroundLayer />

      <div style={{ 
        zIndex: 1, 
        textAlign: 'center', 
        maxWidth: 500, 
        width: '100%',
        minHeight: 600,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        opacity: showHUD ? 1 : 0,
        transform: `translateY(${showHUD ? 0 : '30px'})`,
        transition: 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
      }}>
        {/* Header HUD */}
        <div style={{ marginBottom: 40 }}>
            <span style={{ 
                border: '1px solid rgba(0, 255, 204, 0.3)', 
                padding: '6px 16px', 
                borderRadius: 100, 
                fontSize: 12, 
                fontWeight: 800, 
                letterSpacing: 2, 
                color: '#00ffcc',
                textTransform: 'uppercase',
                display: 'inline-block',
                marginBottom: 20
            }}>
                Gateway Terminal 01
            </span>
            <h1 style={{ fontSize: '3.5rem', fontWeight: 1000, margin: 0, letterSpacing: '-0.06em', lineHeight: 1 }}>
                Digital<br/>Gateway
            </h1>
        </div>

        {/* Action HUD: Shared Container */}
        <div style={{ position: 'relative' }}>
            
            {/* Live Scanner Container */}
            <div id="qr-reader" style={{ 
                width: '100%', 
                aspectRatio: '1 / 1',
                borderRadius: 40, 
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                position: 'relative',
                display: (isCameraActive && !loading && !result) ? 'block' : 'none'
            }}></div>

            {/* Processing / Result / Placeholder Area */}
            {(!isCameraActive || loading || result) && (
                <div style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: 40,
                    border: '1px solid rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(30px)',
                    animation: 'modalEntrance 0.5s ease-out'
                }}>
                    {loading && (
                        <div style={{ animation: 'pulse 1.5s infinite', textAlign: 'center' }}>
                            <div style={{ fontSize: 80, marginBottom: 20 }}>🌌</div>
                            <p style={{ color: '#00ffcc', fontWeight: 1000, letterSpacing: 5, fontSize: '0.8rem' }}>{scanningStatus}</p>
                        </div>
                    )}

                    {result && (
                        <div style={{ padding: 30, textAlign: 'center' }}>
                            <div style={{ fontSize: 64, marginBottom: 24 }}>{result.success ? '🏔️' : '🔐'}</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 1000, marginBottom: 12, color: result.success ? '#00ffcc' : '#ff3b30', letterSpacing: '-0.04em' }}>
                                {result.success ? 'Gateway Unlocked' : 'Access Restricted'}
                            </h2>
                            <p style={{ opacity: 0.7, fontSize: '0.95rem', marginBottom: 32, lineHeight: 1.5 }}>
                                {result.message || result.error}
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button onClick={rebootSystem} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: 100, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>System Reboot</button>
                                {result.success && <button onClick={() => navigate('/nfts')} style={{ background: '#00ffcc', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 100, fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>View Badges</button>}
                            </div>
                        </div>
                    )}

                    {!loading && !result && !isCameraActive && (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <div className="spinner" style={{ 
                                width: 50, height: 50, 
                                border: '3px solid rgba(0,255,204,0.1)', 
                                borderTopColor: '#00ffcc', 
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 20px'
                            }}></div>
                            <p style={{ opacity: 0.5, fontWeight: 800, letterSpacing: 2, fontSize: 12 }}>{scanningStatus}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Right Side Action Dock */}
            <div style={{
                position: 'absolute',
                top: '50%',
                right: -75,
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                animation: 'dockIn 0.8s 0.3s forwards',
                opacity: 0,
                zIndex: 10
            }}>
                <button 
                    onClick={() => fileInputRef.current.click()}
                    style={{
                        width: 55, height: 55,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        backdropFilter: 'blur(15px)',
                        color: '#fff',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                        e.currentTarget.style.transform = 'scale(1.1)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.transform = 'scale(1)'
                    }}
                >
                    📸
                </button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileImport} />
            </div>
        </div>

        {/* Live Status Dock */}
        <div style={{ marginTop: 40 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#00ffcc', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.6 }}>
                TERMINAL_STATUS // {scanningStatus}
            </p>
        </div>
      </div>

      <style>{`
        @keyframes modalEntrance {
          from { opacity: 0; transform: scale(0.97) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes dockIn {
          from { opacity: 0; transform: translate(30px, -50%); }
          to { opacity: 1; transform: translate(0, -50%); }
        }
        @keyframes pulse {
          0% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.4; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
           border-top-color: #00ffcc !important;
        }
      `}</style>
    </div>
  )
}