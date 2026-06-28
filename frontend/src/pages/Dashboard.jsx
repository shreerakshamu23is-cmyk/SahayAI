import { useState, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { unlockVoice, speakText } from "../voiceHelper"

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

const translations = {
  kannada: {
    greeting: `ನಮಸ್ಕಾರ, {name}!`,
    tapMic: "ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ",
    listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ... ಮಾತನಾಡಿ",
    tapToSpeak: "ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ",
    prescription: "ಔಷಧಿ ಚೀಟಿ",
    prescriptionDesc: "ನಿಮ್ಮ ಔಷಧಿ ಓದಿ",
    records: "ವೈದ್ಯಕೀಯ ದಾಖಲೆ",
    recordsDesc: "ಆರೋಗ್ಯ ಇತಿಹಾಸ",
    voice: "ಧ್ವನಿ ಸಹಾಯಕ",
    voiceDesc: "SahayAI ಜೊತೆ ಮಾತನಾಡಿ",
    profile: "ನನ್ನ ಪ್ರೊಫೈಲ್",
    profileDesc: "ನಿಮ್ಮ ವಿವರಗಳು",
    logout: "ನಿರ್ಗಮಿಸು",
    namaste: `ನಮಸ್ಕಾರ, {name} 🙏`,
  },
  hindi: {
    greeting: `नमस्ते, {name}!`,
    tapMic: "माइक दबाएं और बोलें",
    listening: "सुन रहा हूं... बोलिए",
    tapToSpeak: "माइक दबाएं और बोलें",
    prescription: "पर्चा",
    prescriptionDesc: "अपनी दवाई पढ़ें",
    records: "मेडिकल रिकॉर्ड",
    recordsDesc: "स्वास्थ्य इतिहास",
    voice: "आवाज सहायक",
    voiceDesc: "SahayAI से बात करें",
    profile: "मेरी प्रोफाइल",
    profileDesc: "अपना विवरण देखें",
    logout: "लॉगआउट",
    namaste: `नमस्ते, {name} 🙏`,
  },
  tamil: {
    greeting: `வணக்கம், {name}!`,
    tapMic: "மைக்கை அழுத்தி பேசுங்கள்",
    listening: "கேட்கிறேன்... பேசுங்கள்",
    tapToSpeak: "மைக்கை அழுத்தி பேசுங்கள்",
    prescription: "மருந்து சீட்டு",
    prescriptionDesc: "உங்கள் மருந்தை படியுங்கள்",
    records: "மருத்துவ பதிவுகள்",
    recordsDesc: "உடல்நலன் வரலாறு",
    voice: "குரல் உதவியாளர்",
    voiceDesc: "SahayAI உடன் பேசுங்கள்",
    profile: "என் சுயவிவரம்",
    profileDesc: "உங்கள் விவரங்கள்",
    logout: "வெளியேறு",
    namaste: `வணக்கம், {name} 🙏`,
  },
  english: {
    greeting: `Namaskara, {name}!`,
    tapMic: "Tap the mic to speak",
    listening: "Listening... speak now",
    tapToSpeak: "Tap the mic to speak",
    prescription: "Prescription",
    prescriptionDesc: "Scan and read your medicine",
    records: "Medical Records",
    recordsDesc: "View your health history",
    voice: "Voice Assistant",
    voiceDesc: "Talk to SahayAI",
    profile: "My Profile",
    profileDesc: "View your details",
    logout: "Logout",
    namaste: `Namaste, {name} 🙏`,
  }
}

function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  const name = location.state?.name || "User"
  const language = location.state?.language || "english"
  const userId = location.state?.userId
  const t = translations[language] || translations["english"]

  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [replyText, setReplyText] = useState("")
  const [voiceStatus, setVoiceStatus] = useState("")

  const langCodes = {
    kannada: "kn-IN", hindi: "hi-IN",
    tamil: "ta-IN", telugu: "te-IN",
    marathi: "mr-IN", bengali: "bn-IN",
    english: "en-US",
  }

  const handleCommand = async (command) => {
    setVoiceStatus("Thinking...")
    setReplyText("")

    try {
      const response = await fetch(
        `http://localhost:8000/voice-assistant?message=${encodeURIComponent(command)}&language=${language}&name=${name}`,
        { method: "POST" }
      )
      const data = await response.json()
      setVoiceStatus("Heard: " + command)
      setReplyText(data.reply)
      speakText(data.reply)

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
      setVoiceStatus("Connection error — is backend running?")
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
      setVoiceStatus("Listening... speak now")
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
            You said: "{transcript}"
          </div>

          <div className={`reply-box ${replyText ? "visible" : ""}`}>
            {replyText}
          </div>

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
              <div className="module-title">{t.voice}</div>
              <div className="module-desc">{t.voiceDesc}</div>
            </div>

            <div className="module-card"
              onClick={() => navigate("/profile", { state: { userId, name, language } })}>
              <div className="module-icon">👤</div>
              <div className="module-title">{t.profile}</div>
              <div className="module-desc">{t.profileDesc}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard