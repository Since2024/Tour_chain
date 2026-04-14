import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'

const ADMIN_WALLET = 'DDziwsKXB4FTGj1B3kXw5uTD2Yp9HdWjwXphgHJxUzvf'

export default function Navbar() {
  const location = useLocation()
  const { publicKey } = useWallet()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isAdmin = publicKey?.toString() === ADMIN_WALLET

  const navLinks = [
    { name: 'Explore', path: '/' },
    { name: 'Scan QR', path: '/scan' },
    { name: 'My NFTs', path: '/nfts' },
  ]

  // Only add Leaderboard if user is Admin
  if (isAdmin) {
    navLinks.push({ name: 'Leaderboard', path: '/leaderboard' })
  }

  return (
    <>
      <div style={{ height: 80 }}></div> {/* Spacer for fixed navbar */}
      <nav style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '90%',
        maxWidth: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 100,
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: scrolled ? '0 20px 40px rgba(0,0,0,0.1)' : '0 10px 30px rgba(0,0,0,0.05)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* Logo Section */}
        <Link to="/" style={{ 
          textDecoration: 'none', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          paddingLeft: 16 
        }}>
          <span style={{ fontSize: 24 }}>🏔</span>
          <span style={{ 
            fontWeight: 800, 
            fontSize: 16, 
            color: '#1a1a1a', 
            letterSpacing: '-0.02em'
          }}>
            Tourism Chain Nepal
          </span>
        </Link>

        {/* Navigation Links */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4,
          background: 'rgba(255,255,255,0.4)',
          padding: 4,
          borderRadius: 100,
          border: '1px solid rgba(0,0,0,0.03)'
        }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  textDecoration: 'none',
                  padding: '10px 18px',
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? '#fff' : '#555',
                  backgroundColor: isActive ? '#000' : 'transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                {link.name}
              </Link>
            )
          })}
        </div>

        {/* Action Button */}
        <div style={{ paddingRight: 4 }}>
          <div className="wallet-adapter-wrapper">
             <WalletMultiButton />
          </div>
        </div>

        <style>{`
          .wallet-adapter-button {
            background-color: #000 !important;
            border-radius: 100px !important;
            height: 44px !important;
            font-family: 'Inter', sans-serif !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            padding: 0 20px !important;
            transition: all 0.3s ease !important;
          }
          .wallet-adapter-button:hover {
            opacity: 0.9 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
          }
        `}</style>
      </nav>
    </>
  )
}