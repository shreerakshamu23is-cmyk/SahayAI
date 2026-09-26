import { useState } from "react"
import { useNavigate } from "react-router-dom"

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; }
  .page { display: flex; min-height: 100vh; }
  .left {
    width: 42%; background: #0F6E56;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 3rem 2rem; color: white;
  }
  .logo { font-size: 2.4rem; font-weight: 700; margin-bottom: .5rem; }
  .tagline { font-size: 1rem; opacity: .8; text-align: center; line-height: 1.6; max-width: 200px; }
  .features { margin-top: 2.5rem; display: flex; flex-direction: column; gap: 1rem; width: 100%; }
  .feat { display: flex; align-items: center; gap: 12px; font-size: .85rem; opacity: .9; }
  .feat-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; font-size: 15px;
  }
  .right {
    flex: 1; display: flex; align-items: center;
    justify-content: center; padding: 2rem; background: #f9f9f7;
  }
  .card {
    background: white; border-radius: 20px;
    padding: 2.5rem 2rem; width: 100%; max-width: 400px;
    border: 0.5px solid #e8e8e4;
  }
  .card-title { font-size: 1.4rem; font-weight: 700; color: #1a1a1a; margin-bottom: .3rem; }
  .card-sub { font-size: .85rem; color: #888; margin-bottom: 2rem; }
  .field { margin-bottom: 1.2rem; }
  .field label {
    display: block; font-size: .8rem; font-weight: 600;
    color: #444; margin-bottom: .4rem;
    letter-spacing: .3px; text-transform: uppercase;
  }
  .input-wrap { position: relative; }
  .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; }
  .field input, .field select {
    width: 100%; padding: 11px 14px 11px 38px;
    border-radius: 10px; border: 1.5px solid #e0e0dc;
    font-size: .95rem; background: #fafafa; outline: none;
    transition: border .2s; color: #1a1a1a;
  }
  .field input:focus, .field select:focus { border-color: #0F6E56; background: white; }
  .btn {
    width: 100%; padding: 13px; background: #0F6E56;
    color: white; border: none; border-radius: 12px;
    font-size: 1rem; font-weight: 600; cursor: pointer;
    margin-top: .5rem; transition: background .2s;
  }
  .btn:hover { background: #085041; }
  .btn:disabled { background: #aaa; cursor: not-allowed; }
  .msg-success {
    margin-top: 1rem; padding: 12px 16px;
    background: #E1F5EE; border-radius: 10px;
    color: #085041; font-size: .9rem; font-weight: 500;
    text-align: center; border: 1px solid #9FE1CB;
  }
  .msg-error {
    margin-top: 1rem; padding: 12px 16px;
    background: #FCEBEB; border-radius: 10px;
    color: #A32D2D; font-size: .9rem; font-weight: 500;
    text-align: center; border: 1px solid #F7C1C1;
  }
  .login-link { text-align: center; margin-top: 1.2rem; font-size: .85rem; color: #888; }
  .login-link a { color: #0F6E56; font-weight: 600; text-decoration: none; cursor: pointer; }
  @media(max-width: 600px) { .left { display: none; } }
`

function Register() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [language, setLanguage] = useState("english")
  const [message, setMessage] = useState("")
  const [msgType, setMsgType] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!name || !phone) {
      setMessage("Please fill in all fields")
      setMsgType("error")
      return
    }
    if (phone.length < 10) {
      setMessage("Please enter a valid 10-digit phone number")
      setMsgType("error")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch(
        `http://localhost:8000/register?name=${name}&phone=${phone}&language=${language}`,
        { method: "POST" }
      )
      const data = await response.json()
      if (data.error) {
        setMessage(data.error)
        setMsgType("error")
      } else {
        setMessage(data.message)
        setMsgType("success")
        localStorage.setItem("userId", data.user_id)
        localStorage.setItem("userName", data.name)
        setTimeout(() => {
          navigate("/register-face", {
            state: { userId: data.user_id, name: data.name }
          })
        }, 1500)
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
      <div className="page">
        <div className="left">
          <div className="logo">SahayAI</div>
          <div className="tagline">Your trusted health companion in your language</div>
          <div className="features">
            <div className="feat"><div className="feat-icon">👤</div><div>Face recognition login</div></div>
            <div className="feat"><div className="feat-icon">🎙️</div><div>Speaks your local language</div></div>
            <div className="feat"><div className="feat-icon">💊</div><div>Reads your prescription aloud</div></div>
            <div className="feat"><div className="feat-icon">🔒</div><div>Records secured on blockchain</div></div>
          </div>
        </div>

        <div className="right">
          <div className="card">
            <div className="card-title">Create your account</div>
            <div className="card-sub">Join SahayAI — it takes less than a minute</div>

            <div className="field">
              <label>Your Name</label>
              <div className="input-wrap">
                <span className="input-icon">👤</span>
                <input type="text" placeholder="e.g. Meena Devi" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Phone Number</label>
              <div className="input-wrap">
                <span className="input-icon">📱</span>
                <input type="text" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Preferred Language</label>
              <div className="input-wrap">
                <span className="input-icon">🗣️</span>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="english">English</option>
                  <option value="hindi">Hindi — हिन्दी</option>
                  <option value="kannada">Kannada — ಕನ್ನಡ</option>
                </select>
              </div>
            </div>

            <button className="btn" onClick={handleRegister} disabled={loading}>
              {loading ? "Creating account..." : "Create my account"}
            </button>

            {message && (
              <div className={msgType === "success" ? "msg-success" : "msg-error"}>
                {message}
              </div>
            )}

            <div className="login-link">
              Already registered?{" "}
              <a onClick={() => navigate("/login-face")}>Login with face scan</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Register