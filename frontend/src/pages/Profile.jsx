import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { speakText, unlockVoice, stopVoice } from "../voiceHelper"
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
  .back-btn {
    background: rgba(255,255,255,0.15); border: none;
    color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer;
  }
  .content { padding: 2rem; max-width: 700px; margin: 0 auto; }
  .hero-card {
    background: white; border-radius: 20px; padding: 2rem;
    border: 0.5px solid #e8e8e4; display: flex;
    align-items: flex-start; gap: 1.5rem; margin-bottom: 1.2rem;
  }
  .avatar {
    width: 80px; height: 80px; border-radius: 50%;
    background: #0F6E56; color: white; font-size: 2rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .hero-info { flex: 1; }
  .hero-name { font-size: 1.6rem; font-weight: 500; color: #1a1a1a; margin-bottom: 6px; text-align: left; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .lang-badge {
    background: #E1F5EE; color: #085041; padding: 3px 12px;
    border-radius: 20px; font-size: .8rem; font-weight: 600;
    border: 1px solid #9FE1CB;
  }
  .verified-badge {
    background: #E1F5EE; color: #085041; padding: 3px 10px;
    border-radius: 20px; font-size: .75rem; font-weight: 600;
    border: 1px solid #9FE1CB;
  }
  .hero-id { font-size: .8rem; color: #bbb; }
  .stats-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1rem; margin-bottom: 1.2rem;
  }
  .stat-card {
    background: white; border-radius: 16px; padding: 1.2rem;
    border: 0.5px solid #e8e8e4; text-align: center;
  }
  .stat-icon { font-size: 1.5rem; margin-bottom: .5rem; }
  .stat-number { font-size: 1.6rem; font-weight: 700; color: #0F6E56; margin-bottom: 2px; }
  .stat-label { font-size: .75rem; color: #888; text-transform: uppercase; letter-spacing: .5px; }
  .health-card {
    background: #E1F5EE; border-radius: 16px; padding: 1.2rem 1.5rem;
    border: 1px solid #9FE1CB; margin-bottom: 1rem;
  }
  .health-title { font-weight: 700; color: #085041; margin-bottom: .8rem; font-size: .95rem; }
  .health-row {
    display: flex; justify-content: space-between; align-items: center; padding: 6px 0;
  }
  .health-key { font-size: .85rem; color: #0F6E56; }
  .health-val { font-size: .85rem; font-weight: 600; color: #085041; }
  .info-card {
    background: white; border-radius: 16px; padding: 1.2rem 1.5rem;
    border: 0.5px solid #e8e8e4; margin-bottom: 1rem;
  }
  .info-title {
    font-weight: 700; color: #1a1a1a; margin-bottom: 1rem;
    font-size: .95rem;
  }
  .info-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 0.5px solid #f0f0f0;
  }
  .info-row:last-child { border-bottom: none; }
  .info-key { font-size: .85rem; color: #888; }
  .info-val { font-size: .85rem; font-weight: 600; color: #1a1a1a; }
  .info-val.green { color: #0F6E56; }
  .action-row { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; margin-bottom: .8rem; }
  .action-btn {
    padding: 12px; border-radius: 12px; border: 1.5px solid #e0e0dc;
    background: white; cursor: pointer; font-size: .9rem; font-weight: 600;
    color: #1a1a1a; display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .action-btn:hover { border-color: #0F6E56; color: #0F6E56; }
  .action-btn.danger { border-color: #FCA5A5; color: #991B1B; background: #FEE2E2; }
  .loading { text-align: center; padding: 3rem; color: #6B7280; font-weight: 600; }
  @media(max-width: 600px) {
    .hero-card { flex-direction: column; text-align: center; align-items: center; }
    .badges { justify-content: center; }
    .stats-grid { grid-template-columns: 1fr; }
    .action-row { grid-template-columns: 1fr; }
  }
`

const langNames = {
  kannada: "Kannada — ಕನ್ನಡ",
  hindi: "Hindi — हिन्दी",
  english: "English",
}

function Profile() {
  const location = useLocation()
  const navigate = useNavigate()

  const name = location.state?.name || "User"
  const language = location.state?.language || "english"
  const userId = location.state?.userId

  const t = { ...appTranslations["english"], ...appTranslations[language] }

  const [stats, setStats] = useState({
    prescriptions: 0,
    documents: 0,
    lastPrescription: null,
    activeMedicines: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    return () => {
      stopVoice()
    }
  }, [])

  const fetchStats = async () => {
    try {
      const [presRes, docRes] = await Promise.all([
        fetch(`http://localhost:8000/prescriptions/${userId}`),
        fetch(`http://localhost:8000/documents/${userId}`)
      ])
      const presData = await presRes.json()
      const docData = await docRes.json()

      const prescriptions = presData.prescriptions || []
      const documents = docData.documents || []

      let lastPrescription = null
      let activeMedicines = []

      if (prescriptions.length > 0) {
        lastPrescription = prescriptions[0].scanned_at
        activeMedicines = (prescriptions[0].medicines || [])
          .slice(0, 2)
          .map(m => m.medicine)
      }

      setStats({
        prescriptions: prescriptions.length,
        documents: documents.length,
        lastPrescription,
        activeMedicines
      })
    } catch {
      console.log("Could not fetch stats")
    } finally {
      setLoading(false)
    }
  }

  const announceAndAct = (text, action) => {
    unlockVoice()
    speakText(text)
    if (action) setTimeout(action, 800)
  }

  const memberSince = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })

  return (
    <>
      <style>{styles}</style>
      <div className="page">
        <div className="topbar">
          <span className="logo">SahayAI</span>
          <button
            className="back-btn"
            onClick={() => announceAndAct(
              t.back,
              () => navigate("/dashboard", { state: { userId, name, language } })
            )}
          >
            {t.back}
          </button>
        </div>

        <div className="content">

          {/* Hero card */}
          <div className="hero-card">
            <div className="avatar">{name[0].toUpperCase()}</div>
            <div className="hero-info">
              <div className="hero-name">{name}</div>
              <div className="badges">
                <span className="lang-badge">
                  🗣️ {langNames[language] || language}
                </span>
                <span className="verified-badge">{t.faceVerified}</span>
              </div>
              <div className="hero-id">
                {t.memberSince} {memberSince} · {t.userId} #{userId}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="stats-grid">
            <div
              className="stat-card"
              onClick={() => announceAndAct(
                `${stats.prescriptions} ${t.totalPrescriptions}`,
                () => navigate("/records", { state: { userId, name, language } })
              )}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon">💊</div>
              <div className="stat-number">{stats.prescriptions}</div>
              <div className="stat-label">{t.totalPrescriptions}</div>
            </div>

            <div
              className="stat-card"
              onClick={() => announceAndAct(
                `${stats.documents} ${t.totalDocuments}`,
                () => navigate("/records", { state: { userId, name, language } })
              )}
              style={{ cursor: "pointer" }}
            >
              <div className="stat-icon">📁</div>
              <div className="stat-number">{stats.documents}</div>
              <div className="stat-label">{t.totalDocuments}</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔒</div>
              <div className="stat-number" style={{ fontSize: "1rem", marginTop: "4px" }}>
                {t.secured}
              </div>
              <div className="stat-label">{t.blockchain}</div>
            </div>
          </div>

          {/* Health summary */}
          {!loading && stats.lastPrescription && (
            <div className="health-card">
              <div className="health-title">{t.healthSummary}</div>
              <div className="health-row">
                <span className="health-key">{t.lastPrescription}</span>
                <span className="health-val">{stats.lastPrescription}</span>
              </div>
              {stats.activeMedicines.length > 0 && (
                <div className="health-row">
                  <span className="health-key">{t.recentMedicines}</span>
                  <span className="health-val">
                    {stats.activeMedicines.join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Personal details */}
          <div className="info-card">
            <div className="info-title">👤 {t.profileTitle}</div>
            <div className="info-row">
              <span className="info-key">{t.nameLabel}</span>
              <span className="info-val">{name}</span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.language}</span>
              <span className="info-val">{langNames[language] || language}</span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.userId}</span>
              <span className="info-val">#{userId}</span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.faceLoginLabel}</span>
              <span className="info-val green">{t.enabledLabel}</span>
            </div>
            <div className="info-row">
              <span className="info-key">{t.blockchainLabel}</span>
              <span className="info-val green">{t.securedLabel}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="action-row">
            <button
              className="action-btn"
              onClick={() => announceAndAct(
                t.goingToUpdateFace,
                () => navigate("/register-face", { state: { userId, name } })
              )}
            >
              {t.updateFaceBtn}
            </button>
            <button
              className="action-btn"
              onClick={() => announceAndAct(
                t.goingToRecords,
                () => navigate("/records", { state: { userId, name, language } })
              )}
            >
              {t.viewRecordsBtn}
            </button>
          </div>

          <div className="action-row">
            <button
              className="action-btn"
              onClick={() => announceAndAct(
                t.goingToScan,
                () => navigate("/prescription", { state: { userId, name, language } })
              )}
            >
              {t.scanPrescriptionBtn}
            </button>
            <button
              className="action-btn danger"
              onClick={() => announceAndAct(
                t.loggingOut,
                () => navigate("/login-face")
              )}
            >
              🚪 {t.logout}
            </button>
          </div>

        </div>
      </div>
    </>
  )
}

export default Profile