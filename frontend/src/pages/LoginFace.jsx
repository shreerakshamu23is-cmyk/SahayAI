import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { unlockVoice, speakText } from "../voiceHelper"

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #f9f9f7; }
  .face-page {
    min-height: 100vh; display: flex;
    align-items: center; justify-content: center; padding: 2rem;
  }
  .face-card {
    background: white; border-radius: 20px;
    padding: 2.5rem 2rem; width: 100%; max-width: 480px;
    border: 0.5px solid #e8e8e4; text-align: center;
  }
  .face-title { font-size: 1.4rem; font-weight: 700; color: #1a1a1a; margin-bottom: .3rem; }
  .face-sub { font-size: .85rem; color: #888; margin-bottom: 1.5rem; }
  .camera-box {
    width: 100%; border-radius: 16px; overflow: hidden;
    background: #1a1a1a; margin-bottom: 1.2rem;
    position: relative; aspect-ratio: 4/3;
  }
  .camera-box video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camera-overlay {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 180px; height: 220px;
    border: 3px solid rgba(255,255,255,0.6);
    border-radius: 50%; pointer-events: none;
  }
  .btn {
    width: 100%; padding: 13px; background: #0F6E56;
    color: white; border: none; border-radius: 12px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    margin-top: .5rem; transition: background .2s;
  }
  .btn:hover { background: #085041; }
  .btn:disabled { background: #aaa; cursor: not-allowed; }
  .btn-outline {
    width: 100%; padding: 13px; background: white;
    color: #0F6E56; border: 1.5px solid #0F6E56; border-radius: 12px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    margin-top: .8rem;
  }
  .msg-success {
    margin-top: 1rem; padding: 12px 16px;
    background: #E1F5EE; border-radius: 10px;
    color: #085041; font-size: .9rem; font-weight: 500;
    border: 1px solid #9FE1CB;
  }
  .msg-error {
    margin-top: 1rem; padding: 12px 16px;
    background: #FCEBEB; border-radius: 10px;
    color: #A32D2D; font-size: .9rem; font-weight: 500;
    border: 1px solid #F7C1C1;
  }
  .welcome-box {
    margin-top: 1rem; padding: 20px;
    background: #E1F5EE; border-radius: 16px;
    border: 1px solid #9FE1CB;
  }
  .welcome-name { font-size: 1.4rem; font-weight: 700; color: #085041; }
  .welcome-conf { font-size: .85rem; color: #0F6E56; margin-top: 4px; }
  .preview-img { width: 100%; border-radius: 16px; margin-bottom: 1.2rem; }
`

const speakGreeting = (name, language) => {
  const greetings = {
    kannada: `Namaskara ${name}, Swagata`,
    hindi: `Namaste ${name}, Swagat hai`,
    english: `Hello ${name}, welcome to Sahay AI`,
  }
  const text = greetings[language] || greetings["english"]
  speakText(text)
}

function LoginFace() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [message, setMessage] = useState("")
  const [msgType, setMsgType] = useState("")
  const [loading, setLoading] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
      setStreaming(true)
    } catch {
      setMessage("Camera not accessible. Please allow camera permission.")
      setMsgType("error")
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
    }
  }

  const takePhoto = () => {
    unlockVoice()
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d").drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg")
    setPhoto(dataUrl)
    stopCamera()
    setStreaming(false)
  }

  const retake = () => {
    setPhoto(null)
    setMessage("")
    setLoggedInUser(null)
    startCamera()
  }

  const loginWithFace = async () => {
    if (!photo) return
    setLoading(true)
    setMessage("")

    try {
      // resize the image client-side to speed up upload and server processing
      const resizeDataUrl = (dataUrl, maxDim = 800) => {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            let { width: w, height: h } = img
            if (Math.max(w, h) > maxDim) {
              const scale = maxDim / Math.max(w, h)
              w = Math.round(w * scale)
              h = Math.round(h * scale)
            }
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, w, h)
            resolve(canvas.toDataURL('image/jpeg', 0.8))
          }
          img.src = dataUrl
        })
      }

      const smallDataUrl = await resizeDataUrl(photo, 800)
      const blob = await fetch(smallDataUrl).then(r => r.blob())
      const formData = new FormData()
      formData.append("file", blob, "face.jpg")

      const response = await fetch(
        "http://localhost:8000/login-face",
        { method: "POST", body: formData }
      )
      const data = await response.json()

      if (data.success) {
        setLoggedInUser(data)
        setMsgType("success")
        speakGreeting(data.name, data.language)
        localStorage.setItem("userId", data.user_id)
        localStorage.setItem("userName", data.name)
        localStorage.setItem("userLanguage", data.language)
        setTimeout(() => {
          navigate("/dashboard", {
            state: {
              userId: data.user_id,
              name: data.name,
              language: data.language
            }
          })
        }, 3000)
      } else {
        setMessage(data.error || "Face not recognised")
        setMsgType("error")
      }
    } catch {
      setMessage("Could not connect to server")
      setMsgType("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="face-page">
        <div className="face-card">
          <div className="face-title">Login with your face</div>
          <div className="face-sub">
            Look straight at the camera and click scan
          </div>

          <div className="camera-box">
            {!photo ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted />
                <div className="camera-overlay" />
              </>
            ) : (
              <img src={photo} alt="captured" className="preview-img" />
            )}
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>

          {!photo ? (
            <button className="btn" onClick={takePhoto} disabled={!streaming}>
              👁️ Scan my face
            </button>
          ) : (
            <>
              {!loggedInUser && (
                <button className="btn" onClick={loginWithFace} disabled={loading}>
                  {loading ? "Recognising..." : "✅ Login"}
                </button>
              )}
              <button className="btn-outline" onClick={retake}>
                🔄 Try again
              </button>
            </>
          )}

          {loggedInUser && (
            <div className="welcome-box">
              <div className="welcome-name">
                Namaste, {loggedInUser.name}! 🙏
              </div>
              <div className="welcome-conf">
                Confidence: {loggedInUser.confidence}% · Language: {loggedInUser.language}
              </div>
            </div>
          )}

          {message && !loggedInUser && (
            <div className={msgType === "success" ? "msg-success" : "msg-error"}>
              {message}
            </div>
          )}

          <button className="btn-outline" onClick={() => navigate("/")}>
            Register new account
          </button>
        </div>
      </div>
    </>
  )
}

export default LoginFace