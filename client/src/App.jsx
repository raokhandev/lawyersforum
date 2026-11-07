import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Authors from './pages/Authors.jsx'
import Articles from './pages/Articles.jsx'
import ArticleDetail from './pages/ArticleDetail.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/"><img className="logo" src="/assets/logo-long.png" alt="Lawyers Forum" /></Link>
          <nav>
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/authors">Authors</NavLink>
            <NavLink to="/articles">Articles</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:id" element={<ArticleDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="container">&copy; {new Date().getFullYear()} Lawyers Forum</div>
      </footer>
    </>
  )
}
