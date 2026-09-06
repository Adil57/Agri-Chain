import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#0c0f14', color: '#fff', minHeight: '100vh' }}>
          <h1 style={{ color: '#f87171' }}>Something broke 💥</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#1a1f2b', padding: '1rem', borderRadius: '8px', fontSize: '13px', marginTop: '1rem' }}>
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
