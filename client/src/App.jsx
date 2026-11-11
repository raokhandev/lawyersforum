import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Authors from './pages/Authors.jsx'
import AuthorDetail from './pages/AuthorDetail.jsx'
import Articles from './pages/Articles.jsx'
import ArticleDetail from './pages/ArticleDetail.jsx'
import Admin from './pages/Admin.jsx'
import GroupPage from './pages/GroupPage.jsx'
import GroupMenu from './components/GroupMenu.jsx'
import { GROUPS } from './groups.js'
import ThemeToggle from './components/ThemeToggle.jsx'

export default function App() {
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  // Phone menu (hamburger). Closes when the page changes or Escape is pressed.
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { setMenuOpen(false) }, [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      <header className="site-header">
        <div className={`container header-inner${isAdmin ? ' full' : ''}`}>
          <Link to="/" className="logo-link">
            <img className="logo logo-light" src="/assets/logo-long.png" alt="Lawyers Forum" />
            <img className="logo logo-dark" src="/assets/logo-long-dark.webp?v=3" alt="Lawyers Forum" />
          </Link>
          <nav id="site-nav" className={menuOpen ? 'open' : ''} aria-label="Main">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/about">About Us</NavLink>
            {GROUPS.map((g) => <GroupMenu key={g.key} group={g} />)}
            <NavLink to="/articles">Articles</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
          {/* The theme switch stays in the header bar on every screen size; the hamburger only shows on phones. */}
          <div className="header-actions">
            <ThemeToggle />
            <button
              type="button" className="menu-toggle" aria-controls="site-nav" aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen
                  ? <path d="M6 6l12 12M18 6L6 18" />
                  : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>
      <main className={isAdmin ? 'admin-main' : 'container'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Authors />} />
          <Route path="/authors/:id" element={<AuthorDetail />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          {GROUPS.map((g) => <Route key={g.key} path={`${g.basePath}/:slug`} element={<GroupPage group={g} />} />)}
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className={isAdmin ? 'container full' : 'container'}>&copy; {new Date().getFullYear()} Lawyers Forum</div>
      </footer>
    </>
  )
}
