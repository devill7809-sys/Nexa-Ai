import {createRoot} from 'react-dom/client';
import {useState, useEffect} from 'react';
import {getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged} from 'firebase/auth';
import {initializeApp} from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import './index.css';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function App() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState('');
  const [pendingTool, setPendingTool] = useState<any>(null);
  const [agentMode, setAgentMode] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (user) {
      fetch('/api/conversations', { headers: { 'Authorization': `Bearer ${user.getIdToken()}` } })
        .then(res => res.json())
        .then(setConversations);
    }
  }, [user]);

  useEffect(() => {
    if (activeConv) {
      fetch(`/api/conversations/${activeConv.id}/messages`, { headers: { 'Authorization': `Bearer ${user.getIdToken()}` } })
        .then(res => res.json())
        .then(setMessages);
    }
  }, [activeConv, user]);

  const startChat = async () => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await user.getIdToken()}` },
      body: JSON.stringify({ title: 'New Conversation' })
    });
    const conv = await res.json();
    setConversations([...conversations, conv]);
    setActiveConv(conv);
  };

  const uploadDoc = async (e: any) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${await user.getIdToken()}` },
      body: formData
    });
    alert('Uploaded');
  };

  const handleChat = async () => {
    if (!activeConv) await startChat();
    
    const token = await user.getIdToken();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ prompt, conversationId: activeConv?.id || conversations[conversations.length-1]?.id, agentMode })
    });
    const data = await res.json();
    if (data.status === 'pending_confirmation') {
      setPendingTool(data);
    } else {
      setMessages([...messages, { role: 'user', content: prompt }, { role: 'ai', content: data.response }]);
    }
    setPrompt('');
  };

  const confirmTool = async () => {
    const token = await user.getIdToken();
    const res = await fetch('/api/tool/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ...pendingTool.toolCall, conversationId: activeConv.id })
    });
    const data = await res.json();
    setPendingTool(null);
    setMessages([...messages, { role: 'ai', content: data.response }]);
  };

  if (!user) return <button onClick={() => signInWithPopup(auth, provider)}>Sign in with Google</button>;

  return (
    <div className="flex h-screen">
      <div className="w-1/4 p-4 border-r">
        <button className="bg-black text-white w-full py-2 mb-4" onClick={startChat}>New Chat</button>
        {conversations.map(c => <div key={c.id} className="cursor-pointer p-2 hover:bg-gray-200" onClick={() => setActiveConv(c)}>{c.title}</div>)}
        <div className="mt-4">
          <input type="file" onChange={uploadDoc} />
        </div>
        <div className="mt-4">
          <label><input type="checkbox" checked={agentMode} onChange={(e) => setAgentMode(e.target.checked)} /> Agent Mode</label>
        </div>
      </div>
      <div className="w-3/4 p-4">
        <div className="h-4/5 overflow-y-auto mb-4">
          {messages.map((m, i) => <div key={i} className={`p-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>{m.content}</div>)}
        </div>
        <textarea className="w-full p-2 border mb-2" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <button className="bg-black text-white px-4 py-2" onClick={handleChat}>Send</button>
        {pendingTool && <button className="bg-red-500 text-white px-4 py-2 ml-2" onClick={confirmTool}>Confirm {pendingTool.toolCall.name}</button>}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
