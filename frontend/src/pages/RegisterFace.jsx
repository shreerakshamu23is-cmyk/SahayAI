import { useState, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

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
  .camera-box canvas { display: none; }
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
    margin-top: .8rem; transition: background .2s;
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
  .preview-img {
    width: 100%; border-radius: 16px;
    margin-bottom: 1.2rem; display: block;
  }
`

function RegisterFace() {
  const location = useLocation()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const userId = location.state?.userId
  const name = location.state?.name || "User"

  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [message, setMessage] = useState("")
  const [msgType, setMsgType] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
      videoRef.current.play()
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
    startCamera()
  }

  const submitFace = async () => {
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
        `http://localhost:8000/register-face/${userId}`,
        { method: "POST", body: formData }
      )
      const data = await response.json()

      if (data.error) {
        setMessage(data.error)
        setMsgType("error")
      } else {
        setMessage(data.message + " Redirecting to login...")
        setMsgType("success")
        setTimeout(() => navigate("/login-face"), 2000)
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
          <div className="face-title">Register your face, {name}</div>
          <div className="face-sub">
            Look straight at the camera and click the button
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
              📸 Take Photo
            </button>
          ) : (
            <>
              <button className="btn" onClick={submitFace} disabled={loading}>
                {loading ? "Saving face..." : "✅ Save my face"}
              </button>
              <button className="btn-outline" onClick={retake}>
                🔄 Retake photo
              </button>
            </>
          )}

          {message && (
            <div className={msgType === "success" ? "msg-success" : "msg-error"}>
              {message}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default RegisterFace