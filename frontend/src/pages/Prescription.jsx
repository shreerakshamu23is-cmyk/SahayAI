import { useState, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { unlockVoice, speakText as speakHelper } from "../voiceHelper"
import appTranslations from "../translations"

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f9f9f7; }
  .page { min-height: 100vh; }
  .topbar {
    background: #0F6E56; padding: 16px 24px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .logo { color: white; font-weight: 700; font-size: 1.3rem; }
  .back {
    background: rgba(255,255,255,0.15); border: none;
    color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer;
  }
  .content { padding: 1.5rem; max-width: 900px; margin: 0 auto; }
  .page-title { font-size: 1.3rem; font-weight: 700; color: #1a1a1a; margin-bottom: .2rem; }
  .page-sub { font-size: .85rem; color: #888; margin-bottom: 1.2rem; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
  @media(max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

  .panel {
    background: white; border-radius: 16px;
    border: 0.5px solid #e8e8e4; overflow: hidden;
  }
  .panel-header {
    background: #0F6E56; padding: 12px 16px;
    color: white; font-weight: 700; font-size: .95rem;
    display: flex; align-items: center; gap: 8px;
  }
  .panel-body { padding: 1rem; }

  .camera-box {
    width: 100%; border-radius: 10px; overflow: hidden;
    background: #1a1a1a; margin-bottom: .8rem;
    aspect-ratio: 4/3; position: relative;
  }
  .camera-box video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-placeholder {
    width: 100%; aspect-ratio: 4/3; border-radius: 10px;
    background: #f0f0f0; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #888; font-size: .85rem; margin-bottom: .8rem;
    border: 2px dashed #ccc;
  }
  .camera-placeholder-icon { font-size: 3rem; margin-bottom: .5rem; }

  .btn {
    width: 100%; padding: 11px; background: #0F6E56;
    color: white; border: none; border-radius: 10px;
    font-size: .9rem; font-weight: 600; cursor: pointer;
    margin-bottom: .6rem; transition: background .2s;
  }
  .btn:hover { background: #085041; }
  .btn:disabled { background: #aaa; cursor: not-allowed; }
  .btn-outline {
    width: 100%; padding: 11px; background: white;
    color: #0F6E56; border: 1.5px solid #0F6E56;
    border-radius: 10px; font-size: .9rem;
    font-weight: 600; cursor: pointer; margin-bottom: .6rem;
  }
  .btn-dashed {
    width: 100%; padding: 11px; background: #f0faf5;
    color: #0F6E56; border: 1.5px dashed #0F6E56;
    border-radius: 10px; font-size: .9rem;
    font-weight: 600; cursor: pointer; margin-bottom: .6rem;
  }
  .btn-dark {
    width: 100%; padding: 11px; background: #1a1a1a;
    color: white; border: none; border-radius: 10px;
    font-size: .9rem; font-weight: 600; cursor: pointer;
    margin-bottom: .6rem;
  }

  .warning-box {
    background: #FFF3CD; border: 1px solid #FFD700;
    border-radius: 8px; padding: 8px 12px;
    font-size: .78rem; color: #856404; margin-bottom: .8rem;
  }
  .med-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-bottom: .8rem; }
  @media(max-width: 500px) { .med-grid { grid-template-columns: 1fr; } }

  .med-card {
    background: #f0faf5; border-radius: 12px;
    padding: 12px; border: 1px solid #9FE1CB;
  }
  .med-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .med-card-name { font-weight: 700; color: #085041; font-size: .95rem; }
  .med-card-dose { font-size: .78rem; color: #0F6E56; }
  .med-card-desc { font-size: .75rem; color: #555; margin-bottom: 8px; font-style: italic; }
  .time-icons { display: flex; gap: 6px; flex-wrap: wrap; }
  .time-icon-box {
    background: white; border-radius: 8px;
    padding: 6px 10px; border: 1px solid #9FE1CB;
    display: flex; flex-direction: column;
    align-items: center; gap: 2px; min-width: 52px;
  }
  .time-icon-label { font-size: .65rem; color: #888; }
  .time-icon-tab { font-size: .7rem; font-weight: 600; color: #085041; }
  .med-duration { font-size: .75rem; color: #888; margin-top: 6px; }

  .result-title { font-weight: 700; color: #1a1a1a; margin-bottom: .6rem; font-size: 1rem; }

  .reminder-item {
    background: #fafafa; border-radius: 10px;
    padding: 10px 12px; margin-bottom: .6rem;
    border: 0.5px solid #e8e8e4;
  }
  .reminder-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; }
  .reminder-med-name { font-weight: 600; color: #1a1a1a; font-size: .85rem; }
  .reminder-freq { font-size: .75rem; color: #888; }
  .reminder-times { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
  .time-col { display: flex; flex-direction: column; gap: 3px; }
  .time-label { font-size: .7rem; color: #888; }
  .time-input {
    padding: 5px 8px; border-radius: 7px;
    border: 1.5px solid #e0e0dc;
    font-size: .85rem; background: #fafafa; width: 90px;
  }

  .tablet-result {
    background: #E1F5EE; border-radius: 10px;
    padding: 12px; border: 1px solid #9FE1CB; margin-bottom: .6rem;
  }
  .tablet-result-name { font-weight: 700; color: #085041; font-size: 1rem; margin-bottom: 4px; }
  .tablet-result-desc { font-size: .85rem; color: #0F6E56; }

  .msg-error {
    padding: 10px; background: #FCEBEB;
    border-radius: 8px; color: #A32D2D;
    font-size: .85rem; margin-bottom: .8rem;
    border: 1px solid #F7C1C1;
  }
  .msg-success {
    padding: 10px; background: #E1F5EE;
    border-radius: 8px; color: #085041;
    font-size: .85rem; margin-bottom: .6rem;
    border: 1px solid #9FE1CB; text-align: center;
  }
`

function Prescription() {
  const location = useLocation()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const tabletFileRef = useRef(null)

  const name = location.state?.name || "User"
  const language = location.state?.language || "english"
  const userId = location.state?.userId
  const t = { ...appTranslations["english"], ...appTranslations[language] }

  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [mode, setMode] = useState("options")
  const [reminderSet, setReminderSet] = useState(false)
  const [medDescriptions, setMedDescriptions] = useState({})

  const [tabletPhoto, setTabletPhoto] = useState(null)
  const [tabletLoading, setTabletLoading] = useState(false)
  const [tabletResult, setTabletResult] = useState(null)
  const [tabletError, setTabletError] = useState("")
  const [tabletMode, setTabletMode] = useState("options")

  const startCamera = async () => {
    setMode("camera")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
      setStreaming(true)
    } catch {
      setError("Camera not accessible. Please upload a photo instead.")
      setMode("options")
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
    setStreaming(false)
  }

  const takePhoto = () => {
    unlockVoice()
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    setPhoto(canvas.toDataURL("image/jpeg", 0.9))
    stopCamera()
    setMode("preview")
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setPhoto(ev.target.result); setMode("preview") }
    reader.readAsDataURL(file)
  }

  const handleTabletUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setTabletPhoto(ev.target.result); setTabletMode("preview") }
    reader.readAsDataURL(file)
  }

  const scanPrescription = async () => {
    if (!photo) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const blob = await fetch(photo).then(r => r.blob())
      const formData = new FormData()
      formData.append("file", blob, "prescription.jpg")

      const response = await fetch(
        `http://localhost:8000/scan-prescription/${userId}?language=${language}`,
        { method: "POST", body: formData }
      )
      if (!response.ok) {
        const errorText = await response.text()
        setError(`Server error ${response.status}: ${errorText || response.statusText}`)
        return
      }
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
        speakHelper(data.speech_text)
        fetchMedicineDescriptions(data.medicines)
      }
    } catch (err) {
      console.error("scanPrescription error:", err)
      setError("Could not connect to server")
    } finally {
      setLoading(false)
    }
  }

  const fetchMedicineDescriptions = async (medicines) => {
    if (!medicines) return
    const descriptions = {}
    await Promise.all(medicines.map(async (med) => {
      try {
        const res = await fetch(
          `http://localhost:8000/medicine-info?medicine=${encodeURIComponent(med.medicine)}&language=${language}`
        )
        const data = await res.json()
        descriptions[med.medicine] = data.description
      } catch {
        descriptions[med.medicine] = ""
      }
    }))
    setMedDescriptions(descriptions)
  }

  const identifyTablet = async () => {
    if (!tabletPhoto) return
    setTabletLoading(true)
    setTabletError("")
    setTabletResult(null)

    try {
      const blob = await fetch(tabletPhoto).then(r => r.blob())
      const formData = new FormData()
      formData.append("file", blob, "tablet.jpg")

      const response = await fetch(
        "http://localhost:8000/identify-tablet",
        { method: "POST", body: formData }
      )
      if (!response.ok) {
        const errorText = await response.text()
        setTabletError(`Server error ${response.status}: ${errorText || response.statusText}`)
        return
      }
      const data = await response.json()

      if (data.error) {
        setTabletError(data.error)
      } else if (data.found) {
        setTabletResult(data)
        speakHelper(`This appears to be ${data.medicine}. ${data.description}`)
      } else {
        setTabletError("Could not identify the tablet. Try a clearer photo showing the tablet name.")
      }
    } catch (err) {
      console.error("identifyTablet error:", err)
      setTabletError("Could not connect to server")
    } finally {
      setTabletLoading(false)
    }
  }

  const retake = () => {
    setPhoto(null)
    setResult(null)
    setError("")
    setReminderSet(false)
    setMode("options")
  }

  const retakeTablet = () => {
    setTabletPhoto(null)
    setTabletResult(null)
    setTabletError("")
    setTabletMode("options")
  }

  const setupReminders = async (medicines) => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications")
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      alert("Please allow notifications to set reminders")
      return
    }

    medicines.forEach((med, i) => {
      const times = []
      const t1 = document.getElementById(`reminder-${i}`)?.value
      if (t1) times.push(t1)
      const t2 = document.getElementById(`reminder2-${i}`)?.value
      if (t2) times.push(t2)
      const t3 = document.getElementById(`reminder3-${i}`)?.value
      if (t3) times.push(t3)
      const t4 = document.getElementById(`reminder4-${i}`)?.value
      if (t4) times.push(t4)

      times.forEach(timeStr => {
        const [hours, minutes] = timeStr.split(":").map(Number)
        const scheduleNext = () => {
          const now = new Date()
          const target = new Date()
          target.setHours(hours, minutes, 0, 0)
          if (target <= now) target.setDate(target.getDate() + 1)
          const delay = target.getTime() - now.getTime()
          const hrs = target.getHours()
          const mins = target.getMinutes().toString().padStart(2, "0")
          const ampm = hrs >= 12 ? "PM" : "AM"
          const displayHr = hrs % 12 || 12
          const timeDisplay = `${displayHr}:${mins} ${ampm}`
          setTimeout(() => {
            new Notification("SahayAI Medicine Reminder 💊", {
              body: `Time to take ${med.medicine} ${med.dose || ""} — ${timeDisplay}`,
              icon: "/vite.svg",
              requireInteraction: true
            })
            speakHelper(`Time to take ${med.medicine} ${med.dose || ""}`)
            scheduleNext()
          }, delay)
        }
        scheduleNext()
      })
    })
    setReminderSet(true)
  }

  const getFrequencyTimes = (frequency) => {
    if (!frequency) return "once"
    const f = frequency.toLowerCase()
    if (f.includes("twice") || f.includes("two") || f.includes("2 time")) return "twice"
    if (f.includes("three") || f.includes("thrice") || f.includes("3 time")) return "three"
    if (f.includes("four") || f.includes("4 time")) return "four"
    return "once"
  }

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <div className="topbar">
          <span className="logo">SahayAI</span>
          <button className="back" onClick={() => {
            stopCamera()
            navigate("/dashboard", { state: { userId, name, language } })
          }}>← Back</button>
        </div>

        <div className="content">
          <div className="page-title">💊 {t.prescriptionTitle}</div>
          <div className="page-sub">{t.prescriptionSub}</div>

          <div className="two-col">

            {/* LEFT PANEL — Prescription Scanner */}
            <div className="panel">
              <div className="panel-header">
                📋 {t.scanPrescriptionPanel}
              </div>
              <div className="panel-body">

                {mode === "options" && (
                  <>
                    <div className="camera-placeholder">
                      <div className="camera-placeholder-icon">📄</div>
                      <div>{t.uploadOrTakePhoto}</div>
                    </div>
                    <button className="btn" onClick={() => { unlockVoice(); startCamera() }}>
                      📷 {t.openCamera}
                    </button>
                    <button className="btn-dashed" onClick={() => { unlockVoice(); fileRef.current.click() }}>
                      📁 {t.uploadGallery}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*"
                      style={{ display: "none" }} onChange={handleFileUpload} />
                  </>
                )}

                {mode === "camera" && (
                  <>
                    <div className="camera-box">
                      <video ref={videoRef} autoPlay playsInline muted />
                    </div>
                    <button className="btn" onClick={takePhoto} disabled={!streaming}>
                      📸 {t.capturePhoto}
                    </button>
                    <button className="btn-outline" onClick={() => { stopCamera(); setMode("options") }}>
                      {t.cancel}
                    </button>
                  </>
                )}

                {mode === "preview" && (
                  <>
                    <div className="camera-box">
                      <img src={photo} alt="prescription" />
                    </div>
                    <button className="btn" onClick={scanPrescription} disabled={loading}>
                      {loading ? t.reading : t.readPrescription}
                    </button>
                    <button className="btn-outline" onClick={retake}>
                      🔄 {t.retakePhoto}
                    </button>
                  </>
                )}

                <canvas ref={canvasRef} style={{ display: "none" }} />
                {error && <div className="msg-error">{error}</div>}

              </div>
            </div>

            {/* RIGHT PANEL — Tablet Identifier */}
            <div className="panel">
              <div className="panel-header">
                🔍 {t.identifyTabletPanel}
              </div>
              <div className="panel-body">

                {tabletMode === "options" && (
                  <>
                    <div className="camera-placeholder">
                      <div className="camera-placeholder-icon">💊</div>
                      <div>{t.takePhotoTablet}</div>
                    </div>
                    <button className="btn" onClick={() => {
                      setTabletMode("camera_tablet")
                    }}>
                      📷 {t.takePhotoTablet}
                    </button>
                    <button className="btn-dashed" onClick={() => { tabletFileRef.current.click() }}>
                      📁 {t.uploadTabletPhoto}
                    </button>
                    <input ref={tabletFileRef} type="file" accept="image/*"
                      style={{ display: "none" }} onChange={handleTabletUpload} />
                  </>
                )}

                {tabletMode === "camera_tablet" && (
                  <div style={{ textAlign: "center", padding: "1rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
                    <p style={{ color: "#888", fontSize: ".85rem", marginBottom: "1rem" }}>
                      Camera for tablet identification — use Upload for now
                    </p>
                    <button className="btn-dashed" onClick={() => { tabletFileRef.current.click() }}>
                      📁 {t.uploadTabletPhoto}
                    </button>
                    <button className="btn-outline" onClick={() => setTabletMode("options")}>
                      {t.cancel}
                    </button>
                    <input ref={tabletFileRef} type="file" accept="image/*"
                      style={{ display: "none" }} onChange={handleTabletUpload} />
                  </div>
                )}

                {tabletMode === "preview" && (
                  <>
                    <div className="camera-box">
                      <img src={tabletPhoto} alt="tablet" />
                    </div>
                    <button className="btn" onClick={identifyTablet} disabled={tabletLoading}>
                      {tabletLoading ? t.identifying : t.identifyThis}
                    </button>
                    <button className="btn-outline" onClick={retakeTablet}>
                      {t.tryAnotherPhoto}
                    </button>
                  </>
                )}

                {tabletError && <div className="msg-error">{tabletError}</div>}

                {tabletResult && (
                  <div className="tablet-result">
                    <div className="tablet-result-name">
                      💊 {tabletResult.medicine}
                    </div>
                    <div className="tablet-result-desc">
                      {tabletResult.description}
                    </div>
                    <button
                      className="btn"
                      style={{ marginTop: "10px" }}
                      onClick={() => speakHelper(`This is ${tabletResult.medicine}. ${tabletResult.description}`)}
                    >
                      {t.readAloudTablet}
                    </button>
                  </div>
                )}

                {!tabletResult && tabletMode === "options" && (
                  <div style={{
                    marginTop: ".5rem", padding: "10px",
                    background: "#f0faf5", borderRadius: "8px",
                    fontSize: ".78rem", color: "#0F6E56",
                    border: "1px solid #9FE1CB"
                  }}>
                    {t.tabletTip}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* RESULTS SECTION — full width below */}
          {result && (
            <div style={{
              background: "white", borderRadius: "16px",
              padding: "1.5rem", border: "0.5px solid #e8e8e4",
              marginTop: "1.2rem"
            }}>
              <div className="result-title">
                💊 {t.medicinesFound} ({result.medicines?.length || 0})
              </div>
              <div className="warning-box">{t.warning}</div>
              {result.note && (
                <div className="msg-error" style={{ background: "#fff4e5", borderColor: "#ffd79a", color: "#7a5a00" }}>
                  {result.note}
                </div>
              )}

              {/* Medicine cards — 2 columns */}
              <div className="med-grid">
                {result.medicines && result.medicines.length > 0 ?
                  result.medicines.map((med, i) => {
                    const freq = getFrequencyTimes(med.frequency)
                    const timeIcons = {
                      once:  [{ icon: "🌅", label: t.morning }],
                      twice: [{ icon: "🌅", label: t.morning }, { icon: "🌙", label: t.evening }],
                      three: [{ icon: "🌅", label: t.morning }, { icon: "☀️", label: t.afternoon }, { icon: "🌙", label: t.evening }],
                      four:  [{ icon: "🌅", label: t.morning }, { icon: "☀️", label: t.afternoon }, { icon: "🌆", label: t.evening }, { icon: "🌙", label: t.night }],
                    }
                    const icons = timeIcons[freq] || timeIcons["once"]

                    return (
                      <div key={i} className="med-card">
                        <div className="med-card-top">
                          <span style={{ fontSize: "1.3rem" }}>💊</span>
                          <div>
                            <div className="med-card-name">{med.medicine}</div>
                            <div className="med-card-dose">{med.dose}</div>
                          </div>
                        </div>
                        {medDescriptions[med.medicine] && (
                          <div className="med-card-desc">
                            ℹ️ {medDescriptions[med.medicine]}
                          </div>
                        )}
                        <div className="time-icons">
                          {icons.map((item, j) => (
                            <div key={j} className="time-icon-box">
                              <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                              <span className="time-icon-label">{item.label}</span>
                              <span className="time-icon-tab">1 tab</span>
                            </div>
                          ))}
                        </div>
                        {med.duration && (
                          <div className="med-duration">📅 {med.duration}</div>
                        )}
                      </div>
                    )
                  })
                : (
                  <div style={{ color: "#888", padding: "1rem" }}>
                    {t.noMedicines}
                  </div>
                )}
              </div>

              <button className="btn-dark" onClick={() => speakHelper(result.speech_text)}>
                🔊 {t.readAloud}
              </button>

              {/* Reminders */}
              <div style={{
                marginTop: "1rem", padding: "1rem",
                background: "#f0faf5", borderRadius: "12px",
                border: "1px solid #9FE1CB"
              }}>
                <div style={{ fontWeight: 700, fontSize: ".95rem", color: "#085041", marginBottom: ".3rem" }}>
                  ⏰ {t.setReminders}
                </div>
                <p style={{ fontSize: ".8rem", color: "#0F6E56", marginBottom: ".8rem" }}>
                  {t.reminderSub}
                </p>

                {result.medicines && result.medicines.map((med, i) => {
                  const freq = getFrequencyTimes(med.frequency)
                  return (
                    <div key={i} className="reminder-item">
                      <div className="reminder-top">
                        <div>
                          <div className="reminder-med-name">{med.medicine}</div>
                          <div className="reminder-freq">{med.frequency}</div>
                        </div>
                      </div>
                      <div className="reminder-times">
                        <div className="time-col">
                          <label className="time-label">🌅 {t.morning}</label>
                          <input type="time" defaultValue="08:00"
                            id={`reminder-${i}`} className="time-input" />
                        </div>
                        {(freq === "twice" || freq === "three" || freq === "four") && (
                          <div className="time-col">
                            <label className="time-label">☀️ {t.afternoon}</label>
                            <input type="time" defaultValue="14:00"
                              id={`reminder2-${i}`} className="time-input" />
                          </div>
                        )}
                        {(freq === "three" || freq === "four") && (
                          <div className="time-col">
                            <label className="time-label">🌆 {t.evening}</label>
                            <input type="time" defaultValue="20:00"
                              id={`reminder3-${i}`} className="time-input" />
                          </div>
                        )}
                        {freq === "four" && (
                          <div className="time-col">
                            <label className="time-label">🌙 {t.night}</label>
                            <input type="time" defaultValue="22:00"
                              id={`reminder4-${i}`} className="time-input" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <button className="btn" onClick={() => setupReminders(result.medicines)}>
                  🔔 {t.setAllReminders}
                </button>
                {reminderSet && (
                  <div className="msg-success">{t.remindersSet}</div>
                )}
              </div>

              <details style={{ marginTop: "1rem" }}>
                <summary style={{ cursor: "pointer", color: "#888", fontSize: ".8rem" }}>
                  Show raw text
                </summary>
                <div style={{
                  background: "#f9f9f7", borderRadius: "8px",
                  padding: "10px", fontSize: ".78rem", color: "#888",
                  marginTop: ".5rem", whiteSpace: "pre-wrap"
                }}>
                  {result.raw_text}
                </div>
              </details>

            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Prescription