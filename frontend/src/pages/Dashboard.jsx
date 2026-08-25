import { useState, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { unlockVoice, speakText } from "../voiceHelper"
import appTranslations from "../translations"

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f9f9f7; }
  .dashboard { min-height: 100vh; }
  .topbar {
    background: #0F6E56; padding: 16px 24px;
    display: flex; align-items: center;
    justify-content: space-between; color: white;
  }
  .topbar-logo { font-size: 1.3rem; font-weight: 700; }
  .topbar-user { font-size: .9rem; opacity: .85; }
  .topbar-logout {
    background: rgba(255,255,255,0.15);
    border: none; color: white; padding: 8px 16px;
    border-radius: 8px; cursor: pointer; font-size: .85rem;
  }
  .main { padding: 2rem; max-width: 800px; margin: 0 auto; }
  .welcome-card {
    background: white; border-radius: 16px;
    padding: 1.5rem; margin-bottom: 1.5rem;
    border: 0.5px solid #e8e8e4;
    display: flex; align-items: center;
    justify-content: space-between;
  }
  .welcome-text h2 { font-size: 1.3rem; color: #1a1a1a; }
  .welcome-text p { color: #888; font-size: .85rem; margin-top: 4px; }
  .mic-btn {
    width: 64px; height: 64px; border-radius: 50%;
    background: #0F6E56; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; transition: all .2s; flex-shrink: 0;
  }
  .mic-btn.listening { background: #e53935; animation: pulse 1s infinite; }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(229,57,53,0.4); }
    70%  { box-shadow: 0 0 0 16px rgba(229,57,53,0); }
    100% { box-shadow: 0 0 0 0 rgba(229,57,53,0); }
  }
  .voice-status {
    text-align: center; font-size: .85rem;
    color: #888; margin-bottom: 1.5rem; min-height: 20px;
  }
  .voice-status.active { color: #0F6E56; font-weight: 600; }
  .reply-box {
    background: #f0faf5; border-radius: 12px;
    padding: 12px 16px; margin-bottom: 1rem;
    border: 1px solid #9FE1CB; font-size: .9rem;
    color: #085041; min-height: 44px; display: none;
  }
  .reply-box.visible { display: block; }
  .video-card {
    background: white; border-radius: 16px;
    padding: 1.2rem; border: 0.5px solid #e8e8e4;
    margin-bottom: 1rem;
  }
  .video-title {
    font-weight: 700; color: #1a1a1a;
    margin-bottom: .8rem; font-size: .95rem;
  }
  .video-frame {
    width: 100%; border-radius: 10px;
    aspect-ratio: 16/9; border: none;
  }
  .video-link {
    display: block; text-align: center;
    margin-top: .8rem; color: #0F6E56;
    font-size: .85rem; text-decoration: none;
    font-weight: 600;
  }
  .transcript-box {
    background: #f9f9f7; border-radius: 12px;
    padding: 8px 16px; margin-bottom: 1rem;
    border: 1px solid #e8e8e4; font-size: .85rem;
    color: #888; display: none;
  }
  .transcript-box.visible { display: block; }
  .modules-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  .module-card {
    background: white; border-radius: 16px;
    padding: 1.5rem; border: 0.5px solid #e8e8e4;
    cursor: pointer; transition: all .2s; text-align: center;
  }
  .module-card:hover { border-color: #0F6E56; transform: translateY(-2px); }
  .module-icon { font-size: 2rem; margin-bottom: .8rem; }
  .module-title { font-size: 1rem; font-weight: 600; color: #1a1a1a; }
  .module-desc { font-size: .8rem; color: #888; margin-top: 4px; }
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

  const langCodes = {
    kannada: "kn-IN",
    hindi: "hi-IN",
    english: "en-US",
  }

  const handleCommand = async (command) => {
    setVoiceStatus("Thinking...")
    setReplyText("")
    setVideoInfo(null)

    try {
      const response = await fetch(
        `http://localhost:8000/voice-assistant?message=${encodeURIComponent(command)}&language=${language}&name=${name}`,
        { method: "POST" }
      )
      const data = await response.json()
      setVoiceStatus(`${t.youSaid} ${command}`)
      setReplyText(data.reply)
      speakText(data.reply)

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
      setVoiceStatus("Could not hear. Try again.")
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
        <div className="topbar">
          <div className="topbar-logo">SahayAI</div>
          <div className="topbar-user">{t.namaste.replace("{name}", name)}</div>
          <button className="topbar-logout" onClick={() => navigate("/login-face")}>
            {t.logout}
          </button>
        </div>

        <div className="main">
          <div className="welcome-card">
            <div className="welcome-text">
              <h2>{t.greeting.replace("{name}", name)}</h2>
              <p>{t.tapMic}</p>
            </div>
            <button
              className={`mic-btn ${listening ? "listening" : ""}`}
              onClick={() => {
                unlockVoice()
                synthRef.current.cancel()
                listening ? stopListening() : startListening()
              }}
            >
              {listening ? "⏹️" : "🎙️"}
            </button>
          </div>

          <div className={`voice-status ${listening ? "active" : ""}`}>
            {listening ? t.listening : voiceStatus || t.tapToSpeak}
          </div>

          <div className={`transcript-box ${transcript ? "visible" : ""}`}>
            {t.youSaid} "{transcript}"
          </div>

          <div className={`reply-box ${replyText ? "visible" : ""}`}>
            {replyText}
          </div>

          {videoInfo && (
            <div className="video-card">
              <div className="video-title">
                🎥 {language === "kannada" ? "ಮನೆ ಮದ್ದು ವೀಡಿಯೋ" :
                  language === "hindi" ? "घरेलू उपाय वीडियो" :
                  "Home remedy video"}
              </div>
              {videoInfo.embed_url ? (
                <iframe
                  className="video-frame"
                  src={videoInfo.embed_url}
                  title="Home remedy"
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
                    "Search more videos on YouTube"}
                </a>
              )}
            </div>
          )}

          <div className="modules-grid">
            <div className="module-card"
              onClick={() => navigate("/prescription", { state: { userId, name, language } })}>
              <div className="module-icon">💊</div>
              <div className="module-title">{t.prescription}</div>
              <div className="module-desc">{t.prescriptionDesc}</div>
            </div>

            <div className="module-card"
              onClick={() => navigate("/records", { state: { userId, name, language } })}>
              <div className="module-icon">📋</div>
              <div className="module-title">{t.records}</div>
              <div className="module-desc">{t.recordsDesc}</div>
            </div>

            <div className="module-card" onClick={() => { unlockVoice(); startListening() }}>
              <div className="module-icon">🎙️</div>
              <div className="module-title">{t.voiceAssistant}</div>
              <div className="module-desc">{t.voiceAssistantDesc}</div>
            </div>

            <div className="module-card"
              onClick={() => navigate("/profile", { state: { userId, name, language } })}>
              <div className="module-icon">👤</div>
              <div className="module-title">{t.profile}</div>
              <div className="module-desc">{t.profileDesc}</div>
            </div>

            <div className="module-card"
                onClick={() => navigate("/schemes", { state: { userId, name, language } })}>
                <div className="module-icon">🏛️</div>
                <div className="module-title">
                  {language === "kannada" ? "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು" :
                  language === "hindi" ? "सरकारी योजनाएं" :
                  "Govt Schemes"}
            </div>
            <div className="module-desc">
              {language === "kannada" ? "ನಿಮ್ಮ ಹಕ್ಕುಗಳನ್ನು ತಿಳಿಯಿರಿ" :
              language === "hindi" ? "अपने अधिकार जानें" :
              "Know your rights"}
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard