import { useState, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { unlockVoice, speakText as speakHelper } from "../voiceHelper"

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f9f9f7; }
  .page { min-height: 100vh; }
  .topbar {
    background: #0F6E56; padding: 16px 24px;
    display: flex; justify-content: space-between;
    align-items: center;
  }
  .logo { color: white; font-weight: 700; font-size: 1.3rem; }
  .back {
    background: rgba(255,255,255,0.15); border: none;
    color: white; padding: 8px 16px;
    border-radius: 8px; cursor: pointer;
  }
  .content { padding: 2rem; max-width: 600px; margin: 0 auto; }
  .title { font-size: 1.4rem; font-weight: 700; color: #1a1a1a; margin-bottom: .3rem; }
  .sub { font-size: .85rem; color: #888; margin-bottom: 1.5rem; }
  .camera-box {
    width: 100%; border-radius: 16px; overflow: hidden;
    background: #1a1a1a; margin-bottom: 1.2rem;
    aspect-ratio: 4/3; position: relative;
  }
  .camera-box video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .btn {
    width: 100%; padding: 13px; background: #0F6E56;
    color: white; border: none; border-radius: 12px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    margin-bottom: .8rem; transition: background .2s;
  }
  .btn:hover { background: #085041; }
  .btn:disabled { background: #aaa; cursor: not-allowed; }
  .btn-outline {
    width: 100%; padding: 13px; background: white;
    color: #0F6E56; border: 1.5px solid #0F6E56;
    border-radius: 12px; font-size: 1rem;
    font-weight: 600; cursor: pointer; margin-bottom: .8rem;
  }
  .upload-btn {
    width: 100%; padding: 13px; background: #f0faf5;
    color: #0F6E56; border: 1.5px dashed #0F6E56;
    border-radius: 12px; font-size: 1rem;
    font-weight: 600; cursor: pointer; margin-bottom: .8rem;
  }
  .result-card {
    background: white; border-radius: 16px;
    padding: 1.5rem; border: 0.5px solid #e8e8e4;
    margin-top: 1rem;
  }
  .result-title { font-weight: 700; color: #1a1a1a; margin-bottom: .8rem; font-size: 1.1rem; }
  .medicine-item {
    background: #f0faf5; border-radius: 10px;
    padding: 12px; margin-bottom: .8rem;
    border: 1px solid #9FE1CB;
  }
  .med-name { font-weight: 600; color: #085041; font-size: 1rem; }
  .med-detail { color: #0F6E56; font-size: .85rem; margin-top: 4px; }
  .raw-text {
    background: #f9f9f7; border-radius: 10px;
    padding: 12px; font-size: .8rem; color: #888;
    margin-top: 1rem; white-space: pre-wrap;
  }
  .speak-btn {
    width: 100%; padding: 13px; background: #1a1a1a;
    color: white; border: none; border-radius: 12px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    margin-top: 1rem;
  }
  .msg-error {
    padding: 12px; background: #FCEBEB;
    border-radius: 10px; color: #A32D2D;
    font-size: .9rem; margin-top: 1rem;
    border: 1px solid #F7C1C1;
  }
  .warning-box {
    background: #FFF3CD; border: 1px solid #FFD700;
    border-radius: 8px; padding: 10px 14px;
    font-size: .8rem; color: #856404; margin-bottom: 1rem;
  }
`

const reminderStyles = {
  section: {
    marginTop: "1.5rem", padding: "1.2rem",
    background: "#f0faf5", borderRadius: "12px",
    border: "1px solid #9FE1CB"
  },
  title: { fontWeight: 700, fontSize: "1rem", color: "#085041", marginBottom: ".3rem" },
  sub: { fontSize: ".85rem", color: "#0F6E56", marginBottom: "1rem" },
  reminderItem: {
    background: "white", borderRadius: "10px",
    padding: "12px", marginBottom: ".8rem",
    border: "0.5px solid #e8e8e4"
  },
  medName: { fontWeight: 600, color: "#1a1a1a", marginBottom: "2px" },
  medFreq: { fontSize: ".8rem", color: "#888", marginBottom: ".5rem" },
  timeRow: { display: "flex", gap: "12px", flexWrap: "wrap" },
  timeCol: { display: "flex", flexDirection: "column", gap: "4px" },
  timeLabel: { fontSize: ".75rem", color: "#888", fontWeight: 500 },
  timeInput: {
    padding: "6px 10px", borderRadius: "8px",
    border: "1.5px solid #e0e0dc",
    fontSize: ".9rem", background: "#fafafa"
  },
  setBtn: {
    width: "100%", padding: "12px", background: "#0F6E56",
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "1rem", fontWeight: 600, cursor: "pointer", marginTop: ".5rem"
  },
  success: {
    marginTop: ".8rem", padding: "10px",
    background: "#E1F5EE", borderRadius: "8px",
    color: "#085041", fontSize: ".9rem", textAlign: "center"
  }
}

function Prescription() {
  const location = useLocation()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)

  const name = location.state?.name || "User"
  const language = location.state?.language || "english"
  const userId = location.state?.userId

  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")
  const [mode, setMode] = useState("options")
  const [reminderSet, setReminderSet] = useState(false)

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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setPhoto(dataUrl)
    stopCamera()
    setMode("preview")
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPhoto(ev.target.result)
      setMode("preview")
    }
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
      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        setResult(data)
        speakHelper(data.speech_text)
      }
    } catch {
      setError("Could not connect to server")
    } finally {
      setLoading(false)
    }
  }

  const retake = () => {
    setPhoto(null)
    setResult(null)
    setError("")
    setReminderSet(false)
    setMode("options")
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
    if (f.includes("twice") || f.includes("two")) return "twice"
    if (f.includes("three") || f.includes("thrice")) return "three"
    if (f.includes("four")) return "four"
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
          <div className="title">Prescription Scanner</div>
          <div className="sub">Scan your prescription and we'll read it aloud</div>

          {mode === "options" && (
            <>
              <button className="btn" onClick={() => { unlockVoice(); startCamera() }}>
                📷 Open Camera
              </button>
              <button className="upload-btn" onClick={() => { unlockVoice(); fileRef.current.click() }}>
                📁 Upload from Gallery
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
                📸 Capture Prescription
              </button>
              <button className="btn-outline" onClick={() => { stopCamera(); setMode("options") }}>
                Cancel
              </button>
            </>
          )}

          {mode === "preview" && (
            <>
              <div className="camera-box">
                <img src={photo} alt="prescription" />
              </div>
              <button className="btn" onClick={scanPrescription} disabled={loading}>
                {loading ? "Reading prescription..." : "🔍 Read Prescription"}
              </button>
              <button className="btn-outline" onClick={retake}>
                🔄 Take another photo
              </button>
            </>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />
          {error && <div className="msg-error">{error}</div>}

          {result && (
            <div className="result-card">
              <div className="result-title">
                💊 Medicines Found ({result.medicines?.length || 0})
              </div>
              <div className="warning-box">
                ⚠️ Always verify with your doctor or pharmacist before taking medicines
              </div>

              {result.medicines && result.medicines.length > 0 ? (
                result.medicines.map((med, i) => (
                  <div className="medicine-item" key={i}>
                    <div className="med-name">{med.medicine}</div>
                    <div className="med-detail">
                      {med.dose && `${med.dose} · `}
                      {med.frequency && `${med.frequency}`}
                      {med.duration && ` · ${med.duration}`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="med-detail">No medicines detected. Try a clearer photo.</div>
              )}

              <button className="speak-btn" onClick={() => speakHelper(result.speech_text)}>
                🔊 Read aloud again
              </button>

              <div style={reminderStyles.section}>
                <div style={reminderStyles.title}>⏰ Set Medicine Reminders</div>
                <p style={reminderStyles.sub}>We'll remind you when to take your medicines</p>

                {result.medicines && result.medicines.map((med, i) => {
                  const freq = getFrequencyTimes(med.frequency)
                  return (
                    <div style={reminderStyles.reminderItem} key={i}>
                      <div style={reminderStyles.medName}>{med.medicine}</div>
                      <div style={reminderStyles.medFreq}>{med.frequency}</div>
                      <div style={reminderStyles.timeRow}>
                        <div style={reminderStyles.timeCol}>
                          <label style={reminderStyles.timeLabel}>Morning</label>
                          <input type="time" defaultValue="08:00"
                            id={`reminder-${i}`} style={reminderStyles.timeInput} />
                        </div>
                        {(freq === "twice" || freq === "three" || freq === "four") && (
                          <div style={reminderStyles.timeCol}>
                            <label style={reminderStyles.timeLabel}>Afternoon</label>
                            <input type="time" defaultValue="14:00"
                              id={`reminder2-${i}`} style={reminderStyles.timeInput} />
                          </div>
                        )}
                        {(freq === "twice" || freq === "three" || freq === "four") && (
                          <div style={reminderStyles.timeCol}>
                            <label style={reminderStyles.timeLabel}>Evening</label>
                            <input type="time" defaultValue="20:00"
                              id={`reminder3-${i}`} style={reminderStyles.timeInput} />
                          </div>
                        )}
                        {freq === "four" && (
                          <div style={reminderStyles.timeCol}>
                            <label style={reminderStyles.timeLabel}>Night</label>
                            <input type="time" defaultValue="22:00"
                              id={`reminder4-${i}`} style={reminderStyles.timeInput} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <button style={reminderStyles.setBtn}
                  onClick={() => setupReminders(result.medicines)}>
                  🔔 Set All Reminders
                </button>
                {reminderSet && (
                  <div style={reminderStyles.success}>
                    ✅ Reminders set! You'll be notified daily.
                  </div>
                )}
              </div>

              <details style={{ marginTop: "1rem" }}>
                <summary style={{ cursor: "pointer", color: "#888", fontSize: ".85rem" }}>
                  Show raw text
                </summary>
                <div className="raw-text">{result.raw_text}</div>
              </details>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Prescription