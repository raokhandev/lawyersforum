import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Authors from './pages/Authors.jsx'
import AuthorDetail from './pages/AuthorDetail.jsx'
import Articles from './pages/Articles.jsx'
import ArticleDetail from './pages/ArticleDetail.jsx'
import Admin from './pages/Admin.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

export default function App() {
  const isAdmin = useLocation().pathname.startsWith('/admin')
  return (
    <>
      <header className="site-header">
        <div className={`container header-inner${isAdmin ? ' full' : ''}`}>
          <Link to="/">
            <img className="logo logo-light" src="/assets/logo-long.png" alt="Lawyers Forum" />
            <img className="logo logo-dark" src="/assets/logo-long-dark.webp?v=3" alt="Lawyers Forum" />
          </Link>
          <nav>
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/about">About Us</NavLink>
            <NavLink to="/articles">Articles</NavLink>
            <NavLink to="/admin">Admin</NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className={isAdmin ? 'admin-main' : 'container'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<Authors />} />
          <Route path="/authors/:id" element={<AuthorDetail />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
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
