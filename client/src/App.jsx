import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Send, RefreshCw, Bot, User, Copy, Check } from 'lucide-react'

// Post Container Component
function PostContainer({ content }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={styles.postContainer}>
      <div style={styles.postHeader}>
        <span style={styles.postLabel}>📝 Generated Post</span>
        <button onClick={handleCopy} style={styles.copyBtn} title="Copy to clipboard">
          {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={styles.postContent}>
        {content}
      </div>
    </div>
  )
}

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'agent', text: "Digital Twin online. Give me a raw idea, and let's craft a post." }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [lastUserMessage, setLastUserMessage] = useState('')

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(() => { scrollToBottom() }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userText = input.trim()
    setInput('')
    setLastUserMessage(userText.toLowerCase())
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setIsLoading(true)

    try {
      // Calling our Node.js backend running on port 3000
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: userText
      })
      
      // Check if this is a post request
      const isPostRequest = userText.toLowerCase().match(/(make|write|create|draft|generate).*(post|content|caption|article)/i)
      
      setMessages(prev => [...prev, { 
        role: 'agent', 
        text: response.data.reply,
        isPost: !!isPostRequest
      }])
    } catch (error) {
      const backendMessage = error?.response?.data?.error
      const fallbackMessage = "Could not reach the backend. Check that the server is running on port 3000."
      setMessages(prev => [...prev, { role: 'agent', text: backendMessage || fallbackMessage }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    try {
      await axios.post('http://localhost:3000/api/reset')
      setMessages([{ role: 'agent', text: "Memory wiped. Blank slate. What's the new topic?" }])
    } catch (error) {
      console.error("Failed to reset")
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Shahidul's Digital Twin</h1>
        <button onClick={handleReset} style={styles.resetBtn} title="Wipe Memory">
          <RefreshCw size={18} />
        </button>
      </header>

      <main style={styles.chatArea}>
        {messages.map((msg, index) => (
          <div key={index} style={msg.role === 'user' ? styles.userRow : styles.agentRow}>
            <div style={styles.iconContainer}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            <div style={msg.role === 'user' ? styles.userMsg : styles.agentMsg}>
              {msg.isPost ? <PostContainer content={msg.text} /> : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={styles.agentRow}>
            <div style={styles.iconContainer}><Bot size={20} /></div>
            <div style={styles.agentMsg}>Synthesizing strategy...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer style={styles.inputArea}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Dump an idea here..."
          style={styles.input}
        />
        <button onClick={handleSend} disabled={isLoading} style={styles.sendBtn}>
          <Send size={20} />
        </button>
      </footer>
    </div>
  )
}

// Inline styles to keep it single-file for you right now
const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' },
  title: { margin: 0, fontSize: '1.2rem', fontWeight: '600' },
  resetBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '4px' },
  chatArea: { flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' },
  userRow: { display: 'flex', gap: '16px', flexDirection: 'row-reverse', alignItems: 'flex-start' },
  agentRow: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  iconContainer: { padding: '10px', backgroundColor: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userMsg: { backgroundColor: '#3b82f6', padding: '16px 20px', borderRadius: '16px 4px 16px 16px', maxWidth: '70%', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap' },
  agentMsg: { backgroundColor: '#1e293b', border: '1px solid #334155', padding: '16px 20px', borderRadius: '4px 16px 16px 16px', maxWidth: '100%', lineHeight: '1.6', fontSize: '1rem', whiteSpace: 'pre-wrap', textAlign: 'left' },
  inputArea: { padding: '24px 40px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', gap: '16px' },
  input: { flex: 1, padding: '16px 24px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '1rem', outline: 'none' },
  sendBtn: { padding: '0 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  // Post Container Styles
  postContainer: { backgroundColor: '#0f172a', border: '2px solid #10b981', borderRadius: '12px', padding: '24px', marginTop: '12px', minWidth: '100%', boxShadow: '0 10px 30px rgba(16, 185, 129, 0.1)' },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #334155' },
  postLabel: { fontSize: '0.9rem', fontWeight: '600', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' },
  copyBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #10b981', color: '#10b981', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.3s ease' },
  postContent: { color: '#e2e8f0', fontSize: '1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '16px 0', backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '8px' }
}