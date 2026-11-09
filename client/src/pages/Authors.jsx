import { api } from '../api.js'
import useFetch from '../useFetch.js'
import { EDITOR_NAME } from '../config.js'
import AuthorCard from '../components/AuthorCard.jsx'

export default function Authors() {
  const { data: authors, error, loading } = useFetch(api.authors)
  // The Editor in Chief is pinned to the top; everyone else keeps the API's order (alphabetical).
  const data = authors && [...authors].sort((a, b) => (b.name === EDITOR_NAME) - (a.name === EDITOR_NAME))
  return (
    <>
      <h1>About Us</h1>
      <section className="about-intro">
        <h2>Welcome to Lawyers Forum</h2>
        <p>Law can be complex, and understanding a judgment or a change in legislation often takes more than reading the headlines. Lawyers Forum grew out of a simple wish to make that understanding a little easier.</p>
        <p>Here, we explore legal issues across jurisdictions through articles, case discussions, and commentary. We look at what courts have decided, how laws are interpreted, and what those developments mean in practice.</p>
        <p>Whether you are practising law, studying it, or simply curious about a legal question, we hope you will find something useful here. Our aim is to write clearly without losing the detail that matters, recognising that a rule or decision in one jurisdiction may work differently in another.</p>
        <p>The focus is on law, with discussion grounded in legal sources and open to reasoned differences of opinion. We welcome thoughtful debate and keep the platform free from party-political advocacy.</p>
        <p>Above all, Lawyers Forum is a place to share knowledge and learn from different legal perspectives. We hope it helps you understand an issue more clearly—or gives you a useful starting point for exploring it further.</p>
      </section>
      {loading && <p>Loading…</p>}
      {error && <p className="error">{error}</p>}
      {data && data.length === 0 && <p>No authors listed yet.</p>}
      <div className="profile-list">
        {data && data.map((l) => <AuthorCard key={l.id} author={l} />)}
      </div>
    </>
  )
}
