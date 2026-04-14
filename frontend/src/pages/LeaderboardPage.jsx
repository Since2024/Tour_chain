import { useEffect, useState } from 'react'
import axios from 'axios'
import BackgroundLayer from '../components/BackgroundLayer'
import { useWallet } from '@solana/wallet-adapter-react'

const ADMIN_WALLET = 'DDziwsKXB4FTGj1B3kXw5uTD2Yp9HdWjwXphgHJxUzvf'

export default function LeaderboardPage() {
  const { publicKey } = useWallet()
  const [tourists, setTourists] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    setLoaded(true)
    // Only fetch if admin
    if (publicKey?.toString() === ADMIN_WALLET) {
      axios.get('http://localhost:3001/api/leaderboard/top')
        .then(res => setTourists(res.data))
        .catch(err => console.error(err))
    }
  }, [publicKey])

  const handleMouseMove = (e) => {
    const x = e.clientX / window.innerWidth
    const y = e.clientY / window.innerHeight
    setMousePos({ x, y })
  }

  const isAdmin = publicKey?.toString() === ADMIN_WALLET
  const top3 = tourists.slice(0, 3)
  const rest = tourists.slice(3)

  return (
    <div 
      onMouseMove={handleMouseMove}
      style={{ 
        minHeight: '100vh', 
        padding: '100px 24px',
        color: '#fff',
        fontFamily: "'Outfit', 'Inter', sans-serif",
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <BackgroundLayer />

      {!isAdmin ? (
        /* Restricted Access UI - English Only */
        <div style={{ 
          maxWidth: 600, 
          textAlign: 'center', 
          background: 'rgba(255,255,255,0.03)', 
          backdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '60px 40px',
          borderRadius: 40,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          animation: 'fadeInScale 0.8s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>🔐</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.04em' }}>Restricted Access</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', lineHeight: 1.6, marginBottom: 32 }}>
            The Global Leaderboard is reserved for official oversight. Please connect the authorized Ministry of Tourism wallet to view rankings.
          </p>
          <div style={{ 
            display: 'inline-block',
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            Authorized Personnel Only
          </div>
        </div>
      ) : (
        /* The Golden Summit (Admin View) */
        <div style={{ 
          maxWidth: 1000, 
          width: '100%',
          position: 'relative', 
          zIndex: 1,
          opacity: loaded ? 1 : 0,
          transform: `translateY(${loaded ? 0 : '40px'})`,
          transition: 'all 1.2s cubic-bezier(0.23, 1, 0.32, 1)'
        }}>
           {/* Mountain Silhouette Silhouette Overlay */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '40vh',
            background: 'linear-gradient(to top, rgba(8, 10, 18, 1), transparent)',
            zIndex: 0,
            pointerEvents: 'none'
          }}></div>
          
          <div style={{
            position: 'fixed',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120%',
            height: '60%',
            opacity: 0.05,
            backgroundImage: 'url("https://www.svgrepo.com/show/414414/mountain.svg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'invert(1)',
            zIndex: 0,
            pointerEvents: 'none'
          }}></div>

          <header style={{ textAlign: 'center', marginBottom: 120 }}>
              <span style={{ 
                  color: '#FFD700', 
                  fontWeight: 900, 
                  letterSpacing: 4, 
                  fontSize: 12, 
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: 16
              }}>
                  Top Explorers of 2026
              </span>
              <h1 style={{ 
                  fontSize: '5rem', 
                  fontWeight: 1000, 
                  margin: 0, 
                  letterSpacing: '-.06em',
                  lineHeight: 0.9,
                  color: '#fff'
              }}>
                  Global Summit
              </h1>
          </header>

          {/* The Platinum Orbs (Top 3) */}
          {top3.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: 40, 
              marginBottom: 160,
              transform: `perspective(1000px) rotateX(${(mousePos.y - 0.5) * 10}deg) rotateY(${(mousePos.x - 0.5) * 10}deg)`,
              transition: 'transform 0.1s ease-out'
            }}>
              {/* Rank 2 */}
              {top3[1] && (
                <div style={{ textAlign: 'center', opacity: 0, animation: 'fadeInScale 0.8s 0.2s forwards' }}>
                    <div style={{ 
                        width: 140, height: 140, borderRadius: '50%',
                        border: '2px solid rgba(238,238,238,0.5)',
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(20px)',
                        padding: 10, position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(255,255,255,0.05)'
                    }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(45deg, #bbb, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🗻</div>
                          <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#fff', color: '#000', padding: '4px 12px', borderRadius: 100, fontSize: 13, fontWeight: 900 }}>2nd</div>
                    </div>
                    <p style={{ marginTop: 24, fontWeight: 800, fontSize: '1.2rem' }}>{top3[1].walletAddress.substring(0, 8)}...</p>
                    <p style={{ color: '#00ffcc', fontWeight: 900, fontSize: '1.5rem', marginTop: 8 }}>{top3[1].totalVisits} 🏔️</p>
                </div>
              )}

              {/* Rank 1 - Golden Champion */}
              <div style={{ textAlign: 'center', zIndex: 10, opacity: 0, animation: 'fadeInScale 0.8s forwards' }}>
                  <div style={{ position: 'relative' }}>
                      {/* Pulsing Aura */}
                      <div className="sun-aura"></div>
                      
                      <div style={{ 
                        width: 220, height: 220, borderRadius: '50%',
                        border: '4px solid #FFD700',
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(30px)',
                        padding: 15, position: 'relative',
                        boxShadow: '0 30px 80px rgba(255, 215, 0, 0.2)'
                    }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(45deg, #FFD700, #ff8c00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>👑</div>
                          <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, background: '#FFD700', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '5px solid #080a12', fontSize: 24, fontWeight: 1000, color: '#000' }}>1</div>
                    </div>
                  </div>
                  <p style={{ marginTop: 32, fontWeight: 1000, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>{top3[0].walletAddress.substring(0, 10)}...</p>
                  <p style={{ color: '#FFD700', fontWeight: 1000, fontSize: '2.5rem', marginTop: 8 }}>{top3[0].totalVisits} VISITS</p>
              </div>

              {/* Rank 3 */}
              {top3[2] && (
                <div style={{ textAlign: 'center', opacity: 0, animation: 'fadeInScale 0.8s 0.4s forwards' }}>
                    <div style={{ 
                        width: 140, height: 140, borderRadius: '50%',
                        border: '2px solid rgba(205, 127, 50, 0.5)',
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(20px)',
                        padding: 10, position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(45deg, #cd7f32, #8b4513)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🏔️</div>
                          <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#cd7f32', color: '#fff', padding: '4px 12px', borderRadius: 100, fontSize: 13, fontWeight: 900 }}>3rd</div>
                    </div>
                    <p style={{ marginTop: 24, fontWeight: 800, fontSize: '1.2rem' }}>{top3[2].walletAddress.substring(0, 8)}...</p>
                    <p style={{ color: '#00ffcc', fontWeight: 900, fontSize: '1.5rem', marginTop: 8 }}>{top3[2].totalVisits} 🏔️</p>
                </div>
              )}
            </div>
          )}

          {/* Global List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rest.map((tourist, index) => (
              <div 
                key={tourist.walletAddress} 
                className="summit-row"
                style={{ animationDelay: `${0.6 + index * 0.05}s` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)', width: 40 }}>#{index + 4}</span>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚶</div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)' }}>
                    {tourist.walletAddress.substring(0, 20)}...
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 1000, color: '#fff' }}>{tourist.totalVisits}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 900 }}>MILESTONES</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes auraFloat {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.3); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        .sun-aura {
          position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%);
          animation: auraFloat 5s infinite ease-in-out;
          pointer-events: none;
        }
        .summit-row {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          padding: 24px 40px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
          opacity: 0;
          animation: slideInUp 0.8s forwards;
        }
        .summit-row:hover {
          transform: scale(1.02);
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,215,0,0.3);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  )
}
