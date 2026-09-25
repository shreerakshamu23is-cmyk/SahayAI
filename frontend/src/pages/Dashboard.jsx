import { useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { unlockVoice, speakText, stopVoice } from "../voiceHelper"
import appTranslations from "../translations"

const styles = `
  .dashboard {
    min-height: 100vh;
    background-color: #F4F8F6;
    color: #111827;
    display: flex;
    flex-direction: column;
  }

  /* TOP NAV HEADER */
  .topbar {
    background: linear-gradient(135deg, #044E3B 0%, #0F6E56 60%, #085041 100%);
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: white;
    box-shadow: 0 4px 20px rgba(4, 78, 59, 0.15);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .topbar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-icon {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
  }
  .brand-text {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #FFFFFF;
  }
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .user-badge {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.88rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(4px);
  }
  .lang-pill {
    background: #E1F5EE;
    color: #044E3B;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
    text-transform: uppercase;
  }
  .topbar-logout {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    padding: 7px 16px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  .topbar-logout:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }

  /* MAIN LAYOUT */
  .dashboard-main {
    max-width: 1040px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 1.5rem 3rem;
  }

  /* VOICE ASSISTANT HERO CARD */
  .hero-card {
    background: linear-gradient(135deg, #FFFFFF 0%, #F0FAF5 100%);
    border: 1px solid #D1EBE1;
    border-radius: 20px;
    padding: 1.8rem 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 10px 30px -10px rgba(15, 110, 86, 0.1);
    position: relative;
    overflow: hidden;
  }
  .hero-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100%;
    background: linear-gradient(180deg, #0F6E56 0%, #10B981 100%);
    border-radius: 6px 0 0 6px;
  }
  .hero-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  @media(max-width: 640px) {
    .hero-content {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  .hero-text h1 {
    font-size: 1.5rem;
    font-weight: 800;
    color: #064E3B;
    margin-bottom: 6px;
    letter-spacing: -0.3px;
  }
  .hero-text p {
    color: #4B5563;
    font-size: 0.92rem;
  }
  
  /* MIC BUTTON & RIPPLE */
  .mic-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mic-btn {
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0F6E56 0%, #085041 100%);
    border: 3px solid #E1F5EE;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.75rem;
    box-shadow: 0 8px 20px rgba(15, 110, 86, 0.25);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2;
  }
  .mic-btn:hover {
    transform: scale(1.06);
    box-shadow: 0 12px 28px rgba(15, 110, 86, 0.35);
  }
  .mic-btn.listening {
    background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
    border-color: #FEE2E2;
    animation: micPulse 1.2s infinite;
  }
  @keyframes micPulse {
    0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
    70% { box-shadow: 0 0 0 18px rgba(220, 38, 38, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
  }

  /* QUICK PROMPTS CHIPS */
  .quick-prompts {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 14px;
  }
  .prompt-chip {
    background: #FFFFFF;
    border: 1px solid #D1EBE1;
    color: #0F6E56;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .prompt-chip:hover {
    background: #0F6E56;
    color: white;
    border-color: #0F6E56;
    transform: translateY(-1px);
  }

  /* VOICE FEEDBACK BOXES */
  .voice-status-bar {
    text-align: center;
    font-size: 0.88rem;
    font-weight: 500;
    color: #6B7280;
    margin-bottom: 1rem;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .voice-status-bar.active {
    color: #0F6E56;
    font-weight: 700;
  }

  .transcript-card {
    background: #FFFFFF;
    border-radius: 12px;
    padding: 10px 16px;
    margin-bottom: 1rem;
    border: 1px solid #E5EFEA;
    font-size: 0.88rem;
    color: #374151;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    display: none;
  }
  .transcript-card.visible { display: flex; align-items: center; gap: 8px; }

  .reply-card {
    background: linear-gradient(135deg, #E1F5EE 0%, #E6F7F2 100%);
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 1.5rem;
    border: 1px solid #9FE1CB;
    font-size: 0.95rem;
    color: #044E3B;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(15, 110, 86, 0.08);
    display: none;
  }
  .reply-card.visible { display: block; }

  .video-card {
    background: white;
    border-radius: 16px;
    padding: 1.2rem;
    border: 1px solid #E2EFE9;
    margin-bottom: 1.5rem;
    box-shadow: 0 6px 18px rgba(0,0,0,0.04);
  }
  .video-title {
    font-weight: 700;
    color: #064E3B;
    margin-bottom: 0.8rem;
    font-size: 0.98rem;
  }
  .video-frame {
    width: 100%;
    border-radius: 12px;
    aspect-ratio: 16/9;
    border: none;
  }
  .video-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 0.8rem;
    color: #0F6E56;
    font-size: 0.85rem;
    text-decoration: none;
    font-weight: 700;
  }
  .video-link:hover { text-decoration: underline; }

  /* MODULES GRID SECTION */
  .section-header {
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .section-title {
    font-size: 1.15rem;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.2px;
  }
  .section-subtitle {
    font-size: 0.82rem;
    color: #6B7280;
  }

  .modules-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
  @media(max-width: 680px) {
    .modules-grid { grid-template-columns: 1fr; }
  }

  .module-card {
    background: #FFFFFF;
    border-radius: 18px;
    padding: 1.5rem;
    border: 1px solid #E5EFEA;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: 0 4px 16px rgba(15, 110, 86, 0.04);
    position: relative;
  }
  .module-card:hover {
    border-color: #0F6E56;
    transform: translateY(-4px);
    box-shadow: 0 16px 32px -6px rgba(15, 110, 86, 0.12);
  }
  
  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.2rem;
  }
  .card-icon-box {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: #F0FAF5;
    border: 1px solid #D1EBE1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    transition: all 0.25s ease;
  }
  .module-card:hover .card-icon-box {
    background: #0F6E56;
    color: white;
    transform: scale(1.08);
  }
  
  .card-tag {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 12px;
    background: #F3F4F6;
    color: #4B5563;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .module-card:hover .card-tag {
    background: #E1F5EE;
    color: #044E3B;
  }

  .card-body h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }
  .card-body p {
    font-size: 0.84rem;
    color: #6B7280;
    line-height: 1.4;
  }

  .card-footer {
    margin-top: 1.2rem;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    font-weight: 700;
    color: #0F6E56;
  }
  .card-arrow {
    transition: transform 0.2s ease;
  }
  .module-card:hover .card-arrow {
    transform: translateX(4px);
  }
`

function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  const name = location.state?.name || "User"
  const language = location.state?.language || "english"
  const userId = location.state?.userId
  const t = appTranslations[language] || appTranslations["english"]

  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [replyText, setReplyText] = useState("")
  const [videoInfo, setVideoInfo] = useState(null)
  const [voiceStatus, setVoiceStatus] = useState("")

  useEffect(() => {
    return () => {
      stopVoice()
    }
  }, [])

  const langCodes = {
    kannada: "kn-IN",
    hindi: "hi-IN",
    english: "en-US",
  }

  const handleCommand = async (command) => {
    setVoiceStatus(language === "kannada" ? "ಆಲೋಚಿಸಲಾಗುತ್ತಿದೆ..." : language === "hindi" ? "सोच रहा हूँ..." : "Thinking...")
    setReplyText("")
    setVideoInfo(null)

    try {
      const response = await fetch(
        `http://localhost:8000/voice-assistant?message=${encodeURIComponent(command)}&language=${language}&name=${name}`,
        { method: "POST" }
      )
      const data = await response.json()
      setVoiceStatus(`${t.youSaid} "${command}"`)
      setReplyText(data.reply)
      speakText(data.reply, language, data.audio_base64)

      if (data.videos && data.videos.length > 0) {
        setVideoInfo(data.videos[0])
      }

      if (data.navigate_to) {
        setTimeout(() => {
          if (data.navigate_to === "logout") {
            navigate("/login-face")
          } else {
            navigate("/" + data.navigate_to, {
              state: { userId, name, language }
            })
          }
        }, 3500)
      }
    } catch {
      setVoiceStatus("Connection error")
      speakText("Sorry, I could not connect. Please try again.")
    }
  }

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setVoiceStatus("Please use Chrome browser")
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = langCodes[language] || "en-US"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setListening(true)
      setVoiceStatus(t.listening)
      setTranscript("")
      setReplyText("")
    }
    recognition.onresult = (e) => {
      const said = e.results[0][0].transcript
      setTranscript(said)
      handleCommand(said)
    }
    recognition.onerror = () => {
      setListening(false)
      setVoiceStatus("Could not hear clearly. Please try again.")
    }
    recognition.onend = () => { setListening(false) }
    recognition.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(false)
    setVoiceStatus("")
  }

  return (
    <>
      <style>{styles}</style>
      <div className="dashboard">
        
        {/* TOPNAV HEADER */}
        <header className="topbar">
          <div className="topbar-brand">
            <div className="brand-icon">⚕️</div>
            <span className="brand-text">SahayAI</span>
          </div>

          <div className="topbar-right">
            <div className="user-badge">
              <span>👤 {name}</span>
              <span className="lang-pill">{language}</span>
            </div>
            <button className="topbar-logout" onClick={() => navigate("/login-face")}>
              {t.logout}
            </button>
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="dashboard-main">
          
          {/* VOICE ASSISTANT HERO CARD */}
          <section className="hero-card">
            <div className="hero-content">
              <div className="hero-text">
                <h1>{t.greeting.replace("{name}", name)}</h1>
                <p>{t.tapMic}</p>
                
                {/* QUICK SUGGESTION CHIPS */}
                <div className="quick-prompts">
                  <span className="prompt-chip" onClick={() => handleCommand("Open prescription")}>
                    💊 {language === "kannada" ? "ಔಷಧಿ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ" : language === "hindi" ? "दवाई स्कैन करें" : "Scan prescription"}
                  </span>
                  <span className="prompt-chip" onClick={() => handleCommand("Show medical records")}>
                    📋 {language === "kannada" ? "ದಾಖಲೆಗಳನ್ನು ನೋಡಿ" : language === "hindi" ? "रिकॉर्ड्स देखें" : "Medical records"}
                  </span>
                  <span className="prompt-chip" onClick={() => handleCommand("Home remedy for headache")}>
                    🤕 {language === "kannada" ? "ತಲೆನೋವಿಗೆ ಮನೆಮದ್ದು" : language === "hindi" ? "सिरदर्द घरेलू उपाय" : "Remedy for headache"}
                  </span>
                </div>
              </div>

              <div className="mic-container">
                <button
                  className={`mic-btn ${listening ? "listening" : ""}`}
                  title="Click to speak with SahayAI"
                  onClick={() => {
                    unlockVoice()
                    synthRef.current.cancel()
                    listening ? stopListening() : startListening()
                  }}
                >
                  {listening ? "⏹️" : "🎙️"}
                </button>
              </div>
            </div>
          </section>

          {/* VOICE FEEDBACK BAR */}
          <div className={`voice-status-bar ${listening ? "active" : ""}`}>
            {listening ? `🔴 ${t.listening}...` : voiceStatus || t.tapToSpeak}
          </div>

          {/* TRANSCRIPT CARD */}
          <div className={`transcript-card ${transcript ? "visible" : ""}`}>
            <span>🗣️ <strong>{t.youSaid}:</strong> "{transcript}"</span>
          </div>

          {/* ASSISTANT REPLY CARD */}
          <div className={`reply-card ${replyText ? "visible" : ""}`}>
            🤖 {replyText}
          </div>

          {/* YOUTUBE REMEDY VIDEO CARD */}
          {videoInfo && (
            <div className="video-card">
              <div className="video-title">
                🎥 {language === "kannada" ? "ಮನೆ ಮದ್ದು ವೀಡಿಯೋ" :
                  language === "hindi" ? "घरेलू उपाय वीडियो" :
                  "Home Remedy Video"}
              </div>
              {videoInfo.embed_url ? (
                <iframe
                  className="video-frame"
                  src={videoInfo.embed_url}
                  title="Home remedy video"
                  allowFullScreen
                />
              ) : null}
              {videoInfo.search_url && (
                <a
                  className="video-link"
                  href={videoInfo.search_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  🔍 {language === "kannada" ? "ಹೆಚ್ಚಿನ ವೀಡಿಯೋ ಹುಡುಕಿ" :
                    language === "hindi" ? "और वीडियो खोजें" :
                    "Search more remedy videos on YouTube"} →
                </a>
              )}
            </div>
          )}

          {/* HEALTHCARE MODULES GRID */}
          <div className="section-header">
            <div>
              <div className="section-title">
                {language === "kannada" ? "ಆರೋಗ್ಯ ಸೇವೆಗಳು" : language === "hindi" ? "स्वास्थ्य सेवाएं" : "Healthcare Services"}
              </div>
              <div className="section-subtitle">
                {language === "kannada" ? "ನಿಮ್ಮ ಅಗತ್ಯಕ್ಕೆ ತಕ್ಕ ಸೇವೆ ಆಯ್ಕೆಮಾಡಿ" : language === "hindi" ? "अपनी आवश्यकतानुसार सेवा चुनें" : "Select a service to proceed"}
              </div>
            </div>
          </div>

          <div className="modules-grid">
            
            {/* PRESCRIPTION */}
            <div className="module-card"
              onClick={() => navigate("/prescription", { state: { userId, name, language } })}>
              <div className="card-top">
                <div className="card-icon-box">💊</div>
                <span className="card-tag">AI OCR</span>
              </div>
              <div className="card-body">
                <h3>{t.prescription}</h3>
                <p>{t.prescriptionDesc}</p>
              </div>
              <div className="card-footer">
                <span>{language === "kannada" ? "ಸ್ಕ್ಯಾನ್ ಮಾಡಿ" : language === "hindi" ? "स्कैन करें" : "Open Scanner"}</span>
                <span className="card-arrow">→</span>
              </div>
            </div>

            {/* MEDICAL RECORDS */}
            <div className="module-card"
              onClick={() => navigate("/records", { state: { userId, name, language } })}>
              <div className="card-top">
                <div className="card-icon-box">📋</div>
                <span className="card-tag">Vault</span>
              </div>
              <div className="card-body">
                <h3>{t.records}</h3>
                <p>{t.recordsDesc}</p>
              </div>
              <div className="card-footer">
                <span>{language === "kannada" ? "ದಾಖಲೆ ನೋಡಿ" : language === "hindi" ? "रिकॉर्ड्स खोलें" : "View Vault"}</span>
                <span className="card-arrow">→</span>
              </div>
            </div>

            {/* VOICE ASSISTANT */}
            <div className="module-card" onClick={() => { unlockVoice(); startListening() }}>
              <div className="card-top">
                <div className="card-icon-box">🎙️</div>
                <span className="card-tag">Voice AI</span>
              </div>
              <div className="card-body">
                <h3>{t.voiceAssistant}</h3>
                <p>{t.voiceAssistantDesc}</p>
              </div>
              <div className="card-footer">
                <span>{language === "kannada" ? "ಮಾತನಾಡಿ" : language === "hindi" ? "बात करें" : "Talk Now"}</span>
                <span className="card-arrow">→</span>
              </div>
            </div>

            {/* GOVT SCHEMES */}
            <div className="module-card"
              onClick={() => navigate("/schemes", { state: { userId, name, language } })}>
              <div className="card-top">
                <div className="card-icon-box">🏛️</div>
                <span className="card-tag">Benefits</span>
              </div>
              <div className="card-body">
                <h3>
                  {language === "kannada" ? "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು" :
                   language === "hindi" ? "सरकारी योजनाएं" :
                   "Govt Schemes"}
                </h3>
                <p>
                  {language === "kannada" ? "ನಿಮ್ಮ ಹಕ್ಕುಗಳನ್ನು ತಿಳಿಯಿರಿ" :
                   language === "hindi" ? "अपने अधिकार जानें" :
                   "Explore health schemes & rights"}
                </p>
              </div>
              <div className="card-footer">
                <span>{language === "kannada" ? "ಯೋಜನೆಗಳು ನೋಡಿ" : language === "hindi" ? "योजनाएं देखें" : "Explore Schemes"}</span>
                <span className="card-arrow">→</span>
              </div>
            </div>

            {/* USER PROFILE */}
            <div className="module-card"
              onClick={() => navigate("/profile", { state: { userId, name, language } })}>
              <div className="card-top">
                <div className="card-icon-box">👤</div>
                <span className="card-tag">Account</span>
              </div>
              <div className="card-body">
                <h3>{t.profile}</h3>
                <p>{t.profileDesc}</p>
              </div>
              <div className="card-footer">
                <span>{language === "kannada" ? "ಪ್ರೊಫೈಲ್ ನೋಡಿ" : language === "hindi" ? "प्रोफ़ाइल देखें" : "View Profile"}</span>
                <span className="card-arrow">→</span>
              </div>
            </div>

          </div>

        </main>
      </div>
    </>
  )
}

export default Dashboard