import { useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { unlockVoice, speakText as speakHelper, stopVoice } from "../voiceHelper"
import appTranslations from "../translations"

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #F4F8F6; color: #111827; }
  .page { min-height: 100vh; background: #F4F8F6; }
  .topbar {
    background: linear-gradient(135deg, #044E3B 0%, #0F6E56 60%, #085041 100%);
    padding: 1rem 2rem;
    display: flex; justify-content: space-between; align-items: center;
    box-shadow: 0 4px 20px rgba(4, 78, 59, 0.15);
    position: sticky; top: 0; z-index: 50;
  }
  .logo { color: white; font-weight: 800; font-size: 1.35rem; letter-spacing: -0.5px; display: flex; align-items: center; gap: 8px; }
  .back {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25);
    color: white; padding: 7px 16px; border-radius: 10px; cursor: pointer;
    font-weight: 600; font-size: 0.85rem; transition: all 0.2s ease;
  }
  .back:hover { background: rgba(255,255,255,0.25); transform: translateY(-1px); }
  
  .content { padding: 2rem 1.5rem 3rem; max-width: 1040px; margin: 0 auto; }
  .page-title { font-size: 1.5rem; font-weight: 800; color: #044E3B; margin-bottom: 4px; letter-spacing: -0.3px; }
  .page-sub { font-size: 0.9rem; color: #6B7280; margin-bottom: 1.5rem; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media(max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

  .panel {
    background: white; border-radius: 18px;
    border: 1px solid #E5EFEA; overflow: hidden;
    box-shadow: 0 6px 20px rgba(15, 110, 86, 0.05);
    display: flex; flex-direction: column;
  }
  .panel-header {
    background: linear-gradient(135deg, #044E3B 0%, #0F6E56 100%); padding: 14px 20px;
    color: white; font-weight: 700; font-size: 0.98rem;
    display: flex; align-items: center; gap: 10px;
    letter-spacing: -0.2px;
  }
  .panel-body { padding: 1.25rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }

  .camera-box {
    width: 100%; border-radius: 14px; overflow: hidden;
    background: #111827; margin-bottom: 1rem;
    aspect-ratio: 4/3; position: relative;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
  }
  .camera-box video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-placeholder {
    width: 100%; aspect-ratio: 4/3; border-radius: 14px;
    background: #F8FAF9; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    color: #6B7280; font-size: 0.88rem; margin-bottom: 1rem;
    border: 2px dashed #CBD5E1; text-align: center; padding: 1rem;
  }
  .camera-placeholder-icon { font-size: 3.2rem; margin-bottom: 0.5rem; opacity: 0.8; }

  .btn {
    width: 100%; padding: 12px;
    background: linear-gradient(135deg, #0F6E56 0%, #085041 100%);
    color: white; border: none; border-radius: 12px;
    font-size: 0.92rem; font-weight: 700; cursor: pointer;
    margin-bottom: 0.7rem; transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(15, 110, 86, 0.2);
  }
  .btn:hover { background: linear-gradient(135deg, #085041 0%, #044E3B 100%); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(15, 110, 86, 0.3); }
  .btn:disabled { background: #9CA3AF; cursor: not-allowed; box-shadow: none; transform: none; }
  
  .btn-outline {
    width: 100%; padding: 11px; background: white;
    color: #0F6E56; border: 1.5px solid #0F6E56;
    border-radius: 12px; font-size: 0.9rem;
    font-weight: 700; cursor: pointer; margin-bottom: 0.7rem;
    transition: all 0.2s ease;
  }
  .btn-outline:hover { background: #F0FAF5; transform: translateY(-1px); }

  .btn-dashed {
    width: 100%; padding: 11px; background: #F0FAF5;
    color: #0F6E56; border: 1.5px dashed #0F6E56;
    border-radius: 12px; font-size: 0.9rem;
    font-weight: 700; cursor: pointer; margin-bottom: 0.7rem;
    transition: all 0.2s ease;
  }
  .btn-dashed:hover { background: #E1F5EE; }

  .btn-dark {
    width: 100%; padding: 12px; background: #1F2937;
    color: white; border: none; border-radius: 12px;
    font-size: 0.92rem; font-weight: 700; cursor: pointer;
    margin-bottom: 0.7rem; transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(31, 41, 55, 0.15);
  }
  .btn-dark:hover { background: #111827; transform: translateY(-1px); }

  .warning-box {
    background: #FEF3C7; border: 1px solid #FCD34D;
    border-radius: 10px; padding: 10px 14px;
    font-size: 0.82rem; color: #92400E; margin-bottom: 1rem;
    display: flex; align-items: center; gap: 8px; font-weight: 500;
  }
  .med-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  @media(max-width: 600px) { .med-grid { grid-template-columns: 1fr; } }

  .med-card {
    background: linear-gradient(135deg, #F0FAF5 0%, #FFFFFF 100%);
    border-radius: 14px; padding: 14px;
    border: 1px solid #D1EBE1;
    box-shadow: 0 2px 8px rgba(15, 110, 86, 0.04);
  }
  .med-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .med-card-name { font-weight: 800; color: #044E3B; font-size: 1rem; }
  .med-card-dose { font-size: 0.82rem; color: #0F6E56; font-weight: 600; }
  .med-card-desc { font-size: 0.8rem; color: #4B5563; margin-bottom: 10px; font-style: italic; background: #FFFFFF; padding: 6px 10px; border-radius: 8px; border: 1px solid #E5EFEA; }
  .time-icons { display: flex; gap: 8px; flex-wrap: wrap; }
  .time-icon-box {
    background: white; border-radius: 10px;
    padding: 6px 12px; border: 1px solid #D1EBE1;
    display: flex; flex-direction: column;
    align-items: center; gap: 2px; min-width: 58px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  }
  .time-icon-label { font-size: 0.7rem; color: #6B7280; font-weight: 500; }
  .time-icon-tab { font-size: 0.75rem; font-weight: 700; color: #044E3B; }
  .med-duration { font-size: 0.78rem; color: #6B7280; margin-top: 8px; font-weight: 600; display: flex; align-items: center; gap: 4px; }

  .result-title { font-weight: 800; color: #044E3B; margin-bottom: 0.8rem; font-size: 1.1rem; }

  .tablet-result {
    background: linear-gradient(135deg, #E1F5EE 0%, #E6F7F2 100%);
    border-radius: 14px; padding: 14px 16px;
    border: 1px solid #9FE1CB; margin-bottom: 0.8rem;
    box-shadow: 0 4px 12px rgba(15, 110, 86, 0.06);
  }
  .tablet-result-name { font-weight: 800; color: #044E3B; font-size: 1.08rem; margin-bottom: 6px; }
  .tablet-result-desc { font-size: 0.88rem; color: #0F6E56; line-height: 1.4; }

  .msg-error {
    padding: 12px; background: #FEE2E2;
    border-radius: 10px; color: #991B1B;
    font-size: 0.85rem; margin-bottom: 0.8rem;
    border: 1px solid #FCA5A5; font-weight: 500;
  }
  .msg-success {
    padding: 12px; background: #E1F5EE;
    border-radius: 10px; color: #044E3B;
    font-size: 0.85rem; margin-bottom: 0.6rem;
    border: 1px solid #9FE1CB; text-align: center; font-weight: 600;
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

  useEffect(() => {
    return () => {
      stopVoice()
    }
  }, [])

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
        speakHelper(data.speech_text, language, data.audio_base64)
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
        `http://localhost:8000/identify-tablet?language=${language}`,
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
        speakHelper(data.speech_text || `${data.medicine}. ${data.description}`, language, data.audio_base64)
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
                      onClick={() => speakHelper(tabletResult.speech_text || `${tabletResult.medicine}. ${tabletResult.description}`, language, tabletResult.audio_base64)}
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

              <button className="btn-dark" onClick={() => speakHelper(result.speech_text, language, result.audio_base64)}>
                🔊 {t.readAloud}
              </button>



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