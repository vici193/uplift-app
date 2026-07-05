import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode/+esm"

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#1B2B4B;--gold:#F5A623;--gold-dk:#D4891A;--cream:#F7F4EF;
  --slate:#4A5568;--jade:#2D7A4F;--jade-bg:#E8F5EE;--amber:#D97706;
  --amber-bg:#FEF3C7;--brick:#C0392B;--brick-bg:#FDECEA;
  --blue:#3B82F6;--blue-bg:#EFF6FF;
  --white:#fff;--border:#E2E8F0;--r:12px;--r-sm:8px
}
html{font-size:16px;-webkit-text-size-adjust:100%}
body{font-family:'Inter',sans-serif;background:var(--cream);color:var(--navy);line-height:1.6;min-height:100vh} 
.app{max-width:480px;margin:0 auto;min-height:100vh;background:var(--cream);position:relative}

.app.logged-in-layout {
  max-width: 100%;
}

@media(min-width:900px){
  .app.logged-in-layout{display:grid;grid-template-columns:220px 1fr;grid-template-rows:52px 1fr;min-height:100vh;background:var(--cream)}
  .topbar{grid-column:1/-1;grid-row:1}
  .sidebar{display:flex!important;flex-direction:column;background:var(--navy);padding:16px 0;grid-column:1;grid-row:2;height:calc(100vh - 52px);overflow-y:auto}
  .sidebar-item{display:flex;align-items:center;gap:12px;padding:13px 20px;cursor:pointer;color:rgba(255,255,255,.55);font-size:14px;font-weight:500;border:none;background:none;font-family:'Inter',sans-serif;width:100%;text-align:left;transition:all .15s;border-left:3px solid transparent}
  .sidebar-item:hover{color:#fff;background:rgba(255,255,255,.05)}
  .sidebar-item.active{color:var(--gold);background:rgba(245,166,35,.07);border-left-color:var(--gold)}
  .sidebar-item .sico{font-size:17px;flex-shrink:0}
  .main-content{grid-column:2;grid-row:2;overflow-y:auto;height:calc(100vh - 52px);background:var(--cream)}
  .bnav{display:none!important}
  .scroll{height:auto!important;overflow-y:visible!important;padding-bottom:32px!important}
  .scroll.no-nav{height:auto!important}
  .page-inner{max-width:1200px;margin:0 auto;padding:0 16px}
  .ph{border-radius:var(--r);margin:20px 0 0}
  .dh{border-radius:var(--r);margin:20px 0 0}
  .kpi-grid{grid-template-columns:repeat(4,1fr)}
  .admin-grid{grid-template-columns:repeat(5,1fr)}
  .two-col{grid-template-columns:1fr 1fr}
}
@media(max-width:899px){.sidebar{display:none}}
.topbar{background:var(--navy);height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;position:sticky;top:0;z-index:100}
.logo{font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:20px;color:var(--gold);cursor:pointer;letter-spacing:-.5px}
.logo span{color:rgba(255,255,255,.45);font-weight:500;font-size:11px;margin-left:6px}
.topbar-right{display:flex;gap:8px;align-items:center}
.tbtn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:500;padding:4px 10px;border-radius:20px;cursor:pointer;font-family:'Inter',sans-serif}
.tbtn:hover{background:rgba(255,255,255,.2)}
.tbtn.gold{background:var(--gold);color:var(--navy);border-color:var(--gold);font-weight:700}
.tbtn.ghost{background:none;border:none;color:rgba(255,255,255,.35);font-size:10px}
.tbtn.ghost:hover{color:var(--gold)}
.scroll{overflow-y:auto;height:calc(100vh - 52px - 60px);padding-bottom:16px}
.scroll.no-nav{height:calc(100vh - 52px)}
.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--white);border-top:1px solid var(--border);display:flex;z-index:100}
.bnav-item{flex:1;display:flex;flex-direction:column;align-items:center;padding:7px 4px 10px;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;gap:2px}
.bnav-item .ico{font-size:20px;color:var(--slate)}
.bnav-item .lbl{font-size:9px;color:var(--slate)}
.bnav-item.active .ico{color:var(--gold)}
.bnav-item.active .lbl{color:var(--navy);font-weight:600}
.ph{background:var(--navy);padding:20px 18px 24px}
.ph h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:#fff;margin-bottom:2px}
.ph p{font-size:13px;color:rgba(255,255,255,.55)}
.pad{padding:18px}
.fg{margin-bottom:14px}
.fl{display:block;font-size:13px;font-weight:600;color:var(--navy);margin-bottom:5px}
.fi{width:100%;padding:13px 14px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:15px;font-family:'Inter',sans-serif;color:var(--navy);outline:none;background:#fff;transition:border-color .15s}
.fi:focus{border-color:var(--gold)}
.fh{font-size:11px;color:var(--slate);margin-top:3px}
.fsel{width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:14px;font-family:'Inter',sans-serif;color:var(--navy);background:#fff;outline:none}
.fta{width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--r-sm);font-size:14px;font-family:'Inter',sans-serif;color:var(--navy);resize:vertical;min-height:80px;outline:none}
.fsel:focus,.fta:focus,.fi:focus{border-color:var(--gold)}
.btn{width:100%;padding:14px;border:none;border-radius:var(--r);font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:15px;cursor:pointer;transition:all .15s;margin-bottom:10px}
.btn.navy{background:var(--navy);color:#fff}
.btn.navy:hover{background:#253d6b}
.btn.gold{background:var(--gold);color:var(--navy)}
.btn.gold:hover{background:var(--gold-dk)}
.btn.outline{background:none;border:1.5px solid var(--border);color:var(--slate)}
.btn.outline:hover{border-color:var(--navy);color:var(--navy)}
.btn.sm{padding:7px 14px;width:auto;font-size:12px;border-radius:20px;margin-bottom:0}
.btn.sm.jade{background:var(--jade);color:#fff;border:none}
.btn.sm.brick-o{background:none;border:1px solid var(--brick);color:var(--brick)}
.btn.sm.navy-o{background:none;border:1px solid var(--navy);color:var(--navy)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.link{color:var(--gold-dk);font-weight:600;cursor:pointer;text-decoration:underline;font-size:13px}
.card{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(27,43,75,.06)}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
.card-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:var(--navy);flex:1;padding-right:8px}
.card-amount{font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:800;color:var(--gold)}
.card-agency{font-size:10px;color:var(--slate);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
.card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid var(--border)}
.card-date{font-size:11px;color:var(--slate)}
.pill{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600}
.pill::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor}
.pill.approved{background:var(--jade-bg);color:var(--jade)}
.pill.pending{background:var(--amber-bg);color:var(--amber)}
.pill.rejected{background:var(--brick-bg);color:var(--brick)}
.pill.claimed{background:#EEF2F8;color:var(--navy)}
.pill.processing{background:var(--blue-bg);color:var(--blue)}
.appt-card{background:var(--navy);border-radius:var(--r);padding:18px;margin-bottom:12px}
.appt-label{font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
.appt-prog{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:#fff;margin-bottom:14px}
.appt-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}
.appt-ico{font-size:14px;flex-shrink:0;margin-top:1px}
.appt-txt{font-size:14px;color:#fff;font-weight:500}
.appt-txt small{display:block;font-size:11px;color:rgba(255,255,255,.5);font-weight:400}
.appt-ref{margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.15);font-size:11px;color:rgba(255,255,255,.5)}
.appt-ref strong{color:var(--gold)}
.notif{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:12px 14px;margin-bottom:8px;display:flex;gap:10px}
.ndot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px}
.ndot.appointment{background:var(--navy)}
.ndot.approved{background:var(--jade)}
.ndot.info{background:var(--gold)}
.ndot.rejected{background:var(--brick)}
.nmsg{font-size:13px;color:var(--navy);line-height:1.5}
.ntime{font-size:10px;color:var(--slate);margin-top:3px}
.srow{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.srow h2{font-family:'Plus Jakarta Sans',sans-serif;font-size:17px;font-weight:700;color:var(--navy)}
.srow-btn{background:none;border:none;font-size:12px;color:var(--gold-dk);font-weight:600;cursor:pointer;font-family:'Inter',sans-serif}
.dh{background:var(--navy);padding:20px 18px 26px}
.dh-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:21px;font-weight:800;color:#fff}
.dh-name em{color:var(--gold);font-style:normal}
.dh-sub{font-size:13px;color:rgba(255,255,255,.55);margin-top:3px}
.qr-box{background:#fff;border-radius:var(--r);padding:20px;text-align:center;margin-bottom:10px}
.qr-sq{width:140px;height:140px;background:var(--navy);margin:0 auto 10px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:48px}
.qr-cap{font-size:12px;color:var(--slate)}
.qr-ref{font-size:11px;color:var(--slate);margin-top:6px;font-family:monospace}
.info-box{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:14px;margin-top:12px}
.info-box-title{font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:13px;color:var(--navy);margin-bottom:8px}
.info-item{font-size:13px;color:var(--slate);padding:3px 0}
.alert{border-radius:var(--r-sm);padding:10px 14px;font-size:12px;margin-bottom:14px;line-height:1.5}
.alert.amber{background:var(--amber-bg);border:1px solid var(--amber);color:var(--navy)}
.alert.jade{background:var(--jade-bg);border:1px solid var(--jade);color:var(--navy)}
.alert.brick{background:var(--brick-bg);border:1px solid var(--brick);color:var(--navy)}
.griev{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:14px;margin-top:10px}
.griev-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;color:var(--navy);margin-bottom:4px}
.griev-sub{font-size:12px;color:var(--slate);margin-bottom:12px}
.upload{border:2px dashed var(--border);border-radius:var(--r-sm);padding:18px;text-align:center;cursor:pointer;background:var(--cream)}
.upload:hover{border-color:var(--gold)}
.upload-ico{font-size:22px;margin-bottom:5px}
.upload-txt{font-size:13px;color:var(--slate)}
.admin-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}
.atile{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;text-align:center;transition:all .15s}
.atile:hover{border-color:var(--gold);box-shadow:0 2px 8px rgba(27,43,75,.08)}
.atile.active-tile{border-color:var(--gold);background:var(--amber-bg)}
.atile-ico{font-size:24px;margin-bottom:6px}
.atile-lbl{font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;font-weight:700;color:var(--navy)}
.asec{background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-bottom:14px}
.asec-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:var(--navy);padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:12px}
.arow{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;gap:10px;cursor:pointer;background:#fff;transition:all 0.15s}
.arow:hover{border-color:var(--gold);box-shadow:0 2px 6px rgba(0,0,0,0.02)}
.arow.selected-item{border-color:var(--navy);background:var(--blue-bg)}
.arow-name{font-size:13px;font-weight:600;color:var(--navy)}
.arow-detail{font-size:11px;color:var(--slate);margin-top:2px}
.kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.kpi{background:#fff;border:1px solid var(--border);border-radius:var(--r-sm);padding:12px 14px}
.kpi-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:var(--navy)}
.kpi-lbl{font-size:10px;color:var(--slate);margin-top:1px}
.spacer{height:12px}
.toast{position:fixed;top:62px;left:50%;transform:translateX(-50%);background:var(--jade);color:#fff;padding:10px 18px;border-radius:var(--r);font-size:13px;font-weight:600;z-index:200;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.15)}
.egov-strip{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:12px 14px;display:flex;align-items:center;gap:10px;margin-top:12px}
.egov-ico{font-size:20px}
.egov-txt{font-size:12px;color:var(--slate)}
.egov-txt strong{color:var(--navy);display:block;font-size:13px}
.btn-row{display:flex;gap:8px;flex-shrink:0}
.empty{text-align:center;padding:40px 20px;color:var(--slate);font-size:14px}
.empty-ico{font-size:36px;margin-bottom:10px}
.slots-bar{height:6px;background:var(--border);border-radius:3px;margin-top:6px;overflow:hidden}
.slots-fill{height:100%;border-radius:3px;background:var(--jade);transition:width .3s}
.slots-fill.low{background:var(--amber)}
.slots-fill.empty-bar{background:var(--brick)}
.event-card{background:#fff;border-radius:var(--r);border:1px solid var(--border);padding:16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(27,43,75,.06)}
.event-card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.event-name{font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;color:var(--navy)}
.event-amount{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:800;color:var(--gold)}
.event-agency{font-size:10px;color:var(--slate);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
.event-meta{font-size:12px;color:var(--slate);margin-bottom:4px;display:flex;align-items:center;gap:5px}
.event-footer{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)}
.slots-text{font-size:11px;font-weight:600}
.slots-text.ok{color:var(--jade)}
.slots-text.low{color:var(--amber)}
.slots-text.none{color:var(--brick)}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* Split Screen View Framework styles */
.split-view {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media(min-width: 900px) {
  .split-view {
    grid-template-columns: 350px 1fr;
  }
}
.panel-scroller {
  max-height: 600px;
  overflow-y: auto;
}
.comparison-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media(min-width: 1100px) {
  .comparison-container {
    grid-template-columns: 1fr 1fr;
  }
}
.data-specs-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.data-specs-table td {
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}
.data-specs-table td.lbl-header {
  font-weight: 600;
  color: var(--slate);
  background: rgba(27,43,75,0.02);
  width: 40%;
}
.data-specs-table td.val-content {
  color: var(--navy);
}
.modal-overlay{position:fixed;inset:0;background:rgba(27,43,75,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease}
.modal-card{background:#fff;border-radius:var(--r);padding:24px;max-width:420px;width:100%;box-shadow:0 8px 32px rgba(27,43,75,.18);animation:popUp .25s cubic-bezier(.34,1.56,.64,1)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes popUp{from{opacity:0;transform:scale(.88) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
.modal-ico{font-size:36px;margin-bottom:10px;text-align:center}
.modal-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;color:var(--navy);margin-bottom:6px;text-align:center}
.modal-body{font-size:13px;color:var(--slate);text-align:center;line-height:1.6;margin-bottom:18px}
.modal-actions{display:flex;flex-direction:column;gap:8px}
`

function Pill({ status, en }) {
    const map = {
        approved: { label: en ? "• Approved" : "• Naaprubahan", cls: "approved" },
        rejected: { label: en ? "• Rejected" : "• Tinanggihan", cls: "rejected" },
        pending: { label: en ? "• Awaiting Response" : "• Naghihintay ng Tugon", cls: "pending" },
        confirmed: { label: en ? "• Confirmed" : "• Nakumpirma", cls: "approved" },
        submitted: { label: en ? "• Submitted" : "• Naisumite", cls: "pending" },
        draft: { label: en ? "• Draft" : "• Draft", cls: "pending" },
        resolved: { label: en ? "• Resolved" : "• Nalutas", cls: "approved" },
        replied: { label: en ? "• Response Received" : "• May Tugon", cls: "approved" },
    }
    const p = map[status] || { label: `• ${status}`, cls: "pending" }
    return <span className={`pill ${p.cls}`}>{p.label}</span>
}

function Toast({ msg }) {
    return msg ? <div className="toast">{msg}</div> : null
}

function SlotsBar({ remaining, total }) {
    if (!total) return null
    const pct = Math.round((remaining / total) * 100)
    const cls = pct > 50 ? "" : pct > 20 ? "low" : "empty-bar"
    return <div className="slots-bar"><div className={`slots-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
}

function NotifModal({ notif, onClose, onAction }) {
    if (!notif) return null
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-ico">{notif.icon}</div>
                <div className="modal-title">{notif.title}</div>
                <div className="modal-body">{notif.body}</div>
                <div className="modal-actions">
                    {notif.action && (
                        <button className="btn gold" style={{ marginBottom: 0 }} onClick={() => { onAction(notif.action); onClose() }}>
                            {notif.actionLabel}
                        </button>
                    )}
                    {notif.action2 && (
                        <button className="btn outline" style={{ marginBottom: 0 }} onClick={() => { onAction(notif.action2); onClose() }}>
                            {notif.action2Label}
                        </button>
                    )}
                    <button className="btn outline" style={{ marginBottom: 0 }} onClick={onClose}>
                        {notif.closeLabel || "Close"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function QRDisplay({ value }) {
    const canvasRef = useRef(null)
    useEffect(() => {
        if (canvasRef.current && value) {
            QRCode.toCanvas(canvasRef.current, value, {
                width: 200,
                margin: 2,
                color: { dark: "#1b2b4b", light: "#ffffff" }
            })
        }
    }, [value])
    return (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
            <canvas ref={canvasRef} style={{ borderRadius: 8, border: "2px solid var(--border)" }} />
        </div>
    )
}

// ─── SIGN IN ──────────────────────────────────────────────────────────────────
function SignIn({ en, onNav, onLogin }) {
    const [mobile, setMobile] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function handleSignIn(e) {
        e.preventDefault()
        if (!mobile || !password) return
        setLoading(true)
        setError("")
        const { data, error } = await supabase
            .from("drivers")
            .select("id, password")
            .eq("mobile", mobile)
            .single()
        setLoading(false)
        if (error || !data) {
            setError(en ? "Mobile number not found. Please sign up first." : "Hindi nahanap ang numero. Mag-sign up muna.")
            return
        }
        if (data.password !== password) {
            setError(en ? "Incorrect password. Please try again." : "Mali ang password. Subukan muli.")
            return
        }
        onLogin(mobile)
    }

    return (
        <div className="pad" style={{ paddingTop: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
                    UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                    {en ? "Sign In" : "Mag-Sign In"}
                </h2>
                <form onSubmit={handleSignIn}>
                    {error && <div className="alert amber">{error}</div>}
                    <div className="fg">
                        <label className="fl">{en ? "Mobile Number" : "Numero ng Telepono"}</label>
                        <input className="fi" placeholder="09XX XXX XXXX" value={mobile} onChange={e => setMobile(e.target.value)} />
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Password" : "Password"}</label>
                        <input className="fi" type="password" placeholder={en ? "Enter your password" : "Ilagay ang iyong password"} value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <button className="btn gold" type="submit" disabled={loading}>
                        {loading ? "..." : (en ? "Sign In" : "Mag-Sign In")}
                    </button>
                </form>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    {en ? "No account yet?" : "Wala pang account?"} <span className="link" onClick={() => onNav("signup")}>{en ? "Sign up" : "Mag-sign up"}</span>
                </div>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 8 }}>
                    <span className="link" onClick={() => onNav("forgot")}>{en ? "Forgot password?" : "Nakalimutan ang password?"}</span>
                    {" · "}
                    <span className="link" onClick={() => onNav("changenumber")}>{en ? "Changed your number?" : "Nagpalit ng numero?"}</span>
                </div>
            </div>
        </div>
    )
}

function ChangeNumber({ en, onNav }) {
    const [step, setStep] = useState(1)
    const [oldMobile, setOldMobile] = useState("")
    const [password, setPassword] = useState("")
    const [newMobile, setNewMobile] = useState("")
    const [confirmMobile, setConfirmMobile] = useState("")
    const [securityQuestion, setSecurityQuestion] = useState("")
    const [securityAnswer, setSecurityAnswer] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [usedSecondQuestion, setUsedSecondQuestion] = useState(false)

    async function handleVerifyAccount(e) {
        e.preventDefault()
        if (!oldMobile || !password) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("id, password, security_question, security_question_2").eq("mobile", oldMobile).single()
        setLoading(false)
        if (!data) {
            setError(en ? "This number is not registered in our system." : "Hindi nakalista ang numerong ito sa aming sistema.")
            return
        }
        if (data.password !== password) {
            setError(en ? "Incorrect password." : "Mali ang password.")
            return
        }
        setSecurityQuestion(data.security_question || "")
        setStep(2)
    }

    function handleGetNewNumber(e) {
        e.preventDefault()
        if (!newMobile || !confirmMobile) return
        if (newMobile !== confirmMobile) {
            setError(en ? "New numbers do not match." : "Hindi magkatugma ang mga bagong numero.")
            return
        }
        if (newMobile === oldMobile) {
            setError(en ? "New number must be different from your current number." : "Ang bagong numero ay dapat iba sa iyong kasalukuyang numero.")
            return
        }
        setError("")
        setStep(3)
    }

    async function handleConfirm(e) {
        e.preventDefault()
        if (!securityAnswer) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("security_answer, security_question_2, security_answer_2").eq("mobile", oldMobile).single()
        const correct = usedSecondQuestion
            ? data?.security_answer_2 === securityAnswer.trim().toLowerCase()
            : data?.security_answer === securityAnswer.trim().toLowerCase()
        if (!correct) {
            if (!usedSecondQuestion && data?.security_question_2) {
                setError(en ? "Incorrect answer. Switching to your second security question..." : "Maling sagot. Lilipat sa pangalawang security question...")
                setTimeout(() => {
                    setError("")
                    setSecurityQuestion(data.security_question_2)
                    setSecurityAnswer("")
                    setUsedSecondQuestion(true)
                }, 2000)
                setLoading(false)
            } else {
                setLoading(false)
                setError(en ? "Incorrect answer. Please contact support." : "Maling sagot. Makipag-ugnayan sa suporta.")
            }
            return
        }
        const { error } = await supabase.from("drivers").update({
            mobile: newMobile,
            philsys_number: newMobile,
        }).eq("mobile", oldMobile)
        setLoading(false)
        if (error) {
            setError(en ? "Something went wrong. Please try again." : "May nangyaring mali. Subukan muli.")
            return
        }
        setSuccess(true)
    }

    if (success) return (
        <div className="pad" style={{ paddingTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
                    UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                </div>
            </div>
            <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                    {en ? "Mobile number updated." : "Na-update ang numero ng telepono."}
                </div>
                <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 16 }}>
                    {en ? `You can now sign in using ${newMobile}.` : `Maaari ka nang mag-sign in gamit ang ${newMobile}.`}
                </p>
                <button className="btn gold" onClick={() => onNav("signin")}>{en ? "Go to Sign In" : "Pumunta sa Sign In"}</button>
            </div>
        </div>
    )

    return (
        <div className="pad" style={{ paddingTop: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
                    UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                    {en ? "Change Mobile Number" : "Palitan ang Numero ng Telepono"}
                </h2>
                <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 16 }}>
                    {en ? "Your mobile number is used to sign in. Verify your account first to make a change." : "Ang iyong numero ay ginagamit para mag-sign in. I-verify muna ang iyong account para gumawa ng pagbabago."}
                </p>

                <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
                    {[1,2,3].map(n => (
                        <div key={n} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
                                background: step >= n ? "var(--navy)" : "var(--border)",
                                color: step >= n ? "#fff" : "var(--slate)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700
                            }}>{n}</div>
                            <div style={{ fontSize: 10, color: "var(--slate)" }}>
                                {n === 1 ? (en ? "Old number + password" : "Lumang numero + password") : n === 2 ? (en ? "New number" : "Bagong numero") : (en ? "Confirm identity" : "Kumpirmahin")}
                            </div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert amber">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleVerifyAccount}>
                        <div className="fg">
                            <label className="fl">{en ? "Current Mobile Number" : "Kasalukuyang Numero ng Telepono"}</label>
                            <input className="fi" placeholder="09XX XXX XXXX" value={oldMobile} onChange={e => setOldMobile(e.target.value)} />
                        </div>
                        <div className="fg">
                            <label className="fl">{en ? "Password" : "Password"}</label>
                            <input className="fi" type="password" placeholder={en ? "Enter your password" : "Ilagay ang iyong password"} value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                        <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Account" : "I-verify ang Account")}</button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleGetNewNumber}>
                        <div className="alert jade">✓ {en ? `Account verified: ${oldMobile}` : `Na-verify ang account: ${oldMobile}`}</div>
                        <div className="fg">
                            <label className="fl">{en ? "New Mobile Number" : "Bagong Numero ng Telepono"}</label>
                            <input className="fi" placeholder="09XX XXX XXXX" value={newMobile} onChange={e => setNewMobile(e.target.value)} />
                        </div>
                        <div className="fg">
                            <label className="fl">{en ? "Confirm New Mobile Number" : "Kumpirmahin ang Bagong Numero"}</label>
                            <input className="fi" placeholder="09XX XXX XXXX" value={confirmMobile} onChange={e => setConfirmMobile(e.target.value)} />
                        </div>
                        <button className="btn gold" type="submit">{en ? "Continue" : "Magpatuloy"}</button>
                        <button type="button" className="btn outline" onClick={() => setStep(1)}>{en ? "Back" : "Bumalik"}</button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleConfirm}>
                        <div style={{ background: "var(--cream)", borderRadius: "var(--r-sm)", padding: 12, marginBottom: 14, fontSize: 12, color: "var(--slate)" }}>
                            <div>{en ? "Changing from:" : "Palipat mula:"} <strong>{oldMobile}</strong></div>
                            <div>{en ? "Changing to:" : "Palipat sa:"} <strong>{newMobile}</strong></div>
                        </div>
                        <div className="alert amber">🔒 {en ? "Answer your security question to confirm this change." : "Sagutin ang iyong security question para kumpirmahin ang pagbabagong ito."}</div>
                        <div className="fg">
                            <label className="fl">{securityQuestion || (en ? "Security Question" : "Security Question")}</label>
                            <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} />
                        </div>
                        <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Confirm Change" : "Kumpirmahin ang Pagpapalit")}</button>
                        <button type="button" className="btn outline" onClick={() => setStep(2)}>{en ? "Back" : "Bumalik"}</button>
                    </form>
                )}

                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    <span className="link" onClick={() => onNav("signin")}>← {en ? "Back to Sign In" : "Bumalik sa Sign In"}</span>
                </div>
            </div>
        </div>
    )
}

function ForgotPassword({ en, onNav }) {
    const [step, setStep] = useState(1)
    const [mobile, setMobile] = useState("")
    const [securityQuestion, setSecurityQuestion] = useState("")
    const [securityAnswer, setSecurityAnswer] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [usedSecondQuestion, setUsedSecondQuestion] = useState(false)

    async function handleFindAccount(e) {
        e.preventDefault()
        if (!mobile) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("id, security_question, security_question_2").eq("mobile", mobile).single()
        setLoading(false)
        if (!data) {
            setError(en ? "Mobile number not found." : "Hindi nahanap ang numero.")
            return
        }
        if (!data.security_question) {
            setError(en ? "No security question set up for this account. Please contact support." : "Walang security question sa account na ito.")
            return
        }
        setSecurityQuestion(data.security_question)
        setStep(2)
    }

    async function handleVerifyAnswer(e) {
        e.preventDefault()
        if (!securityAnswer) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("security_answer, security_question_2, security_answer_2").eq("mobile", mobile).single()
        setLoading(false)
        const correct = usedSecondQuestion
            ? data?.security_answer_2 === securityAnswer.trim().toLowerCase()
            : data?.security_answer === securityAnswer.trim().toLowerCase()
        if (!correct) {
            if (!usedSecondQuestion && data?.security_question_2) {
                setError(en ? "Incorrect answer. Try your second security question instead?" : "Maling sagot. Subukan ang pangalawang security question?")
                setTimeout(() => {
                    setError("")
                    setSecurityQuestion(data.security_question_2)
                    setSecurityAnswer("")
                    setUsedSecondQuestion(true)
                }, 2000)
            } else {
                setError(en ? "Incorrect answer. Please contact support." : "Maling sagot. Makipag-ugnayan sa suporta.")
            }
            return
        }
        setStep(3)
    }

    function validateNewPassword() {
        if (newPassword.length < 8) return en ? "Password must be at least 8 characters." : "Dapat hindi bababa sa 8 karakter ang password."
        if (!/[0-9]/.test(newPassword)) return en ? "Password must contain at least one number." : "Dapat may kasamang numero ang password."
        if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(newPassword)) return en ? "Password must contain at least one special character." : "Dapat may kasamang special character ang password."
        if (newPassword !== confirmPassword) return en ? "Passwords do not match." : "Hindi magkatugma ang mga password."
        return null
    }

    async function handleResetPassword(e) {
        e.preventDefault()
        const pwError = validateNewPassword()
        if (pwError) { setError(pwError); return }
        setLoading(true)
        setError("")
        const { error } = await supabase.from("drivers").update({ password: newPassword }).eq("mobile", mobile)
        setLoading(false)
        if (error) {
            setError(en ? "Something went wrong. Please try again." : "May nangyaring mali. Subukan muli.")
            return
        }
        setSuccess(true)
    }

    if (success) return (
        <div className="pad" style={{ paddingTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
                    UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                </div>
            </div>
            <div className="card" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                    {en ? "Password reset successful." : "Matagumpay na na-reset ang password."}
                </div>
                <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 16 }}>
                    {en ? "You can now sign in with your new password." : "Maaari ka nang mag-sign in gamit ang bagong password."}
                </p>
                <button className="btn gold" onClick={() => onNav("signin")}>{en ? "Go to Sign In" : "Pumunta sa Sign In"}</button>
            </div>
        </div>
    )

    return (
        <div className="pad" style={{ paddingTop: 28 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
                    UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                    {en ? "Forgot Password" : "Nakalimutan ang Password"}
                </h2>
                <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 16 }}>
                    {en ? "Enter your number, verify your identity, then set a new password." : "Ilagay ang iyong numero, i-verify ang pagkakakilanlan, pagkatapos ay magtakda ng bagong password."}
                </p>

                <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
                    {[1,2,3].map(n => (
                        <div key={n} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
                                background: step >= n ? "var(--navy)" : "var(--border)",
                                color: step >= n ? "#fff" : "var(--slate)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700
                            }}>{n}</div>
                            <div style={{ fontSize: 10, color: "var(--slate)" }}>
                                {n === 1 ? (en ? "Mobile number" : "Numero") : n === 2 ? (en ? "Confirm identity" : "Kumpirmahin") : (en ? "New password" : "Bagong password")}
                            </div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert amber">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleFindAccount}>
                        <div className="fg">
                            <label className="fl">{en ? "Mobile Number" : "Numero ng Telepono"}</label>
                            <input className="fi" placeholder="09XX XXX XXXX" value={mobile} onChange={e => setMobile(e.target.value)} />
                        </div>
                        <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Continue" : "Magpatuloy")}</button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyAnswer}>
                        <div className="alert jade">✓ {en ? `Account found for ${mobile}` : `Nahanap ang account para sa ${mobile}`}</div>
                        <div className="fg">
                            <label className="fl">{securityQuestion}</label>
                            <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} />
                            <div className="fh">{en ? "Not case-sensitive." : "Hindi case-sensitive."}</div>
                        </div>
                        <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Identity" : "I-verify ang Pagkakakilanlan")}</button>
                        <button type="button" className="btn outline" onClick={() => setStep(1)}>{en ? "Back" : "Bumalik"}</button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="alert jade">✓ {en ? "Identity confirmed. Set your new password." : "Nakumpirma ang pagkakakilanlan. Itakda ang bagong password."}</div>
                        <div className="fg">
                            <label className="fl">{en ? "New Password" : "Bagong Password"}</label>
                            <input className="fi" type="password" placeholder={en ? "Enter new password" : "Ilagay ang bagong password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            <div className="fh">{en ? "At least 8 characters, with a number and a special character." : "Hindi bababa sa 8 karakter, may numero at special character."}</div>
                        </div>
                        <div className="fg">
                            <label className="fl">{en ? "Confirm New Password" : "Kumpirmahin ang Bagong Password"}</label>
                            <input className="fi" type="password" placeholder={en ? "Re-enter new password" : "Ulitin ang bagong password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                        <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Reset Password" : "I-reset ang Password")}</button>
                        <button type="button" className="btn outline" onClick={() => setStep(2)}>{en ? "Back" : "Bumalik"}</button>
                    </form>
                )}

                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    <span className="link" onClick={() => onNav("signin")}>← {en ? "Back to Sign In" : "Bumalik sa Sign In"}</span>
                </div>
            </div>
        </div>
    )
}

// ─── SIGN UP ──────────────────────────────────────────────────────────────────
function SignUp({ en, onNav, onLogin }) {
    const [step, setStep] = useState(1)
    const [otp, setOtp] = useState("")
    const [noMiddle, setNoMiddle] = useState(false)
    const [noExtension, setNoExtension] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [consented, setConsented] = useState(false)
    const [form, setForm] = useState({
        last_name: "", first_name: "", middle_name: "", extension_name: "",
        region: "", province: "", city: "", barangay: "",
        mobile: "", birth_month: "", birth_day: "", birth_year: "", age: "", sex: "",
        denomination: "", case_number: "", operator_name: "", cooperative_name: "",
        plate_number: "", chassis_number: "", license_number: "",
        ewallet_type: "", ewallet_number: "", password: "", confirm_password: "",
        security_question: "", security_answer: "",
        security_question_2: "", security_answer_2: "",
    })

    function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

    function calcAge(year) {
        if (year && year.length === 4) {
            const age = new Date().getFullYear() - parseInt(year)
            set("age", age.toString())
        }
    }

    function validatePassword() {
        const pw = form.password
        if (pw.length < 8) return en ? "Password must be at least 8 characters." : "Dapat hindi bababa sa 8 karakter ang password."
        if (!/[0-9]/.test(pw)) return en ? "Password must contain at least one number." : "Dapat may kasamang numero ang password."
        if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(pw)) return en ? "Password must contain at least one special character." : "Dapat may kasamang special character ang password."
        if (form.birth_year && pw.includes(form.birth_year)) {
            return en ? "Password must not contain your birth year." : "Hindi dapat naka-base sa taon ng kapanganakan ang password."
        }
        if (form.password === form.last_name || form.password === form.first_name) {
            return en ? "Password must not be your name." : "Hindi dapat ang pangalan mo ang password."
        }
        if (pw !== form.confirm_password) return en ? "Passwords do not match." : "Hindi magkatugma ang mga password."
        return null
    }

    function handleValidateAndSendOtp(e) {
        e.preventDefault()
        if (!consented) { setError(en ? "Please accept the Terms and Conditions." : "Kailangan munang tanggapin ang Terms and Conditions."); return }
        if (!form.last_name || !form.first_name || !form.mobile || !form.license_number || !form.password) {
            setError(en ? "Please fill in all required fields." : "Punan ang lahat ng required na fields.")
            return
        }
        if (!form.birth_month || !form.birth_day || !form.birth_year) {
            setError(en ? "Date of birth is required." : "Kailangan ang petsa ng kapanganakan.")
            return
        }
        if (!form.region || !form.province || !form.city || !form.barangay) {
            setError(en ? "Complete address is required." : "Kailangan ang kumpletong tirahan.")
            return
        }
        if (!form.security_question || !form.security_answer) {
            setError(en ? "Please set up your first security question." : "Mag-set up ng unang security question.")
            return
        }
        if (!form.security_question_2 || !form.security_answer_2) {
            setError(en ? "Please set up your second security question." : "Mag-set up ng pangalawang security question.")
            return
        }
        if (form.security_question === form.security_question_2) {
            setError(en ? "Please choose two different security questions." : "Pumili ng dalawang magkaibang security question.")
            return
        }
        const pwError = validatePassword()
        if (pwError) { setError(pwError); return }

        setError("")
        setStep(2)
    }

    async function handleConfirmOtp(e) {
        e.preventDefault()
        setLoading(true)
        setError("")

        const full_name = [form.first_name, noMiddle ? "" : form.middle_name, form.last_name, noExtension ? "" : form.extension_name].filter(Boolean).join(" ")

        const { error } = await supabase.from("drivers").insert({
            full_name,
            last_name: form.last_name,
            first_name: form.first_name,
            middle_name: noMiddle ? "N/A" : form.middle_name,
            extension_name: noExtension ? "N/A" : (form.extension_name || "N/A"),
            region: form.region, province: form.province, city: form.city, barangay: form.barangay,
            mobile: form.mobile,
            birth_month: form.birth_month, birth_day: form.birth_day, birth_year: form.birth_year, age: form.age,
            sex: form.sex, denomination: form.denomination, case_number: form.case_number,
            operator_name: form.operator_name, cooperative_name: form.cooperative_name,
            plate_number: form.plate_number,
            chassis_number: form.chassis_number, license_number: form.license_number,
            ewallet_type: form.ewallet_type || null, ewallet_number: form.ewallet_number || null,
            password: form.password,
            philsys_number: form.mobile,
            verification_status: "unverified",
            security_question: form.security_question,
            security_answer: form.security_answer.trim().toLowerCase(),
            security_question_2: form.security_question_2,
            security_answer_2: form.security_answer_2.trim().toLowerCase(),
        })
        setLoading(false)
        if (error) {
            setError(error.message.includes("duplicate") ?
                (en ? "This mobile number is already registered." : "Nakarehistro na ang numero na ito.") :
                (en ? "Something went wrong. Please try again." : "May nangyaring mali. Subukan muli."))
            return
        }
        onLogin(form.mobile)
    }

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const days = Array.from({length:31}, (_,i) => String(i+1))
    const denominations = ["MPUJ","TPUJ","MUVE","TUVE","MPUB","PUB","Mini-Bus","School Transport","Taxi"]
    const securityQuestions = [
        en ? "What is your mother's maiden name?" : "Ano ang pangalan ng inyong ina bago mag-asawa?",
        en ? "What was the plate number of your first vehicle?" : "Ano ang plate number ng iyong unang sasakyan?",
        en ? "What is the name of your childhood best friend?" : "Ano ang pangalan ng iyong matalik na kaibigan noong bata ka pa?",
        en ? "What is your barangay's old name or nickname?" : "Ano ang lumang pangalan o palayaw ng iyong barangay?",
        en ? "What was your first employer or operator's name?" : "Ano ang pangalan ng iyong unang amo o operator?",
    ]

    if (step === 2) {
        return (
            <div className="pad" style={{ paddingTop: 28 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
                        UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                        {en ? "Verify Your Mobile Number" : "I-verify ang Numero ng Telepono"}
                    </h2>
                    <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 16 }}>
                        {en ? "Almost done! Confirm your number to finish creating your account." : "Halos tapos na! Kumpirmahin ang numero para matapos ang paggawa ng account."}
                    </p>
                    {error && <div className="alert amber">{error}</div>}
                    <form onSubmit={handleConfirmOtp}>
                        <div className="alert amber">📱 {en ? `OTP sent to ${form.mobile}` : `Napadala ang OTP sa ${form.mobile}`}</div>
                        <div className="fg">
                            <label className="fl">One-Time PIN</label>
                            <input className="fi" placeholder="_ _ _ _ _ _" value={otp} onChange={e => setOtp(e.target.value)} style={{ fontSize: 22, letterSpacing: 8, textAlign: "center" }} />
                        </div>
                        <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Confirm and Create Account" : "Kumpirmahin at Gumawa ng Account")}</button>
                        <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", fontSize: 12, color: "var(--slate)", cursor: "pointer", width: "100%", textAlign: "center", marginTop: 4 }}>
                            ← {en ? "Back to edit details" : "Bumalik para i-edit"}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="pad" style={{ paddingTop: 24 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>
                    UP<span style={{ color: "var(--gold)" }}>LIFT</span>
                </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
                    {en ? "Create Account" : "Gumawa ng Account"}
                </h2>
                <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 16 }}>
                    {en ? "Ensure all information matches your Driver's License exactly." : "Siguraduhing tugma ang lahat ng impormasyon sa iyong Driver's License."}
                </p>
                {error && <div className="alert amber">{error}</div>}
                <form onSubmit={handleValidateAndSendOtp}>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 4 }}>
                        {en ? "Personal Information" : "Personal na Impormasyon"}
                    </div>

                    <div className="fg"><label className="fl">{en ? "Last Name *" : "Apelyido *"}</label><input className="fi" placeholder="e.g. Santos" value={form.last_name} onChange={e => set("last_name", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "First Name *" : "Pangalan *"}</label><input className="fi" placeholder="e.g. Juan" value={form.first_name} onChange={e => set("first_name", e.target.value)} /></div>

                    <div className="fg">
                        <label className="fl">{en ? "Middle Name" : "Gitnang Pangalan"}</label>
                        <input className="fi" placeholder="e.g. Dela Cruz" value={noMiddle ? "" : form.middle_name} onChange={e => set("middle_name", e.target.value)} disabled={noMiddle} style={{ opacity: noMiddle ? 0.4 : 1 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <input type="checkbox" id="nomiddle" checked={noMiddle} onChange={e => setNoMiddle(e.target.checked)} style={{ cursor: "pointer" }} />
                            <label htmlFor="nomiddle" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>{en ? "I have no middle name" : "Wala akong gitnang pangalan"}</label>
                        </div>
                    </div>

                    <div className="fg">
                        <label className="fl">{en ? "Extension Name" : "Extension Name"} <span style={{fontWeight:400,color:"var(--slate)"}}>(Jr, Sr, III)</span></label>
                        <input className="fi" placeholder="e.g. Jr" value={noExtension ? "" : form.extension_name} onChange={e => set("extension_name", e.target.value)} disabled={noExtension} style={{ opacity: noExtension ? 0.4 : 1 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <input type="checkbox" id="noext" checked={noExtension} onChange={e => setNoExtension(e.target.checked)} style={{ cursor: "pointer" }} />
                            <label htmlFor="noext" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>{en ? "I have no extension name" : "Wala akong extension name"}</label>
                        </div>
                    </div>

                    <div className="fg">
                        <label className="fl">{en ? "Sex *" : "Kasarian *"}</label>
                        <select className="fsel" value={form.sex} onChange={e => set("sex", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            <option>Male</option>
                            <option>Female</option>
                            <option>Others</option>
                        </select>
                    </div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                        {en ? "Date of Birth *" : "Petsa ng Kapanganakan *"}
                    </div>
                    <div className="two-col">
                        <div className="fg">
                            <label className="fl">{en ? "Month" : "Buwan"}</label>
                            <select className="fsel" value={form.birth_month} onChange={e => set("birth_month", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {months.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="fg">
                            <label className="fl">{en ? "Day" : "Araw"}</label>
                            <select className="fsel" value={form.birth_day} onChange={e => set("birth_day", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {days.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Year (YYYY)" : "Taon (YYYY)"}</label>
                        <input className="fi" placeholder="e.g. 1985" value={form.birth_year} onChange={e => { set("birth_year", e.target.value); calcAge(e.target.value) }} maxLength={4} />
                    </div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                        {en ? "Address *" : "Tirahan *"}
                    </div>
                    <div className="fg"><label className="fl">Region *</label><input className="fi" placeholder="e.g. NCR" value={form.region} onChange={e => set("region", e.target.value)} /></div>
                    <div className="fg"><label className="fl">Province *</label><input className="fi" placeholder="e.g. Metro Manila" value={form.province} onChange={e => set("province", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "City / Municipality *" : "Lungsod / Munisipyo *"}</label><input className="fi" placeholder="e.g. Quezon City" value={form.city} onChange={e => set("city", e.target.value)} /></div>
                    <div className="fg"><label className="fl">Barangay *</label><input className="fi" placeholder="e.g. Brgy. Poblacion" value={form.barangay} onChange={e => set("barangay", e.target.value)} /></div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                        {en ? "Vehicle and Franchise" : "Sasakyan at Pransisa"}
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Denomination (Vehicle Type) *" : "Uri ng Sasakyan *"}</label>
                        <select className="fsel" value={form.denomination} onChange={e => set("denomination", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            {denominations.map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="fg"><label className="fl">{en ? "Case Number *" : "Case Number *"} <span style={{fontWeight:400,color:"var(--slate)"}}>e.g. 2020-XXXX</span></label><input className="fi" placeholder="2020-XXXX" value={form.case_number} onChange={e => set("case_number", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Operator's Name *" : "Pangalan ng Operator *"}</label><input className="fi" placeholder={en ? "Transport entity or individual name" : "Pangalan ng transport entity o indibidwal"} value={form.operator_name} onChange={e => set("operator_name", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Cooperative Name" : "Pangalan ng Kooperatiba"} <span style={{fontWeight:400,color:"var(--slate)"}}>{en?"if applicable":"kung mayroon"}</span></label><input className="fi" placeholder={en ? "e.g. Quezon City TODA Inc." : "hal. Quezon City TODA Inc."} value={form.cooperative_name} onChange={e => set("cooperative_name", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Plate Number *" : "Plate Number *"}</label><input className="fi" placeholder="e.g. ABC 1234" value={form.plate_number} onChange={e => set("plate_number", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Chassis Number *" : "Chassis Number *"}</label><input className="fi" placeholder="e.g. XXXXXXXXXX" value={form.chassis_number} onChange={e => set("chassis_number", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Driver's License Number *" : "Numero ng Driver's License *"} <span style={{fontWeight:400,color:"var(--slate)"}}>N/A if not applicable</span></label><input className="fi" placeholder="C01-XX-XXXXXX" value={form.license_number} onChange={e => set("license_number", e.target.value)} /></div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                        {en ? "Contact" : "Kontak"}
                    </div>
                    <div className="fg"><label className="fl">{en ? "Mobile Number *" : "Numero ng Telepono *"}</label><input className="fi" placeholder="09XX XXX XXXX" value={form.mobile} onChange={e => set("mobile", e.target.value)} /></div>

                    {/*<div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6, marginTop: 16 }}>*/}
                    {/*    {en ? "E-wallet (Optional)" : "E-wallet (Opsyonal)"}*/}
                    {/*</div>*/}
                    {/*<p style={{ fontSize: 11, color: "var(--slate)", marginBottom: 10 }}>*/}
                    {/*    {en ? "Don't have an e-wallet yet? No problem — you can still create an account and claim subsidies in person. You may add this later." : "Wala pang e-wallet? Walang problema — maaari ka pa ring gumawa ng account at kunin ang subsidy nang personal. Pwede mo itong idagdag sa ibang pagkakataon."}*/}
                    {/*</p>*/}
                    {/*<div className="fg">*/}
                    {/*    <label className="fl">{en ? "E-wallet Type" : "Uri ng E-wallet"} <span style={{fontWeight:400,color:"var(--slate)"}}>{en?"must be registered in driver's name":"dapat nakalaan sa pangalan ng driver"}</span></label>*/}
                    {/*    <select className="fsel" value={form.ewallet_type} onChange={e => set("ewallet_type", e.target.value)}>*/}
                    {/*        <option value="">{en ? "No e-wallet / Select later" : "Walang e-wallet / Piliin sa ibang pagkakataon"}</option>*/}
                    {/*        <option>GCash</option>*/}
                    {/*        <option>PayMaya</option>*/}
                    {/*    </select>*/}
                    {/*</div>*/}
                    {/*<div className="fg"><label className="fl">{en ? "E-wallet Number" : "Numero ng E-wallet"}</label><input className="fi" placeholder="e.g. 0996-XXX-XXXX" value={form.ewallet_number} onChange={e => set("ewallet_number", e.target.value)} /></div>*/}

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                        {en ? "Account Security" : "Seguridad ng Account"}
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Password *" : "Password *"}</label>
                        <input className="fi" type="password" placeholder={en ? "Create a password" : "Gumawa ng password"} value={form.password} onChange={e => set("password", e.target.value)} />
                        <div className="fh">{en ? "At least 8 characters, with a number and a special character. Cannot be your name or birth year." : "Hindi bababa sa 8 karakter, may numero at special character. Hindi puwedeng pangalan o taon ng kapanganakan."}</div>
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Confirm Password *" : "Kumpirmahin ang Password *"}</label>
                        <input className="fi" type="password" placeholder={en ? "Re-enter your password" : "Ulitin ang password"} value={form.confirm_password} onChange={e => set("confirm_password", e.target.value)} />
                    </div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6, marginTop: 16 }}>
                        {en ? "Account Recovery *" : "Pagbawi ng Account *"}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--slate)", marginBottom: 10 }}>
                        {en ? "In case SMS OTP doesn't arrive, this question helps you recover your account." : "Sakaling hindi dumating ang SMS OTP, makakatulong ang tanong na ito para mabawi ang iyong account."}
                    </p>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>
                        {en ? "Question 1 of 2" : "Tanong 1 ng 2"}
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Choose a Security Question *" : "Pumili ng Security Question *"}</label>
                        <select className="fsel" value={form.security_question} onChange={e => set("security_question", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            {securityQuestions.map(q => <option key={q}>{q}</option>)}
                        </select>
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Your Answer *" : "Sagot Mo *"}</label>
                        <input className="fi" placeholder={en ? "Type your answer" : "I-type ang sagot"} value={form.security_answer} onChange={e => set("security_answer", e.target.value)} />
                        <div className="fh">{en ? "Remember this exactly. Not case-sensitive." : "Tandaan ito nang eksakto. Hindi case-sensitive."}</div>
                    </div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12, color: "var(--slate)", marginBottom: 8, marginTop: 12 }}>
                        {en ? "Question 2 of 2" : "Tanong 2 ng 2"}
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Choose a Second Security Question *" : "Pumili ng Pangalawang Security Question *"}</label>
                        <select className="fsel" value={form.security_question_2} onChange={e => set("security_question_2", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            {securityQuestions.filter(q => q !== form.security_question).map(q => <option key={q}>{q}</option>)}
                        </select>
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Your Answer *" : "Sagot Mo *"}</label>
                        <input className="fi" placeholder={en ? "Type your answer" : "I-type ang sagot"} value={form.security_answer_2} onChange={e => set("security_answer_2", e.target.value)} />
                        <div className="fh">{en ? "Remember this exactly. Not case-sensitive." : "Tandaan ito nang eksakto. Hindi case-sensitive."}</div>
                    </div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                        {en ? "Terms and Conditions" : "Mga Tuntunin at Kundisyon"}
                    </div>
                    <div style={{ background: "var(--cream)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)", padding: 12, fontSize: 11, color: "var(--slate)", maxHeight: 140, overflowY: "auto", marginBottom: 12, lineHeight: 1.6 }}>
                        <strong>{en ? "DATA PRIVACY CONSENT" : "PAHINTULOT SA DATA PRIVACY"}</strong> — {en ? "In accordance with Republic Act No. 10173 (Data Privacy Act of 2012), the information collected in this form shall be used solely for the purpose of processing, validation, and implementation of the Fuel Subsidy Program." : "Alinsunod sa Republic Act No. 10173 (Data Privacy Act of 2012), ang impormasyong nakolekta sa form na ito ay gagamitin lamang para sa Fuel Subsidy Program."}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
                        <input type="checkbox" id="consent" checked={consented} onChange={e => setConsented(e.target.checked)} style={{ marginTop: 2, cursor: "pointer", flexShrink: 0 }} />
                        <label htmlFor="consent" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer", lineHeight: 1.5 }}>
                            {en ? "I give my consent to the collection and processing of my personal data." : "Ibinibigay ko ang aking pahintulot sa pagkolekta at pagproseso ng aking personal na data."}
                        </label>
                    </div>

                    <button className="btn gold" type="submit" disabled={loading}>{en ? "Continue to Verification" : "Magpatuloy sa Verification"}</button>
                </form>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    {en ? "Already have an account?" : "Mayroon nang account?"} <span className="link" onClick={() => onNav("signin")}>{en ? "Sign in" : "Mag-sign in"}</span>
                </div>
            </div>
        </div>
    )
}

function ConcernsInline({ en, concerns, apps, driverId, showToast, refreshConcerns }) {
    const [expandedId, setExpandedId] = useState(null)
    useEffect(() => {
        if (sessionStorage.getItem("uplift_draft_show") === "true") {
            sessionStorage.removeItem("uplift_draft_show")
        }
    }, [])
    const [draftMessages, setDraftMessages] = useState({})
    const [draftTimers, setDraftTimers] = useState({})
    const [newConcernAppId, setNewConcernAppId] = useState(sessionStorage.getItem("uplift_draft_appid") || null)
    const [newConcernType, setNewConcernType] = useState(sessionStorage.getItem("uplift_draft_type") || "")
    const [newConcernMessage, setNewConcernMessage] = useState(sessionStorage.getItem("uplift_draft_message") || "")
    const [showNewForm, setShowNewForm] = useState(!!sessionStorage.getItem("uplift_draft_message") || sessionStorage.getItem("uplift_draft_show") === "true")

    async function markSeen(concern) {
        if (concern.admin_reply && !concern.driver_seen_reply) {
            await supabase.from("grievances").update({ driver_seen_reply: true }).eq("id", concern.id)
            await refreshConcerns()
        }
    }

    function handleDraftChange(concernId, value) {
        setDraftMessages(p => ({ ...p, [concernId]: value }))
        if (draftTimers[concernId]) clearTimeout(draftTimers[concernId])
        const timer = setTimeout(async () => {
            await supabase.from("grievances").update({ draft_message: value }).eq("id", concernId)
        }, 1500)
        setDraftTimers(p => ({ ...p, [concernId]: timer }))
    }

    async function submitConcern(concern) {
        const message = draftMessages[concern.id] ?? concern.draft_message
        if (!message?.trim()) return
        await supabase.from("grievances").update({
            message: message,
            is_draft: false,
            status: "submitted",
        }).eq("id", concern.id)
        showToast(en ? "Concern submitted." : "Naisumite ang alalahanin.")
        await refreshConcerns()
    }

    const [autoSaveTimer, setAutoSaveTimer] = useState(null)
    const [currentDraftId, setCurrentDraftId] = useState(sessionStorage.getItem("uplift_draft_id") || null)

    async function handleNewMessageChange(value) {
        setNewConcernMessage(value)
        sessionStorage.setItem("uplift_draft_message", value)
        if (autoSaveTimer) clearTimeout(autoSaveTimer)
        const timer = setTimeout(async () => {
            if (!value.trim()) return
            if (currentDraftId) {
                await supabase.from("grievances").update({
                    draft_message: value,
                    message: value,
                    concern_type: newConcernType || "General",
                }).eq("id", currentDraftId)
            } else {
                const { data } = await supabase.from("grievances").insert({
                    driver_id: driverId,
                    application_id: newConcernAppId || null,
                    concern_type: newConcernType || "General",
                    message: value,
                    draft_message: value,
                    is_draft: true,
                    status: "draft",
                }).select().single()
                if (data) {
                    setCurrentDraftId(data.id)
                    sessionStorage.setItem("uplift_draft_id", data.id)
                }
            }
            await refreshConcerns()
        }, 1500)
        setAutoSaveTimer(timer)
    }

    async function submitNewConcern() {
        if (!newConcernMessage.trim() || !newConcernAppId) {
            showToast(en ? "Please select a subsidy and write your concern." : "Pumili ng subsidy at isulat ang iyong alalahanin.")
            return
        }
        if (currentDraftId) {
            await supabase.from("grievances").update({
                message: newConcernMessage,
                is_draft: false,
                status: "submitted",
            }).eq("id", currentDraftId)
        } else {
            await supabase.from("grievances").insert({
                driver_id: driverId,
                application_id: newConcernAppId,
                concern_type: newConcernType || "General",
                message: newConcernMessage,
                is_draft: false,
                status: "submitted",
            })
        }
        setShowNewForm(false)
        setNewConcernMessage("")
        setNewConcernType("")
        setNewConcernAppId(null)
        setCurrentDraftId(null)
        sessionStorage.removeItem("uplift_draft_message")
        sessionStorage.removeItem("uplift_draft_id")
        sessionStorage.removeItem("uplift_draft_appid")
        sessionStorage.removeItem("uplift_draft_type")
        sessionStorage.removeItem("uplift_draft_show")
        showToast(en ? "Concern submitted." : "Naisumite ang alalahanin.")
        await refreshConcerns()
    }

    const grouped = {}
    concerns.forEach(c => {
        const name = c.applications?.payout_events?.program_name || (en ? "General Concern" : "Pangkalahatang Alalahanin")
        if (!grouped[name]) grouped[name] = []
        grouped[name].push(c)
    })

    const statusBadge = (c) => {
        if (c.is_draft || c.status === "draft") return (
            <span style={{ background: "var(--amber-bg)", color: "var(--amber)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            📝 {en ? "Draft" : "Draft"}
        </span>
        )
        if (c.admin_reply && !c.driver_seen_reply) return (
            <span style={{ background: "var(--jade-bg)", color: "var(--jade)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            🔔 {en ? "New Update!" : "Bagong Update!"}
        </span>
        )
        if (c.admin_reply) return (
            <span style={{ background: "var(--gold-bg, rgba(245,166,35,0.1))", color: "var(--gold-dk)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            👁️ {en ? "View Response" : "Tingnan ang Tugon"}
        </span>
        )
        return (
            <span style={{ background: "rgba(150,150,150,0.1)", color: "var(--slate)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>
            ⏳ {en ? "Awaiting Response" : "Naghihintay ng Tugon"}
        </span>
        )
    }

    return (
        <div>
            {Object.keys(grouped).length === 0 && !showNewForm && (
                <div className="card" style={{ textAlign: "center", padding: 16, color: "var(--slate)", fontSize: 13 }}>
                    {en ? "No concerns filed yet." : "Wala pang naisumiteng alalahanin."}
                </div>
            )}

            {Object.entries(grouped).map(([programName, items]) => (
                <div key={programName} style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6 }}>
                        📋 {programName}
                    </div>
                    {items.map(c => (
                        <div key={c.id} className="card" style={{ marginBottom: 8 }}>
                            <div
                                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                onClick={async () => {
                                    const next = expandedId === c.id ? null : c.id
                                    setExpandedId(next)
                                    if (next) await markSeen(c)
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{c.concern_type}</div>
                                    <div style={{ fontSize: 11, color: "var(--slate)" }}>{new Date(c.created_at).toLocaleDateString()}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {statusBadge(c)}
                                    <span style={{ color: "var(--slate)" }}>{expandedId === c.id ? "▲" : "▼"}</span>
                                </div>
                            </div>

                            {expandedId === c.id && (
                                <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                                    {c.is_draft || c.status === "draft" ? (
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, marginBottom: 8 }}>
                                                📝 {en ? "This concern is saved as a draft. Edit and submit when ready." : "Naka-save ito bilang draft. I-edit at isumite kapag handa na."}
                                            </div>
                                            <textarea
                                                className="fta"
                                                value={draftMessages[c.id] ?? c.draft_message ?? ""}
                                                onChange={e => handleDraftChange(c.id, e.target.value)}
                                                placeholder={en ? "Your concern..." : "Ang iyong alalahanin..."}
                                                style={{ minHeight: 80, marginBottom: 8 }}
                                            />
                                            <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 8 }}>
                                                💾 {en ? "Auto-saving as you type..." : "Awtomatikong nini-save habang nagta-type..."}
                                            </div>
                                            <button className="btn navy" style={{ marginBottom: 0 }} onClick={() => submitConcern(c)}>
                                                {en ? "Submit Concern" : "Isumite ang Alalahanin"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 6, fontWeight: 600 }}>
                                                {en ? "Your message:" : "Ang iyong mensahe:"}
                                            </div>
                                            <div style={{ fontSize: 13, color: "var(--navy)", background: "var(--cream)", borderRadius: "var(--r-sm)", padding: "10px 12px", marginBottom: 12 }}>
                                                {c.message}
                                            </div>
                                            {c.admin_reply ? (
                                                <div>
                                                    <div style={{ fontSize: 12, color: "var(--jade)", fontWeight: 600, marginBottom: 6 }}>
                                                        {en ? "Agency response:" : "Tugon ng ahensya:"}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "var(--navy)", background: "var(--jade-bg)", borderRadius: "var(--r-sm)", padding: "10px 12px", border: "1px solid var(--jade)" }}>
                                                        {c.admin_reply}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "var(--slate)", marginTop: 4 }}>
                                                        {c.replied_at ? new Date(c.replied_at).toLocaleString() : ""}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 12, color: "var(--slate)", fontStyle: "italic" }}>
                                                    ⏳ {en ? "Waiting for agency response..." : "Naghihintay ng tugon mula sa ahensya..."}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}

            {showNewForm ? (
                <div className="card">
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                        {en ? "New Concern" : "Bagong Alalahanin"}
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Which subsidy is this about? *" : "Tungkol saan itong subsidy? *"}</label>
                        <select className="fsel" value={newConcernAppId || ""} onChange={e => { setNewConcernAppId(e.target.value); sessionStorage.setItem("uplift_draft_appid", e.target.value) }}>
                            <option value="">{en ? "Select a subsidy..." : "Pumili ng subsidy..."}</option>
                            {apps.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.payout_events?.program_name} ({a.status})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Type of Concern" : "Uri ng Alalahanin"}</label>
                        <select className="fsel" value={newConcernType} onChange={e => { setNewConcernType(e.target.value); sessionStorage.setItem("uplift_draft_type", e.target.value) }}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            <option value="Application Issue">{en ? "Application Issue" : "Problema sa Aplikasyon"}</option>
                            <option value="Payout Issue">{en ? "Payout Issue" : "Problema sa Payout"}</option>
                            <option value="Eligibility Question">{en ? "Eligibility Question" : "Tanong sa Kwalipikasyon"}</option>
                            <option value="Document Concern">{en ? "Document Concern" : "Alalahanin sa Dokumento"}</option>
                            <option value="Other">{en ? "Other" : "Iba pa"}</option>
                        </select>
                    </div>
                    <div className="fg">
                        <label className="fl">{en ? "Your Message" : "Ang Iyong Mensahe"}</label>
                        <textarea
                            className="fta"
                            placeholder={en ? "Describe your concern..." : "Ilarawan ang iyong alalahanin..."}
                            value={newConcernMessage}
                            onChange={e => handleNewMessageChange(e.target.value)}
                            style={{ minHeight: 80 }}
                        />
                        {newConcernMessage.trim() && (
                            <div style={{ fontSize: 11, color: "var(--slate)", marginTop: 4 }}>
                                💾 {en ? "Auto-saving draft..." : "Awtomatikong nini-save ang draft..."}
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn navy" onClick={submitNewConcern}>{en ? "Submit Concern" : "Isumite ang Alalahanin"}</button>
                        <button className="btn outline" onClick={() => { setShowNewForm(false); setNewConcernMessage(""); setNewConcernType(""); setNewConcernAppId(null); setCurrentDraftId(null); sessionStorage.removeItem("uplift_draft_message"); sessionStorage.removeItem("uplift_draft_id"); sessionStorage.removeItem("uplift_draft_appid"); sessionStorage.removeItem("uplift_draft_type"); sessionStorage.removeItem("uplift_draft_show") }}>{en ? "Cancel" : "Kanselahin"}</button>
                    </div>
                </div>
            ) : (
                <button className="btn outline" onClick={() => setShowNewForm(true)}>
                    + {en ? "File a New Concern" : "Mag-file ng Bagong Alalahanin"}
                </button>
            )}
        </div>
    )
}

function DashUpload({ en, onUploadDocument, driver }) {
    const [dashFile, setDashFile] = useState(null)
    const [uploading, setUploading] = useState(false)

    async function doUpload() {
        if (!dashFile || dashFile.length === 0) return
        setUploading(true)
        await onUploadDocument(Array.from(dashFile))
        setDashFile(null)
        setUploading(false)
    }

    return (
        <div className="card" style={{ border: "1.5px dashed var(--gold)", background: "rgba(245,166,35,0.03)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>🪪 {en ? "Submit Verification Documents" : "Mag-submit ng Dokumento"}</div>
            <ul style={{ fontSize: 11, color: "var(--slate)", marginBottom: 12, paddingLeft: 16 }}>
                <li>{en ? "Selfie while holding your Driver's License" : "Selfie habang hawak ang iyong Driver's License"}</li>
                <li>{en ? "Front of Driver's License" : "Harap ng Driver's License"}</li>
                <li>{en ? "Front of Driver's License" : "Harap ng Driver's License"}</li>
                <li>{en ? "Back of Driver's License" : "Likod ng Driver's License"}</li>
                <li>{en ? "Supporting document (OR/CR, franchise cert, etc.)" : "Suporting dokumento"}</li>
            </ul>
            <div className="upload" style={{ background: "#fff", padding: 16, marginBottom: 10 }} onClick={() => document.getElementById("dash-upload").click()}>
                <div className="upload-ico">{dashFile && dashFile.length > 0 ? "✅" : "📂"}</div>
                <div className="upload-txt">
                    {dashFile && dashFile.length > 0
                        ? `${dashFile.length} ${en ? "file(s) selected" : "file(s) napili"}`
                        : (en ? "Tap to select files (JPG, PNG, PDF, Word, Excel)" : "I-tap para pumili ng mga file")}
                </div>
            </div>
            <input id="dash-upload" type="file" accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple style={{ display: "none" }} onChange={e => { if (e.target.files.length > 0) setDashFile(e.target.files) }} />
            {dashFile && dashFile.length > 0 && (
                <button className="btn gold" onClick={doUpload} disabled={uploading}>
                    {uploading ? (en ? "Uploading..." : "Ina-upload...") : (en ? `Submit ${dashFile.length} Document(s)` : `Isumite ang ${dashFile.length} Dokumento`)}
                </button>
            )}
        </div>
    )
}

function NotifFeed({ en, apps, appointment, driver, openEvents, onOpenModal, compact }) {
    const notifs = []
    const now = new Date()
    const existingEventIds = (apps || []).map(a => a.event_id)

    ;(openEvents || []).forEach(ev => {
        if (existingEventIds.includes(ev.id)) return
        if (!ev.application_deadline || new Date(ev.application_deadline) < now) return
        const hoursLeft = (new Date(ev.application_deadline) - now) / (1000 * 60 * 60)
        if (hoursLeft <= 48) {
            notifs.unshift({
                dot: "rejected",
                icon: "⚠️",
                title: en ? (hoursLeft <= 24 ? "Deadline TODAY!" : "Deadline Tomorrow!") : (hoursLeft <= 24 ? "Deadline Ngayon!" : "Deadline Bukas!"),
                msg: en ? `Apply for ${ev.program_name} before it closes.` : `Mag-apply sa ${ev.program_name} bago magsara.`,
                time: hoursLeft <= 24 ? (en ? "Today" : "Ngayon") : (en ? "Tomorrow" : "Bukas"),
                modal: {
                    icon: "⚠️",
                    title: en ? "Deadline Soon!" : "Malapit na ang Deadline!",
                    body: `${ev.program_name} — ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
                    action: { type: "apply", eventId: ev.id },
                    actionLabel: en ? "Apply Now" : "Mag-apply Na",
                    closeLabel: en ? "Later" : "Mamaya na"
                }
            })
        }
    })

    ;(apps || []).forEach(a => {
        if (a.status === "approved") notifs.push({
            dot: "approved",
            icon: "🎉",
            title: en ? "Application Approved!" : "Naaprubahan ang Aplikasyon!",
            msg: en ? `${a.payout_events?.program_name} — Claim at ${a.payout_events?.venue} on ${a.payout_events?.event_date}.` : `${a.payout_events?.program_name} — Kunin sa ${a.payout_events?.venue} sa ${a.payout_events?.event_date}.`,
            time: en ? "Recent" : "Kamakailan",
            modal: {
                icon: "🎉",
                title: en ? "Application Approved!" : "Naaprubahan!",
                body: en ? `Claim your subsidy at ${a.payout_events?.venue} on ${a.payout_events?.event_date}.` : `Kunin sa ${a.payout_events?.venue} sa ${a.payout_events?.event_date}.`,
                action: "subsidies",
                actionLabel: en ? "View Details" : "Tingnan",
                closeLabel: en ? "Got it" : "Ok"
            }
        })
        else if (a.status === "rejected") notifs.push({
            dot: "rejected",
            icon: "❌",
            title: en ? "Application Rejected" : "Tinanggihan ang Aplikasyon",
            msg: en ? `${a.payout_events?.program_name}${a.rejection_fields ? ` — ${a.rejection_fields}` : ""}` : `${a.payout_events?.program_name}${a.rejection_fields ? ` — ${a.rejection_fields}` : ""}`,
            time: en ? "Recent" : "Kamakailan",
            modal: {
                icon: "❌",
                title: en ? "Application Rejected" : "Tinanggihan",
                body: a.rejection_fields || "",
                action: "editprofile",
                actionLabel: en ? "Edit My Information" : "I-edit",
                closeLabel: en ? "Later" : "Mamaya"
            }
        })
        else if (a.status === "pending") notifs.push({
            dot: "info",
            icon: "⏳",
            title: en ? "Awaiting Response" : "Naghihintay ng Tugon",
            msg: `${a.payout_events?.program_name}`,
            time: en ? "Recent" : "Kamakailan",
            modal: null
        })
    })

    if (driver?.verification_status === "verified") notifs.push({
        dot: "approved",
        icon: "✅",
        title: en ? "Account Verified" : "Na-verify ang Account",
        msg: en ? "Future applications will auto-fill from your profile." : "Awtomatikong mapupunan ang mga susunod na aplikasyon.",
        time: en ? "Verification" : "Verification",
        modal: {
            icon: "✅",
            title: en ? "Account Verified!" : "Na-verify!",
            body: en ? "Future subsidy applications will auto-fill from your profile." : "Awtomatikong mapupunan ang mga susunod na aplikasyon.",
            closeLabel: en ? "Got it" : "Ok"
        }
    })
    else if (driver?.verification_status === "rejected") notifs.push({
        dot: "rejected",
        icon: "❌",
        title: en ? "Verification Rejected" : "Tinanggihan ang Verification",
        msg: driver.verification_notes || "",
        time: en ? "Verification" : "Verification",
        modal: {
            icon: "❌",
            title: en ? "Verification Rejected" : "Tinanggihan",
            body: driver.verification_notes || "",
            action: "editprofile",
            actionLabel: en ? "Edit My Information" : "I-edit",
            closeLabel: en ? "Later" : "Mamaya"
        }
    })
    else notifs.push({
            dot: "info",
            icon: "⏳",
            title: en ? "Verification Under Review" : "Sinusuri ang Verification",
            msg: en ? "Expect results within 5–7 business days." : "Asahan ang resulta sa loob ng 5–7 araw ng trabaho.",
            time: en ? "Verification" : "Verification",
            modal: null
        })

    if (appointment) notifs.push({
        dot: "approved",
        icon: "📅",
        title: en ? "Appointment Confirmed" : "Nakumpirma ang Appointment",
        msg: `${appointment.assigned_date} · ${appointment.venue}`,
        time: en ? "Schedule" : "Iskedyul",
        modal: {
            icon: "📅",
            title: en ? "Your Appointment" : "Ang Iyong Appointment",
            body: `${appointment.assigned_date} · ${appointment.time_slot} · ${appointment.venue}`,
            action: "subsidies",
            actionLabel: en ? "View Subsidies" : "Tingnan",
            closeLabel: en ? "Ok" : "Ok"
        }
    })

    const dotColor = {
        approved: "var(--jade)",
        rejected: "var(--brick)",
        info: "rgba(255,255,255,0.35)"
    }

    const cardBg = {
        approved: "rgba(45,122,79,0.12)",
        rejected: "rgba(192,57,43,0.12)",
        info: "rgba(255,255,255,0.06)"
    }

    const cardBorder = {
        approved: "rgba(45,122,79,0.3)",
        rejected: "rgba(192,57,43,0.3)",
        info: "rgba(255,255,255,0.12)"
    }

    if (notifs.length === 0) return (
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", paddingTop: 20 }}>
            {en ? "No updates yet." : "Wala pang update."}
        </div>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifs.map((n, i) => (
                <div
                    key={i}
                    onClick={() => n.modal && onOpenModal && onOpenModal(n.modal)}
                    style={{
                        background: cardBg[n.dot],
                        border: `1px solid ${cardBorder[n.dot]}`,
                        borderRadius: "var(--r-sm)",
                        padding: "10px 12px",
                        cursor: n.modal ? "pointer" : "default",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        transition: "opacity 0.15s"
                    }}
                >
                    <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{n.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: "#fff", marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.4, wordBreak: "break-word" }}>{n.msg}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{n.time}</div>
                    </div>
                    {n.modal && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, flexShrink: 0, alignSelf: "center" }}>›</div>}
                </div>
            ))}
        </div>
    )
}
// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ en, onNav, driver, apps, appointment, onUploadDocument, concerns, driverId, showToast, refreshConcerns, openEvents, onOpenModal }) {

    function getGreeting() {
        const h = new Date().getHours()
        if (h < 12) return en ? "Good morning" : "Magandang umaga"
        if (h < 18) return en ? "Good afternoon" : "Magandang hapon"
        return en ? "Good evening" : "Magandang gabi"
    }

    function getBusinessDaysStr() {
        const today = new Date()
        const d5 = new Date(today); d5.setDate(d5.getDate() + 5)
        const d7 = new Date(today); d7.setDate(d7.getDate() + 7)
        const opts = { month: 'short', day: 'numeric' }
        return `${d5.toLocaleDateString('en-US', opts)} – ${d7.toLocaleDateString('en-US', opts)}`
    }

    return (
        <div>
            {/* ── Greeting + Notifications side by side ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "0 0 0 0" }}>
                {/* Left box — greeting */}
                <div className="dh" style={{ borderRadius: "var(--r)", padding: "24px 20px" }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                        {getGreeting()}, <span style={{ color: "var(--gold)" }}>{driver?.name || "Driver"}.</span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 12 }}>
                        {en ? "Your active subsidies" : "Ang iyong mga aktibong subsidy"}
                    </div>
                    {driver?.verification_status === "unverified" && (
                        <div style={{ background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.4)", borderRadius: "var(--r-sm)", padding: "8px 12px", fontSize: 12, color: "#fff" }}>
                            {driver.license_url
                                ? `⏳ ${en ? `Verification is being reviewed. Expect results: ${getBusinessDaysStr()}.` : `Sinusuri ang verification. Asahan: ${getBusinessDaysStr()}.`}`
                                : `📸 ${en ? "Upload your Driver's License below to start verification." : "Mag-upload ng Driver's License para magsimula ng verification."}`
                            }
                        </div>
                    )}
                    {driver?.verification_status === "verified" && (
                        <div style={{ background: "rgba(45,122,79,0.2)", border: "1px solid rgba(45,122,79,0.4)", borderRadius: "var(--r-sm)", padding: "8px 12px", fontSize: 12, color: "#fff" }}>
                            ✅ {en ? "Account verified. Future applications will auto-fill." : "Na-verify ang account. Awtomatikong mapupunan ang mga susunod."}
                        </div>
                    )}
                    {driver?.verification_status === "rejected" && driver?.verification_notes && (
                        <div style={{ background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)", borderRadius: "var(--r-sm)", padding: "8px 12px", fontSize: 12, color: "#fff" }}>
                            <div>❌ {en ? `Verification rejected. Please correct: ${driver.verification_notes}` : `Tinanggihan. Pakitama: ${driver.verification_notes}`}</div>
                            <button onClick={() => onNav("editprofile")} style={{ marginTop: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                ✏️ {en ? "Edit My Information" : "I-edit ang Aking Impormasyon"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Right box — notifications */}
                <div className="dh" style={{ borderRadius: "var(--r)", padding: "16px 14px" }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        🔔 {en ? "Notifications" : "Mga Abiso"}
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 160 }}>
                        <NotifFeed en={en} apps={apps} appointment={appointment} driver={driver} openEvents={openEvents} onOpenModal={onOpenModal} compact={true} />
                    </div>
                </div>
            </div>

            <div className="pad">
                {/* ── Apply for Subsidy — TOP ── */}
                <div className="srow"><h2>{en ? "Apply for a Subsidy" : "Mag-apply ng Subsidy"}</h2></div>
                <div className="card" style={{ padding: "16px", textAlign: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 12 }}>
                        {en ? "Browse open payout events and submit your application." : "Tingnan ang mga bukas na payout event at mag-apply."}
                    </div>
                    <button className="btn gold" onClick={() => onNav("apply")}>{en ? "Browse Available Subsidies" : "Tingnan ang Available na Subsidy"}</button>
                </div>

                {/* ── My Subsidies ── */}
                <div className="spacer" />
                <div className="srow">
                    <h2>{en ? "My Subsidies" : "Ang Aking mga Subsidy"}</h2>
                    <button className="srow-btn" onClick={() => onNav("subsidies")}>{en ? "See all" : "Lahat"} →</button>
                </div>
                {apps.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: 16, color: "var(--slate)", fontSize: 13 }}>
                        {en ? "No applications yet." : "Wala pang aplikasyon."}
                    </div>
                ) : apps.slice(0, 2).map(a => (
                    <div className="card" key={a.id} style={{ cursor: "pointer" }} onClick={() => onNav("subsidies")}>
                        <div className="card-top">
                            <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
                            <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
                        </div>
                        <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
                        <div className="card-footer">
                            <Pill status={a.status} en={en} />
                            <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}

                {/* ── Help + Profile two-column row ── */}
                <div className="spacer" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center" }} onClick={() => onNav("helpcenter")}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--gold-dk)", marginBottom: 4 }}>{en ? "Need Help?" : "Kailangan ng Tulong?"}</div>
                        <div style={{ fontSize: 12, color: "var(--slate)" }}>{en ? "Concerns, grievances & FAQ" : "Mga alalahanin at tanong"}</div>
                        {concerns.filter(c => c.admin_reply && !c.driver_seen_reply).length > 0 && (
                            <div style={{ marginTop: 8, background: "var(--jade-bg)", color: "var(--jade)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                🔔 {concerns.filter(c => c.admin_reply && !c.driver_seen_reply).length} {en ? "new response(s)" : "bagong tugon"}
                            </div>
                        )}
                    </div>
                    <div className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center" }} onClick={() => onNav("editprofile")}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>👤</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>{en ? "My Profile" : "Aking Profile"}</div>
                        <div style={{ fontSize: 12, color: "var(--slate)" }}>{en ? "Edit your information" : "I-edit ang impormasyon"}</div>
                    </div>
                </div>

                {/* ── Document Upload (unverified/rejected only) ── */}
                {driver?.verification_status !== "verified" && (
                    <>
                        <div className="spacer" />
                        <div className="srow"><h2>{en ? "Verification Documents" : "Mga Dokumento para sa Verification"}</h2></div>
                        <DashUpload en={en} onUploadDocument={onUploadDocument} driver={driver} />
                    </>
                )}
            </div>
        </div>
    )
}

// ─── SUBSIDIES ────────────────────────────────────────────────────────────────
function Subsidies({ en, onNav, apps, appointment, driverId, showToast, refreshApps }) {
    const [grievanceId, setGrievanceId] = useState(null)
    const [grievanceForm, setGrievanceForm] = useState({ type: "", message: "" })

    async function submitGrievance(appId) {
        if (!grievanceForm.message) return
        await supabase.from("grievances").insert({
            driver_id: driverId,
            application_id: appId,
            concern_type: grievanceForm.type || "Other",
            message: grievanceForm.message,
        })
        setGrievanceId(null)
        setGrievanceForm({ type: "", message: "" })
        showToast(en ? "Grievance submitted." : "Naisumite ang reklamo.")
    }

    const [qr, setQr] = useState(false)
    const [showReschedule, setShowReschedule] = useState(false)
    const [loadingReschedule, setLoadingReschedule] = useState(false)
    const [rescheduleOptions, setRescheduleOptions] = useState([])
    const [selectedReschedule, setSelectedReschedule] = useState(null)
    const [submittingReschedule, setSubmittingReschedule] = useState(false)

    async function openReschedule(appt) {
        setShowReschedule(true)
        setLoadingReschedule(true)
        setSelectedReschedule(null)
        const { data } = await supabase
            .from("payout_events")
            .select("*")
            .eq("program_name", appt.payout_events?.program_name)
            .gte("event_date", new Date().toISOString().split("T")[0])
            .neq("id", appt.event_id)
            .order("event_date", { ascending: true })
        setRescheduleOptions(data || [])
        setLoadingReschedule(false)
    }

    async function confirmReschedule() {
        if (!selectedReschedule || !appointment) return
        setSubmittingReschedule(true)
        await supabase.from("appointments").update({
            event_id: selectedReschedule.id,
            assigned_date: selectedReschedule.event_date,
            time_slot: `${selectedReschedule.time_start} – ${selectedReschedule.time_end}`,
            venue: selectedReschedule.venue,
        }).eq("id", appointment.id)
        await supabase.from("applications").update({
            event_id: selectedReschedule.id,
        }).eq("driver_id", driverId).eq("event_id", appointment.event_id)
        setSubmittingReschedule(false)
        setShowReschedule(false)
        setSelectedReschedule(null)
        showToast(en ? "Appointment rescheduled successfully." : "Matagumpay na na-reschedule ang appointment.")
        await refreshApps()
    }

    return (
        <div>
            <div className="ph">
                <h1>{en ? "My Subsidies" : "Ang Aking mga Subsidy"}</h1>
                <p>{en ? "Status of all your applications and appointments" : "Katayuan ng lahat ng iyong mga aplikasyon at appointment"}</p>
            </div>
            <div className="pad">
                {appointment && (
                    <>
                        <div className="srow"><h2>{en ? "My Appointment" : "Ang Aking Appointment"}</h2></div>
                        <div className="appt-card">
                            <div className="appt-label">ACTIVE APPOINTMENT</div>
                            <div className="appt-prog">{appointment.payout_events?.program_name}</div>
                            <div className="appt-row"><span className="appt-ico">📅</span><div className="appt-txt">{appointment.assigned_date}<small>{appointment.time_slot}</small></div></div>
                            <div className="appt-row"><span className="appt-ico">📍</span><div className="appt-txt">{appointment.venue}<small>{en ? "Bring Driver's License + this reference" : "Dalhin ang Driver's License + reference na ito"}</small></div></div>
                            <div className="appt-ref">{en ? "Ref:" : "Ref:"} <strong>{appointment.reference_code}</strong></div>
                        </div>
                        {qr && (
                            <div className="card" style={{ textAlign: "center", padding: 16 }}>
                                <QRDisplay value={`UPLIFT|${appointment.reference_code}|${appointment.assigned_date}|${appointment.venue}`} />
                                <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 8 }}>
                                    {en ? "Show this QR code to the officer at the venue." : "Ipakita ang QR code na ito sa opisyal sa venue."}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                    {appointment.reference_code}
                                </div>
                            </div>
                        )}
                        <button className="btn gold" onClick={() => setQr(!qr)}>{qr ? (en ? "Hide QR Code" : "Itago ang QR") : (en ? "Show QR Code" : "Ipakita ang QR")}</button>
                        {!showReschedule ? (
                            <button className="btn outline" onClick={() => openReschedule(appointment)}>{en ? "Reschedule My Appointment" : "I-reschedule ang Appointment"}</button>
                        ) : (
                            <div className="card" style={{ marginTop: 4 }}>
                                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                                    🔄 {en ? "Choose a New Schedule" : "Pumili ng Bagong Iskedyul"}
                                </div>
                                {loadingReschedule ? (
                                    <div className="empty"><div>{en ? "Loading available dates..." : "Naglo-load ng mga available na petsa..."}</div></div>
                                ) : rescheduleOptions.length === 0 ? (
                                    <div style={{ fontSize: 12, color: "var(--slate)", padding: 8 }}>
                                        {en ? "No other open schedules available for this program. Please come during walk-in hours with your Driver's License." : "Walang ibang bukas na iskedyul para sa programang ito. Pumunta sa walk-in hours na may dala na Driver's License."}
                                    </div>
                                ) : (
                                    <>
                                        <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 10 }}>
                                            {en ? "Select a new date and venue:" : "Pumili ng bagong petsa at venue:"}
                                        </p>
                                        {rescheduleOptions.map(opt => (
                                            <div
                                                key={opt.id}
                                                onClick={() => setSelectedReschedule(opt)}
                                                style={{
                                                    border: selectedReschedule?.id === opt.id ? "2px solid var(--gold)" : "1px solid var(--border)",
                                                    borderRadius: "var(--r-sm)", padding: 10, marginBottom: 8, cursor: "pointer",
                                                    background: selectedReschedule?.id === opt.id ? "var(--amber-bg)" : "#fff"
                                                }}
                                            >
                                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>📅 {opt.event_date} · 🕐 {opt.time_start} – {opt.time_end}</div>
                                                <div style={{ fontSize: 11, color: "var(--slate)", marginTop: 2 }}>📍 {opt.venue}</div>
                                            </div>
                                        ))}
                                        <button className="btn gold" disabled={!selectedReschedule || submittingReschedule} onClick={confirmReschedule}>
                                            {submittingReschedule ? "..." : (en ? "Confirm New Schedule" : "Kumpirmahin ang Bagong Iskedyul")}
                                        </button>
                                    </>
                                )}
                                <button className="btn outline" style={{ marginTop: 8 }} onClick={() => { setShowReschedule(false); setSelectedReschedule(null) }}>
                                    {en ? "Cancel" : "Kanselahin"}
                                </button>
                            </div>
                        )}
                        <div className="spacer" />
                    </>
                )}
                <div className="srow"><h2>{en ? "My Applications" : "Aking mga Aplikasyon"}</h2></div>
                {apps.length === 0 ? (
                    <div className="empty">
                        <div className="empty-ico">📋</div>
                        <div>{en ? "No applications yet." : "Wala pang aplikasyon."}</div>
                        <button className="btn gold" style={{ marginTop: 12 }} onClick={() => onNav("apply")}>{en ? "Browse Available Subsidies" : "Tingnan ang Mga Available na Subsidy"}</button>
                    </div>
                ) : apps.map(a => (
                    <div key={a.id}>
                        <div className="card">
                            <div className="card-top">
                                <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
                                <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
                            </div>
                            <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
                            <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>
                                📍 {a.payout_events?.venue} · 📅 {a.payout_events?.event_date}
                            </div>
                            <div className="card-footer">
                                <Pill status={a.status} en={en} />
                                <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
                            </div>
                            {a.status === "pending" && (() => {
                                const applied = new Date(a.applied_at)
                                const start = applied.toLocaleDateString("en-PH", { month: "short", day: "numeric" })
                                const end = new Date(applied.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                                return (
                                    <div style={{ marginTop: 8, background: "var(--amber-bg)", border: "1px solid var(--amber)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 11, color: "var(--navy)", lineHeight: 1.5 }}>
                                        ⏳ {en ? `Under review. Expected: 5–7 business days (${start} – ${end})` : `Sinusuri. Inaasahang: 5–7 araw ng trabaho (${start} – ${end})`}
                                    </div>
                                )
                            })()}
                            {a.status === "approved" && !a.appointment && (
                                <div style={{ marginTop: 8, background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 11, color: "var(--navy)" }}>
                                    ✅ {en ? "Approved! Proceed to your assigned payout venue on your scheduled date." : "Naaprubahan! Pumunta sa iyong itinalagang venue sa iyong nakatakdang petsa."}
                                </div>
                            )}
                            {a.status === "rejected" && a.rejection_fields && (
                                <div style={{ marginTop: 8, background: "var(--brick-bg)", border: "1px solid var(--brick)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 11, color: "var(--navy)" }}>
                                    ❌ {en ? `Rejected. Please correct: ${a.rejection_fields}` : `Tinanggihan. Pakitama: ${a.rejection_fields}`}
                                </div>
                            )}
                            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                                <button className="btn sm navy-o" onClick={() => onNav("helpcenter", a.id)}>
                                    💬 {en ? "Need Help?" : "Kailangan ng Tulong?"}
                                </button>
                                {/*{a.status === "rejected" && (*/}
                                {/*    <button className="btn sm brick-o" onClick={() => setGrievanceId(grievanceId === a.id ? null : a.id)}>*/}
                                {/*        ⚑ {en ? "File a Grievance" : "Mag-file ng Reklamo"}*/}
                                {/*    </button>*/}
                                {/*)}*/}
                            </div>
                        </div>
                        {/*{grievanceId === a.id && (*/}
                        {/*    <div className="griev">*/}
                        {/*        <div className="griev-title">{en ? "File a Grievance" : "Mag-file ng Reklamo"}</div>*/}
                        {/*        <div className="griev-sub">{en ? "We will forward this to the agency." : "Ipapasa namin ito sa ahensya."}</div>*/}
                        {/*        <div className="fg">*/}
                        {/*            <label className="fl">{en ? "Type of concern" : "Uri ng alalahanin"}</label>*/}
                        {/*            <select className="fsel" value={grievanceForm.type} onChange={e => setGrievanceForm(p => ({ ...p, type: e.target.value }))}>*/}
                        {/*                <option value="">{en ? "Select..." : "Pumili..."}</option>*/}
                        {/*                <option value="Not on list">{en ? "Not on beneficiary list" : "Hindi nasa listahan"}</option>*/}
                        {/*                <option value="Wrong amount">{en ? "Wrong amount received" : "Mali ang natanggap na halaga"}</option>*/}
                        {/*                <option value="Wrong birthday">{en ? "Application error / wrong birthday" : "Error sa aplikasyon / mali ang birthday"}</option>*/}
                        {/*                <option value="No notification">{en ? "No notification received" : "Walang natanggap na abiso"}</option>*/}
                        {/*                <option value="Other">{en ? "Other" : "Iba pa"}</option>*/}
                        {/*            </select>*/}
                        {/*        </div>*/}
                        {/*        <div className="fg">*/}
                        {/*            <label className="fl">{en ? "Describe your concern" : "Ilarawan ang iyong alalahanin"}</label>*/}
                        {/*            <textarea className="fta" placeholder={en ? "What happened?" : "Ano ang nangyari?"} value={grievanceForm.message} onChange={e => setGrievanceForm(p => ({ ...p, message: e.target.value }))} />*/}
                        {/*        </div>*/}
                        {/*        <button className="btn navy" onClick={() => submitGrievance(a.id)}>{en ? "Submit" : "Isumite"}</button>*/}
                        {/*    </div>*/}
                        {/*)}*/}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── APPLY ────────────────────────────────────────────────────────────────────
function Apply({ en, driverId, driver, showToast, refreshApps }) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [existing, setExisting] = useState([])
    const [applyingTo, setApplyingTo] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [appForm, setAppForm] = useState(null)

    const isVerified = driver?.verification_status === "verified"

    useEffect(() => {
        async function load() {
            const { data: evts } = await supabase
                .from("payout_events")
                .select("*")
                .gte("event_date", new Date().toISOString().split("T")[0])
                .order("event_date", { ascending: true })
            const { data: apps } = await supabase
                .from("applications")
                .select("event_id")
                .eq("driver_id", driverId)
            const now = new Date()
            const stillOpen = (evts || []).filter(e => !e.application_deadline || new Date(e.application_deadline) > now)
            setEvents(stillOpen)
            setExisting((apps || []).map(a => a.event_id))
            setLoading(false)
        }
        load()
    }, [driverId])

    function openApplyForm(event) {
        const shouldAutoFill = driver?.verification_status === "verified"
        setAppForm({
            event,
            last_name: shouldAutoFill ? (driver?.last_name || "") : "",
            first_name: shouldAutoFill ? (driver?.first_name || "") : "",
            middle_name: shouldAutoFill ? (driver?.middle_name === "N/A" ? "" : (driver?.middle_name || "")) : "",
            extension_name: shouldAutoFill ? (driver?.extension_name === "N/A" ? "" : (driver?.extension_name || "")) : "",
            region: shouldAutoFill ? (driver?.region || "") : "",
            province: shouldAutoFill ? (driver?.province || "") : "",
            city: shouldAutoFill ? (driver?.city || "") : "",
            barangay: shouldAutoFill ? (driver?.barangay || "") : "",
            mobile: shouldAutoFill ? (driver?.mobile || "") : "",
            birth_month: shouldAutoFill ? (driver?.birth_month || "") : "",
            birth_day: shouldAutoFill ? (driver?.birth_day || "") : "",
            birth_year: shouldAutoFill ? (driver?.birth_year || "") : "",
            age: shouldAutoFill ? (driver?.age || "") : "",
            sex: shouldAutoFill ? (driver?.sex || "") : "",
            denomination: shouldAutoFill ? (driver?.denomination || "") : "",
            case_number: shouldAutoFill ? (driver?.case_number || "") : "",
            operator_name: shouldAutoFill ? (driver?.operator_name || "") : "",
            plate_number: shouldAutoFill ? (driver?.plate_number || "") : "",
            chassis_number: shouldAutoFill ? (driver?.chassis_number || "") : "",
            license_number: shouldAutoFill ? (driver?.license_number || "") : "",
            ewallet_number: shouldAutoFill ? (driver?.ewallet_number || "") : "",
            ewallet_type: shouldAutoFill ? (driver?.ewallet_type || "") : "",
        })
        setApplyingTo(event.id)
    }

    function setF(field, val) { setAppForm(p => ({ ...p, [field]: val })) }

    async function submitApplication(e) {
        e.preventDefault()
        if (appForm.event.application_deadline && new Date(appForm.event.application_deadline) < new Date()) {
            showToast(en ? "The application deadline for this subsidy has passed." : "Lumipas na ang deadline ng aplikasyon para sa subsidy na ito.")
            setApplyingTo(null)
            setAppForm(null)
            return
        }
        setSubmitting(true)
        const { error } = await supabase.from("applications").insert({
            driver_id: driverId,
            event_id: appForm.event.id,
            status: "pending",
            applied_at: new Date().toISOString(),
        })
        if (!error) {
            setExisting(prev => [...prev, appForm.event.id])
            setApplyingTo(null)
            setAppForm(null)
            refreshApps()
            showToast(en ? "Application submitted!" : "Naisumite ang aplikasyon!")
        } else {
            showToast(en ? "Something went wrong. Please try again." : "May nangyaring mali. Subukan muli.")
        }
        setSubmitting(false)
    }

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const days = Array.from({length:31}, (_,i) => String(i+1))
    const denominations = ["MPUJ","TPUJ","MUVE","TUVE","MPUB","PUB","Mini-Bus","School Transport","Taxi"]

    if (applyingTo && appForm) {
        return (
            <div>
                <div className="ph">
                    <h1>{en ? "Apply for Subsidy" : "Mag-apply ng Subsidy"}</h1>
                    <p>{appForm.event.program_name} · {appForm.event.program_amount}</p>
                </div>
                <div className="pad">
                    {isVerified ? (
                        <div className="alert jade">
                            ✅ {en ? "Your account is verified. Details have been pre-filled from your profile. You may still edit them before submitting." : "Na-verify ang iyong account. Pre-filled na ang mga detalye mula sa iyong profile. Maaari mo pa ring baguhin bago isumite."}
                        </div>
                    ) : (
                        <div className="alert amber">
                            ℹ️ {en ? "Your account is not yet verified, so this form starts blank. Once your account is verified, future applications will auto-fill from your profile." : "Hindi pa na-verify ang iyong account, kaya blangko ang form na ito. Kapag na-verify na, awtomatikong mapupunan ang mga susunod na aplikasyon."}
                        </div>
                    )}
                    <form onSubmit={submitApplication}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>{en ? "Personal Information" : "Personal na Impormasyon"}</div>
                        <div className="fg"><label className="fl">{en ? "Last Name *" : "Apelyido *"}</label><input className="fi" placeholder="e.g. Santos" value={appForm.last_name} onChange={e => setF("last_name", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "First Name *" : "Pangalan *"}</label><input className="fi" placeholder="e.g. Juan" value={appForm.first_name} onChange={e => setF("first_name", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Middle Name *" : "Gitnang Pangalan *"}</label><input className="fi" placeholder="e.g. Dela Cruz — N/A if none" value={appForm.middle_name} onChange={e => setF("middle_name", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Extension Name *" : "Extension Name *"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>N/A if not applicable</span></label><input className="fi" placeholder="e.g. Jr — N/A if none" value={appForm.extension_name} onChange={e => setF("extension_name", e.target.value)} /></div>
                        <div className="fg">
                            <label className="fl">{en ? "Sex *" : "Kasarian *"}</label>
                            <select className="fsel" value={appForm.sex} onChange={e => setF("sex", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                <option>Male</option><option>Female</option><option>Others</option>
                            </select>
                        </div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Date of Birth" : "Petsa ng Kapanganakan"}</div>
                        <div className="two-col">
                            <div className="fg"><label className="fl">{en ? "Month" : "Buwan"}</label>
                                <select className="fsel" value={appForm.birth_month} onChange={e => setF("birth_month", e.target.value)}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    {months.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="fg"><label className="fl">{en ? "Day" : "Araw"}</label>
                                <select className="fsel" value={appForm.birth_day} onChange={e => setF("birth_day", e.target.value)}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    {days.map(d => <option key={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="two-col">
                            <div className="fg"><label className="fl">{en ? "Year (YYYY)" : "Taon (YYYY)"}</label><input className="fi" placeholder="e.g. 1985" value={appForm.birth_year} onChange={e => setF("birth_year", e.target.value)} maxLength={4} /></div>
                            <div className="fg"><label className="fl">{en ? "Age" : "Edad"}</label><input className="fi" placeholder="e.g. 40" value={appForm.age} onChange={e => setF("age", e.target.value)} /></div>
                        </div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Address" : "Tirahan"}</div>
                        <div className="fg"><label className="fl">Region</label><input className="fi" placeholder="e.g. NCR" value={appForm.region} onChange={e => setF("region", e.target.value)} /></div>
                        <div className="fg"><label className="fl">Province</label><input className="fi" placeholder="e.g. Metro Manila" value={appForm.province} onChange={e => setF("province", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "City / Municipality" : "Lungsod / Munisipyo"}</label><input className="fi" placeholder="e.g. Quezon City" value={appForm.city} onChange={e => setF("city", e.target.value)} /></div>
                        <div className="fg"><label className="fl">Barangay</label><input className="fi" placeholder="e.g. Brgy. Poblacion" value={appForm.barangay} onChange={e => setF("barangay", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Contact Number *" : "Numero ng Kontak *"}</label><input className="fi" placeholder="09XX XXX XXXX" value={appForm.mobile} onChange={e => setF("mobile", e.target.value)} /></div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Vehicle and Franchise" : "Sasakyan at Pransisa"}</div>
                        <div className="fg">
                            <label className="fl">{en ? "Denomination *" : "Uri ng Sasakyan *"}</label>
                            <select className="fsel" value={appForm.denomination} onChange={e => setF("denomination", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {denominations.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="fg"><label className="fl">{en ? "Case Number *" : "Case Number *"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>e.g. 2020-XXXX</span></label><input className="fi" placeholder="2020-XXXX" value={appForm.case_number} onChange={e => setF("case_number", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Operator's Name *" : "Pangalan ng Operator *"}</label><input className="fi" placeholder={en ? "Transport entity or individual name" : "Pangalan ng transport entity o indibidwal"} value={appForm.operator_name} onChange={e => setF("operator_name", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Plate Number *" : "Plate Number *"}</label><input className="fi" placeholder="e.g. ABC 1234" value={appForm.plate_number} onChange={e => setF("plate_number", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Chassis Number *" : "Chassis Number *"}</label><input className="fi" placeholder="e.g. XXXXXXXXXX" value={appForm.chassis_number} onChange={e => setF("chassis_number", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "Driver's License No. *" : "Numero ng Driver's License *"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>N/A if not applicable</span></label><input className="fi" placeholder="C01-XX-XXXXXX" value={appForm.license_number} onChange={e => setF("license_number", e.target.value)} /></div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "E-wallet" : "E-wallet"}</div>
                        <div className="fg">
                            <label className="fl">{en ? "E-wallet Name *" : "Pangalan ng E-wallet *"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>{en ? "must be registered in driver's name" : "dapat nakalaan sa pangalan ng driver"}</span></label>
                            <select className="fsel" value={appForm.ewallet_type} onChange={e => setF("ewallet_type", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                <option>GCash</option><option>PayMaya</option>
                            </select>
                        </div>
                        <div className="fg"><label className="fl">{en ? "E-wallet Account Number *" : "Numero ng E-wallet Account *"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>e.g. 0996-XXX-XXXX</span></label><input className="fi" placeholder="0996-XXX-XXXX" value={appForm.ewallet_number} onChange={e => setF("ewallet_number", e.target.value)} /></div>

                        <button className="btn gold" type="submit" disabled={submitting}>{submitting ? "..." : (en ? "Submit Application" : "Isumite ang Aplikasyon")}</button>
                        <button type="button" className="btn outline" onClick={() => { setApplyingTo(null); setAppForm(null) }}>{en ? "Cancel" : "Kanselahin"}</button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="ph">
                <h1>{en ? "Available Subsidies" : "Mga Available na Subsidy"}</h1>
                <p>{en ? "Browse and apply for open payout events" : "Tingnan at mag-apply sa mga bukas na payout event"}</p>
            </div>
            <div className="pad" style={{ paddingBottom: 0 }}>
                <span className="link" onClick={() => onNav("dashboard")}>← {en ? "Back to Home" : "Bumalik sa Home"}</span>
            </div>
            <div className="pad">
                {loading ? (
                    <div className="empty"><div>{en ? "Loading..." : "Naglo-load..."}</div></div>
                ) : events.length === 0 ? (
                    <div className="empty">
                        <div className="empty-ico">📭</div>
                        <div>{en ? "No open payout events at the moment." : "Walang bukas na payout event sa ngayon."}</div>
                    </div>
                ) : events.map(event => {
                    const already = existing.includes(event.id)
                    return (
                        <div className="event-card" key={event.id}>
                            <div className="event-card-top">
                                <div className="event-name">{event.program_name}</div>
                                <div className="event-amount">{event.program_amount}</div>
                            </div>
                            <div className="event-agency">{event.program_agency}</div>
                            <div className="event-meta">📅 {en ? "Payout Date:" : "Petsa ng Payout:"} {event.event_date}</div>
                            <div className="event-meta">🕐 {event.time_start} – {event.time_end}</div>
                            <div className="event-meta">📍 {event.venue}</div>
                            {event.application_deadline && (
                                <div className="event-meta" style={{ color: "var(--brick)", fontWeight: 600 }}>
                                    ⚠️ {en ? "Apply before:" : "Mag-apply bago ang:"} {new Date(event.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                                </div>
                            )}
                            {event.description && (
                                <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--cream)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--slate)", lineHeight: 1.6 }}>
                                    📋 {event.description}
                                </div>
                            )}
                            {event.announcement_date && (
                                <div className="event-meta" style={{ color: "var(--amber)" }}>
                                    📢 {en ? "Final Announcement:" : "Huling Anunsyo:"} {event.announcement_date}
                                </div>
                            )}
                            <div className="event-footer">
                                <span></span>
                                {already ? (
                                    <span className="pill approved">{en ? "Applied" : "Nag-apply na"}</span>
                                ) : (
                                    <button
                                        className="btn sm navy-o"
                                        onClick={() => openApplyForm(event)}
                                    >
                                        {en ? "Apply" : "Mag-apply"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── APPOINTMENT ──────────────────────────────────────────────────────────────
function Appointment({ en, appointment }) {
    const [qr, setQr] = useState(false)
    const [rescheduled, setRescheduled] = useState(false)

    if (!appointment) {
        return (
            <div>
                <div className="ph"><h1>{en ? "My Schedule" : "Ang Aking Iskedyul"}</h1><p>{en ? "Your assigned payout slot" : "Ang iyong itinalagang slot ng payout"}</p></div>
                <div className="pad">
                    <div className="empty"><div className="empty-ico">📅</div><div>{en ? "No appointment yet. Apply for a subsidy to get a schedule." : "Wala pang appointment. Mag-apply ng subsidy para makakuha ng iskedyul."}</div></div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="ph"><h1>{en ? "My Schedule" : "Ang Aking Iskedyul"}</h1><p>{en ? "Your assigned payout slot" : "Ang iyong itinalagang slot ng payout"}</p></div>
            <div className="pad">
                <div className="appt-card">
                    <div className="appt-label">ACTIVE APPOINTMENT</div>
                    <div className="appt-prog">{appointment.payout_events?.program_name}</div>
                    <div className="appt-row"><span className="appt-ico">📅</span><div className="appt-txt">{appointment.assigned_date}<small>{appointment.time_slot}</small></div></div>
                    <div className="appt-row"><span className="appt-ico">📍</span><div className="appt-txt">{appointment.venue}<small>{en ? "Bring Driver's License + this reference" : "Dalhin ang Driver's License + reference na ito"}</small></div></div>
                    <div className="appt-ref">{en ? "Ref:" : "Ref:"} <strong>{appointment.reference_code}</strong></div>
                </div>
                {qr && (
                    <div className="qr-box">
                        <div className="qr-sq">▦</div>
                        <div className="qr-cap">{en ? "Show this to the officer at the venue." : "Ipakita ito sa opisyal sa venue."}</div>
                        <div className="qr-ref">{appointment.reference_code}</div>
                    </div>
                )}
                <button className="btn gold" onClick={() => setQr(!qr)}>{qr ? (en ? "Hide QR Code" : "Itago ang QR") : (en ? "Show QR Code" : "Ipakita ang QR")}</button>
                {!rescheduled ? (
                    <button className="btn outline" onClick={() => setRescheduled(true)}>{en ? "I cannot make this schedule" : "Hindi ako makakarating sa oras na ito"}</button>
                ) : (
                    <div className="alert amber"><strong>{en ? "Noted." : "Natanggap."}</strong><br />{en ? "Please come during walk-in hours. Bring your Driver's License." : "Pumunta sa walk-in hours. Dalhin ang Driver's License."}</div>
                )}
            </div>
        </div>
    )
}

// ─── NOTIFICATIONS (UPDATES ENGINE REAL-TIME COUPLING) ──────────────────────
function Notifications({ en, apps, appointment, driver, openEvents, onOpenModal }) {
    const notifs = []
    const now = new Date()
    const existingEventIds = apps.map(a => a.event_id)

    if (driver) {
        if (driver.verification_status === "verified") {
            notifs.push({
                type: "approved", time: en ? "Verification" : "Verification",
                msg_en: "✅ Your account has been verified. Future applications will auto-fill.",
                msg_fil: "✅ Na-verify na ang iyong account. Awtomatikong mapupunan ang mga susunod na aplikasyon.",
                modal: {
                    icon: "✅",
                    title: en ? "Account Verified!" : "Na-verify ang Account!",
                    body: en ? "Your identity has been verified. Future subsidy applications will auto-fill from your profile." : "Na-verify na ang iyong pagkakakilanlan. Awtomatikong mapupunan ang mga susunod na aplikasyon.",
                    closeLabel: en ? "Got it" : "Nakuha ko",
                }
            })
        } else if (driver.verification_status === "rejected") {
            notifs.push({
                type: "rejected", time: en ? "Verification" : "Verification",
                msg_en: `❌ Verification rejected. Please correct: ${driver.verification_notes || "flagged fields"}`,
                msg_fil: `❌ Tinanggihan ang verification. Pakitama: ${driver.verification_notes || "mga field"}`,
                modal: {
                    icon: "❌",
                    title: en ? "Verification Rejected" : "Tinanggihan ang Verification",
                    body: en ? `Please correct: ${driver.verification_notes}` : `Pakitama: ${driver.verification_notes}`,
                    action: "editprofile",
                    actionLabel: en ? "Edit My Information" : "I-edit ang Aking Impormasyon",
                    closeLabel: en ? "Later" : "Mamaya na",
                }
            })
        } else {
            notifs.push({
                type: "info", time: en ? "Verification" : "Verification",
                msg_en: "⏳ Verification is being reviewed. Expect results within 5–7 business days.",
                msg_fil: "⏳ Sinusuri ang verification. Asahan ang resulta sa loob ng 5–7 araw ng trabaho.",
                modal: null
            })
        }
    }

    ;(openEvents || []).forEach(ev => {
        if (existingEventIds.includes(ev.id)) return
        if (!ev.application_deadline || new Date(ev.application_deadline) < now) return
        const publishedRecently = (now - new Date(ev.created_at || now)) / (1000 * 60 * 60 * 24) <= 3
        if (publishedRecently) {
            notifs.unshift({
                type: "info", time: en ? "New" : "Bago",
                msg_en: `📢 New subsidy available: ${ev.program_name} (${ev.program_amount}). Apply before ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
                msg_fil: `📢 Bagong subsidy: ${ev.program_name} (${ev.program_amount}). Mag-apply bago ang ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
                modal: {
                    icon: "📢",
                    title: en ? "New Subsidy Available!" : "Bagong Subsidy!",
                    body: en
                        ? `${ev.program_name} (${ev.program_amount}) is now open. Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
                        : `Bukas na ang ${ev.program_name} (${ev.program_amount}). Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
                    action: { type: "apply", eventId: ev.id },
                    actionLabel: en ? "Apply Now" : "Mag-apply Na",
                    closeLabel: en ? "Maybe Later" : "Mamaya Na Lang",
                }
            })
        }
    })

    apps.forEach(a => {
        const deadline = a.payout_events?.application_deadline
        if (deadline) {
            const hoursLeft = (new Date(deadline) - now) / (1000 * 60 * 60)
            if (hoursLeft > 0 && hoursLeft <= 48) {
                notifs.unshift({
                    type: "rejected", time: hoursLeft <= 24 ? (en ? "Today" : "Ngayon") : (en ? "Tomorrow" : "Bukas"),
                    msg_en: `⚠️ Deadline for ${a.payout_events?.program_name}: ${new Date(deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
                    msg_fil: `⚠️ Deadline ng ${a.payout_events?.program_name}: ${new Date(deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
                    modal: null
                })
            }
        }
        if (a.status === "approved") {
            notifs.push({
                type: "approved", time: en ? "Recent" : "Kamakailan",
                msg_en: `🎉 ${a.payout_events?.program_name} approved! Claim at ${a.payout_events?.venue} on ${a.payout_events?.event_date}.`,
                msg_fil: `🎉 Naaprubahan ang ${a.payout_events?.program_name}! Kunin sa ${a.payout_events?.venue} sa ${a.payout_events?.event_date}.`,
                modal: {
                    icon: "🎉",
                    title: en ? "Application Approved!" : "Naaprubahan ang Aplikasyon!",
                    body: en
                        ? `Your application for ${a.payout_events?.program_name} was approved. Claim at ${a.payout_events?.venue} on ${a.payout_events?.event_date}.`
                        : `Naaprubahan ang ${a.payout_events?.program_name}. Kunin sa ${a.payout_events?.venue} sa ${a.payout_events?.event_date}.`,
                    action: "subsidies",
                    actionLabel: en ? "View Details" : "Tingnan ang Detalye",
                    closeLabel: en ? "Got it" : "Nakuha ko",
                }
            })
        } else if (a.status === "pending") {
            notifs.push({
                type: "info", time: en ? "Recent" : "Kamakailan",
                msg_en: `${a.payout_events?.program_name} application is pending review.`,
                msg_fil: `Ang aplikasyon sa ${a.payout_events?.program_name} ay naghihintay ng review.`,
                modal: null
            })
        } else if (a.status === "rejected" && a.rejection_fields) {
            notifs.push({
                type: "rejected", time: en ? "Recent" : "Kamakailan",
                msg_en: `❌ ${a.payout_events?.program_name} rejected. Reason: ${a.rejection_fields}`,
                msg_fil: `❌ Tinanggihan ang ${a.payout_events?.program_name}. Dahilan: ${a.rejection_fields}`,
                modal: {
                    icon: "❌",
                    title: en ? "Application Rejected" : "Tinanggihan ang Aplikasyon",
                    body: en
                        ? `Your application for ${a.payout_events?.program_name} was rejected. Reason: ${a.rejection_fields}.`
                        : `Tinanggihan ang ${a.payout_events?.program_name}. Dahilan: ${a.rejection_fields}.`,
                    action: "editprofile",
                    actionLabel: en ? "Edit My Information" : "I-edit ang Impormasyon",
                    action2: "subsidies",
                    action2Label: en ? "View Application" : "Tingnan ang Aplikasyon",
                    closeLabel: en ? "Later" : "Mamaya na",
                }
            })
        }
    })

    if (appointment) {
        notifs.push({
            type: "appointment", time: en ? "Recent" : "Kamakailan",
            msg_en: `📅 Appointment confirmed: ${appointment.assigned_date}, ${appointment.time_slot}, ${appointment.venue}.`,
            msg_fil: `📅 Nakumpirma ang appointment: ${appointment.assigned_date}, ${appointment.time_slot}, ${appointment.venue}.`,
            modal: {
                icon: "📅",
                title: en ? "Appointment Confirmed" : "Nakumpirma ang Appointment",
                body: en
                    ? `Your payout slot is on ${appointment.assigned_date} at ${appointment.time_slot}, ${appointment.venue}. Ref: ${appointment.reference_code}`
                    : `Ang iyong slot ay sa ${appointment.assigned_date} sa ${appointment.time_slot}, ${appointment.venue}. Ref: ${appointment.reference_code}`,
                action: "subsidies",
                actionLabel: en ? "View My Subsidies" : "Tingnan ang Mga Subsidy",
                closeLabel: en ? "Got it" : "Nakuha ko",
            }
        })
    }

    return (
        <div>
            <div className="ph"><h1>{en ? "Updates" : "Mga Update"}</h1><p>{en ? "Tap any item for details and actions" : "I-tap ang anumang item para sa detalye at aksyon"}</p></div>
            <div className="pad">
                {notifs.length === 0 ? (
                    <div className="empty"><div className="empty-ico">🔔</div><div>{en ? "No updates yet." : "Wala pang update."}</div></div>
                ) : notifs.map((n, i) => (
                    <div
                        className="notif"
                        key={i}
                        style={{ cursor: n.modal ? "pointer" : "default" }}
                        onClick={() => n.modal && onOpenModal && onOpenModal(n.modal)}
                    >
                        <div className={`ndot ${n.type}`} />
                        <div style={{ flex: 1 }}>
                            <div className="nmsg">{en ? n.msg_en : n.msg_fil}</div>
                            <div className="ntime">{n.time}{n.modal ? ` · ${en ? "tap for details" : "i-tap para sa detalye"}` : ""}</div>
                        </div>
                        {n.modal && <div style={{ color: "var(--gold-dk)", fontSize: 16, alignSelf: "center" }}>›</div>}
                    </div>
                ))}
            </div>
        </div>
    )
}

function ConcernThread({ concerns, en }) {
    if (!concerns || concerns.length === 0) return null
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 8 }}>
                💬 {en ? "Your previous messages on this topic:" : "Mga nakaraang mensahe mo sa paksang ito:"}
            </div>
            {concerns.map(c => (
                <div key={c.id} style={{ marginBottom: 10 }}>
                    <div style={{ background: "var(--cream)", borderRadius: "var(--r-sm)", padding: "10px 12px", fontSize: 13, color: "var(--navy)" }}>
                        <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 4 }}>
                            {c.is_draft || c.status === "draft"
                                ? <span style={{ color: "var(--amber)", fontWeight: 600 }}>📝 {en ? "Draft" : "Draft"}</span>
                                : <span style={{ color: "var(--slate)" }}>{en ? "You" : "Ikaw"} · {new Date(c.created_at).toLocaleDateString()}</span>
                            }
                        </div>
                        {c.message}
                    </div>
                    {c.admin_reply && (
                        <div style={{ background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: "10px 12px", fontSize: 13, color: "var(--navy)", marginTop: 4 }}>
                            <div style={{ fontSize: 11, color: "var(--jade)", fontWeight: 700, marginBottom: 4 }}>
                                🏛️ {en ? "Response from Agency" : "Tugon mula sa Ahensya"} · {c.replied_at ? new Date(c.replied_at).toLocaleDateString() : ""}
                            </div>
                            {c.admin_reply}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

function HelpCenter({ en, apps, driverId, showToast, onNav, preselectedAppId }) {
    const [selectedApp, setSelectedApp] = useState(
        preselectedAppId ? apps.find(a => a.id === preselectedAppId) : null
    )
    const [category, setCategory] = useState(null)
    const [subQuestion, setSubQuestion] = useState(null)
    const [showEscalate, setShowEscalate] = useState(false)
    const [escalateMessage, setEscalateMessage] = useState(sessionStorage.getItem("uplift_help_draft") || "")
    const [submitting, setSubmitting] = useState(false)
    const [concerns, setConcerns] = useState([])
    const [loadingConcerns, setLoadingConcerns] = useState(false)
    const [autoSaveTimer, setAutoSaveTimer] = useState(null)
    const [currentDraftId, setCurrentDraftId] = useState(null)

    function getBusinessDaysStr(fromDate) {
        const base = new Date(fromDate)
        const d5 = new Date(base); d5.setDate(d5.getDate() + 5)
        const d7 = new Date(base); d7.setDate(d7.getDate() + 7)
        const opts = { month: 'short', day: 'numeric' }
        return `${d5.toLocaleDateString('en-US', opts)} – ${d7.toLocaleDateString('en-US', opts)}`
    }

    const categories = [
        { key: "timing", label: en ? "When will I receive my subsidy?" : "Kailan ko matatanggap ang subsidy?" },
        { key: "change", label: en ? "I'd like to change something about my application" : "Gusto kong baguhin ang aking aplikasyon" },
        { key: "amount", label: en ? "I have a concern about the amount or eligibility" : "May alalahanin ako sa halaga o pagiging kwalipikado" },
        { key: "venue", label: en ? "Issue at the payout venue" : "Problema sa venue ng payout" },
        { key: "feedback", label: en ? "General feedback" : "Pangkalahatang puna" },
        ...(selectedApp?.status === "rejected" ? [{ key: "grievance", label: en ? "File a Grievance" : "Mag-file ng Reklamo" }] : []),
    ]

    const subQuestions = {
        change: [
            { key: "wrong_personal", label: en ? "Wrong personal information (name, birthdate, etc.)" : "Maling personal na impormasyon" },
            { key: "wrong_vehicle", label: en ? "Wrong vehicle or license details" : "Maling detalye ng sasakyan o lisensya" },
            { key: "wrong_contact", label: en ? "Wrong e-wallet or contact number" : "Maling e-wallet o numero ng kontak" },
            { key: "other_correction", label: en ? "Other correction" : "Ibang pagwawasto" },
        ],
        amount: [
            { key: "wrong_amount", label: en ? "I think the subsidy amount is incorrect" : "Mali ang halaga ng subsidy" },
            { key: "not_eligible", label: en ? "I was told I'm not eligible — why?" : "Sinabihan akong hindi kwalipikado — bakit?" },
        ],
        venue: [
            { key: "venue_closed", label: en ? "The venue was closed or moved" : "Sarado o lumipat ang venue" },
            { key: "long_line", label: en ? "Long lines or no slots left when I arrived" : "Mahabang pila o walang naiwan na slot" },
            { key: "rider_issue", label: en ? "Issue with the officer or process at the venue" : "Problema sa opisyal o proseso sa venue" },
        ],
        feedback: [
            { key: "suggestion", label: en ? "I have a suggestion" : "May mungkahi ako" },
            { key: "compliment", label: en ? "I'd like to give positive feedback" : "Gusto kong magbigay ng positibong puna" },
        ],
        grievance: [
            { key: "griev_wrong_info", label: en ? "My information was incorrectly flagged" : "Mali ang na-flag na impormasyon ko" },
            { key: "griev_unfair", label: en ? "I believe the rejection was unfair" : "Sa palagay ko ay hindi patas ang pagtanggi" },
            { key: "griev_missing_docs", label: en ? "My documents were not properly reviewed" : "Hindi maayos na nasuri ang aking mga dokumento" },
            { key: "griev_other", label: en ? "Other grievance" : "Ibang reklamo" },
        ],
    }

    async function submitEscalation() {
        if (!escalateMessage.trim()) return
        setSubmitting(true)
        await supabase.from("grievances").insert({
            driver_id: driverId,
            application_id: selectedApp?.id || null,
            concern_type: subQuestion?.label || category?.label || "General Inquiry",
            message: escalateMessage,
        })
        setSubmitting(false)
        setShowEscalate(false)
        setEscalateMessage("")
        showToast(en ? "Your concern has been sent to the agency." : "Naipadala na ang iyong alalahanin sa ahensya.")
        setCategory(null)
        setSubQuestion(null)
    }

    async function loadConcerns(appId, concernType) {
        setLoadingConcerns(true)
        const { data } = await supabase
            .from("grievances")
            .select("*")
            .eq("driver_id", driverId)
            .eq("application_id", appId)
            .eq("concern_type", concernType)
            .order("created_at", { ascending: true })
        setConcerns(data || [])
        setLoadingConcerns(false)
        if (data) {
            for (const c of data) {
                if (c.admin_reply && !c.driver_seen_reply) {
                    await supabase.from("grievances").update({ driver_seen_reply: true }).eq("id", c.id)
                }
            }
        }
    }

    function handleMessageChange(value) {
        setEscalateMessage(value)
        sessionStorage.setItem("uplift_help_draft", value)
        if (autoSaveTimer) clearTimeout(autoSaveTimer)
        const timer = setTimeout(async () => {
            if (!value.trim() || !selectedApp) return
            const concernType = subQuestion?.label || category?.label || "General Inquiry"
            if (currentDraftId) {
                await supabase.from("grievances").update({ draft_message: value, message: value }).eq("id", currentDraftId)
            } else {
                const { data } = await supabase.from("grievances").insert({
                    driver_id: driverId,
                    application_id: selectedApp.id,
                    concern_type: concernType,
                    message: value,
                    draft_message: value,
                    is_draft: true,
                    status: "draft",
                }).select().single()
                if (data) setCurrentDraftId(data.id)
            }
            await loadConcerns(selectedApp.id, concernType)
        }, 1500)
        setAutoSaveTimer(timer)
    }

    async function submitConcernFromHelp() {
        if (!escalateMessage.trim()) return
        setSubmitting(true)
        const concernType = subQuestion?.label || category?.label || "General Inquiry"
        if (currentDraftId) {
            await supabase.from("grievances").update({ message: escalateMessage, is_draft: false, status: "submitted" }).eq("id", currentDraftId)
        } else {
            await supabase.from("grievances").insert({
                driver_id: driverId,
                application_id: selectedApp?.id || null,
                concern_type: concernType,
                message: escalateMessage,
                is_draft: false,
                status: "submitted",
            })
        }
        setEscalateMessage("")
        setCurrentDraftId(null)
        sessionStorage.removeItem("uplift_help_draft")
        setSubmitting(false)
        showToast(en ? "Concern submitted." : "Naisumite ang alalahanin.")
        await loadConcerns(selectedApp?.id, concernType)
    }

    // ── Picking which application this is about ──
    if (!selectedApp) {
        return (
            <div>
                <div className="ph">
                    <h1>{en ? "Help Center" : "Help Center"}</h1>
                    <p>{en ? "Select a subsidy application to get help with" : "Pumili ng aplikasyon na nais mong tulungan"}</p>
                </div>
                <div className="pad">
                    <span className="link" onClick={() => onNav("dashboard")}>← {en ? "Back to Home" : "Bumalik sa Home"}</span>
                    <div className="spacer" />
                    {apps.length === 0 ? (
                        <div className="empty">
                            <div className="empty-ico">💬</div>
                            <div>{en ? "You have no applications yet." : "Wala ka pang aplikasyon."}</div>
                        </div>
                    ) : apps.map(a => (
                        <div className="card" key={a.id} style={{ cursor: "pointer" }} onClick={() => setSelectedApp(a)}>
                            <div className="card-top">
                                <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
                                <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
                            </div>
                            <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
                            <div className="card-footer">
                                <Pill status={a.status} en={en} />
                                <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Context header, like Foodpanda's order card ──
    const ContextHeader = () => (
        <div className="card" style={{ background: "var(--cream)" }}>
            <div className="card-top">
                <div className="card-name">{selectedApp.payout_events?.program_name}</div>
                <Pill status={selectedApp.status} en={en} />
            </div>
            <div className="card-agency">{selectedApp.payout_events?.program_agency}</div>
            <div style={{ fontSize: 11, color: "var(--slate)" }}>
                {en ? "Applied:" : "Inapply:"} {new Date(selectedApp.applied_at).toLocaleDateString()}
            </div>
        </div>
    )

    // ── Category list ──
    if (!category) {
        return (
            <div>
                <div className="ph">
                    <h1>{en ? "Help Center" : "Help Center"}</h1>
                    <p>{en ? "What do you need help with?" : "Saan ka kailangan ng tulong?"}</p>
                </div>
                <div className="pad">
                    <span className="link" onClick={() => setSelectedApp(null)}>← {en ? "Choose a different application" : "Pumili ng ibang aplikasyon"}</span>
                    <div className="spacer" />
                    <ContextHeader />
                    <div className="spacer" />
                    {categories.map(c => (
                        <div
                            key={c.key}
                            className="arow"
                            style={{
                                cursor: "pointer",
                                ...(c.key === "grievance" ? { borderLeft: "3px solid var(--brick)", background: "var(--brick-bg)" } : {})
                            }}
                            onClick={() => {
                                if (c.key === "timing") { setCategory(c); setSubQuestion({ key: "timing_answer", label: c.label }); loadConcerns(selectedApp.id, c.label) }
                                else { setCategory(c); if (c.key === "grievance") loadConcerns(selectedApp.id, c.label) }
                            }}
                        >
                            <div className="arow-name" style={{ color: c.key === "grievance" ? "var(--brick)" : undefined }}>
                                {c.key === "grievance" ? "⚑ " : ""}{c.label}
                            </div>
                            <div style={{ color: "var(--slate)" }}>›</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Timing answer: fully computed, no typing ──
    if (category.key === "timing") {
        const status = selectedApp.status
        const applied = new Date(selectedApp.applied_at)
        return (
            <div>
                <div className="ph">
                    <h1>{en ? "Subsidy Timing" : "Oras ng Subsidy"}</h1>
                    <p>{selectedApp.payout_events?.program_name}</p>
                </div>
                <div className="pad">
                    <span className="link" onClick={() => { setCategory(null); setSubQuestion(null); setEscalateMessage(""); sessionStorage.removeItem("uplift_help_draft") }}>← {en ? "Back" : "Bumalik"}</span>
                    <div className="spacer" />
                    <ContextHeader />
                    <div className="spacer" />
                    {status === "pending" && (
                        <div className="alert amber">
                            ⏳ {en
                            ? `Your application is still under review. Based on your submission date, expect a response between ${getBusinessDaysStr(applied)}.`
                            : `Nasa review pa ang iyong aplikasyon. Batay sa petsa ng pagsumite, asahan ang resulta sa pagitan ng ${getBusinessDaysStr(applied)}.`}
                        </div>
                    )}
                    {status === "approved" && (
                        <div className="alert jade">
                            ✅ {en
                            ? `Your application was approved! Claim your subsidy at ${selectedApp.payout_events?.venue} on ${selectedApp.payout_events?.event_date}, between ${selectedApp.payout_events?.time_start} and ${selectedApp.payout_events?.time_end}.`
                            : `Naaprubahan ang aplikasyon mo! Kunin ang subsidy sa ${selectedApp.payout_events?.venue} sa ${selectedApp.payout_events?.event_date}, sa pagitan ng ${selectedApp.payout_events?.time_start} at ${selectedApp.payout_events?.time_end}.`}
                        </div>
                    )}
                    {status === "rejected" && (
                        <div className="alert brick">
                            ❌ {en
                            ? `Your application was not approved. ${selectedApp.rejection_fields ? `Reason: ${selectedApp.rejection_fields}.` : ""} You will not receive this subsidy unless you correct and reapply.`
                            : `Hindi naaprubahan ang aplikasyon. ${selectedApp.rejection_fields ? `Dahilan: ${selectedApp.rejection_fields}.` : ""} Hindi ka makakatanggap maliban kung itatama at mag-aaplay ulit.`}
                        </div>
                    )}
                    <div className="spacer" />
                    <ConcernThread concerns={concerns} en={en} />
                    <div className="griev">
                        <div className="griev-title">{en ? "Send a message to the agency" : "Magpadala ng mensahe sa ahensya"}</div>
                        <div className="griev-sub">{en ? "Still need help? Describe your concern and we will forward it to the agency." : "Kailangan pa ng tulong? Ilarawan ang iyong alalahanin at ipapasa namin ito sa ahensya."}</div>
                        <textarea className="fta" placeholder={en ? "Describe your concern about timing..." : "Ilarawan ang iyong alalahanin..."} value={escalateMessage} onChange={e => handleMessageChange(e.target.value)} />
                        {escalateMessage.trim() && <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 6 }}>💾 {en ? "Auto-saving draft..." : "Awtomatikong nini-save..."}</div>}
                        <button className="btn navy" disabled={submitting} onClick={submitConcernFromHelp}>{submitting ? "..." : (en ? "Submit" : "Isumite")}</button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Sub-question list ──
    if (!subQuestion) {
        return (
            <div>
                <div className="ph">
                    <h1>{category.label}</h1>
                    <p>{selectedApp.payout_events?.program_name}</p>
                </div>
                <div className="pad">
                    <span className="link" onClick={() => setCategory(null)}>← {en ? "Back" : "Bumalik"}</span>
                    <div className="spacer" />
                    {(subQuestions[category.key] || []).map(sq => (
                        <div key={sq.key} className="arow" style={{ cursor: "pointer" }} onClick={() => { setSubQuestion(sq); loadConcerns(selectedApp.id, sq.label) }}>
                            <div className="arow-name">{sq.label}</div>
                            <div style={{ color: "var(--slate)" }}>›</div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Sub-question resolution ──
    const isProfileFix = ["wrong_personal", "wrong_vehicle", "wrong_contact"].includes(subQuestion.key)

    return (
        <div>
            <div className="ph">
                <h1>{subQuestion.label}</h1>
                <p>{selectedApp.payout_events?.program_name}</p>
            </div>
            <div className="pad">
                <span className="link" onClick={() => setSubQuestion(null)}>← {en ? "Back" : "Bumalik"}</span>
                <div className="spacer" />
                <ContextHeader />
                <div className="spacer" />

                {isProfileFix && (
                    <div className="alert jade">
                        ✏️ {en
                        ? "You can correct this directly from your profile. Go to Edit My Information, make the correction, and save."
                        : "Maaari mong itama ito direkta mula sa iyong profile. Pumunta sa Edit My Information, itama, at i-save."}
                    </div>
                )}
                {isProfileFix && (
                    <button className="btn gold" onClick={() => onNav("editprofile")}>{en ? "Go to Edit My Information" : "Pumunta sa Edit My Information"}</button>
                )}

                {!isProfileFix && (
                    <>
                        <ConcernThread concerns={concerns} en={en} />
                        <div className="griev">
                            <div className="griev-title">{en ? "Tell us more" : "Sabihin sa amin"}</div>
                            <div className="griev-sub">{en ? "We will forward this to the concerned agency." : "Ipapasa namin ito sa ahensya."}</div>
                            <textarea className="fta" placeholder={en ? "Describe your concern..." : "Ilarawan ang alalahanin..."} value={escalateMessage} onChange={e => handleMessageChange(e.target.value)} />
                            {escalateMessage.trim() && <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 6 }}>💾 {en ? "Auto-saving draft..." : "Awtomatikong nini-save..."}</div>}
                            <button className="btn navy" disabled={submitting} onClick={submitConcernFromHelp}>{submitting ? "..." : (en ? "Submit" : "Isumite")}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function EditProfile({ en, driverId, driver, showToast, onDone }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [noMiddle, setNoMiddle] = useState(driver.middle_name === "N/A")
    // const [newMobile, setNewMobile] = useState("")
    // const [showMobileUpdate, setShowMobileUpdate] = useState(false)
    // const [mobileOtp, setMobileOtp] = useState("")
    // const [mobileStep, setMobileStep] = useState(1)
    const [form, setForm] = useState({
        last_name: driver.last_name || "",
        first_name: driver.first_name || "",
        middle_name: driver.middle_name === "N/A" ? "" : (driver.middle_name || ""),
        extension_name: driver.extension_name === "N/A" ? "" : (driver.extension_name || ""),
        region: driver.region || "",
        province: driver.province || "",
        city: driver.city || "",
        barangay: driver.barangay || "",
        birth_month: driver.birth_month || "",
        birth_day: driver.birth_day || "",
        birth_year: driver.birth_year || "",
        sex: driver.sex || "",
        denomination: driver.denomination || "",
        case_number: driver.case_number || "",
        operator_name: driver.operator_name || "",
        plate_number: driver.plate_number || "",
        chassis_number: driver.chassis_number || "",
        license_number: driver.license_number || "",
        ewallet_type: driver.ewallet_type || "",
        ewallet_number: driver.ewallet_number || "",
    })

    function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const days = Array.from({length:31}, (_,i) => String(i+1))
    const denominations = ["MPUJ","TPUJ","MUVE","TUVE","MPUB","PUB","Mini-Bus","School Transport","Taxi"]

    async function handleSave(e) {
        e.preventDefault()
        setLoading(true)
        setError("")
        const full_name = [form.first_name, noMiddle ? "" : form.middle_name, form.last_name, (!form.extension_name || form.extension_name === "N/A") ? "" : form.extension_name].filter(Boolean).join(" ")
        const wasRejected = driver.verification_status === "rejected"
        const { error } = await supabase.from("drivers").update({
            full_name,
            last_name: form.last_name, first_name: form.first_name,
            middle_name: noMiddle ? "N/A" : form.middle_name,
            extension_name: form.extension_name || "N/A",
            region: form.region, province: form.province,
            city: form.city, barangay: form.barangay,
            birth_month: form.birth_month, birth_day: form.birth_day, birth_year: form.birth_year,
            sex: form.sex, denomination: form.denomination, case_number: form.case_number,
            operator_name: form.operator_name, plate_number: form.plate_number,
            chassis_number: form.chassis_number, license_number: form.license_number,
            ewallet_type: form.ewallet_type, ewallet_number: form.ewallet_number,
            ...(wasRejected ? { verification_status: "unverified", verification_notes: null } : {}),
        }).eq("id", driverId)
        setLoading(false)
        if (error) { setError(en ? "Something went wrong." : "May nangyaring mali."); return }
        showToast(wasRejected
            ? (en ? "Profile updated. Resubmitted for verification." : "Na-update ang profile. Naisumite ulit para sa verification.")
            : (en ? "Profile updated successfully." : "Matagumpay na na-update ang profile.")
        )
        onDone()
    }

    async function handleMobileUpdate(e) {
        e.preventDefault()
        if (mobileStep === 1) {
            setMobileStep(2)
            return
        }
        const { error } = await supabase.from("drivers").update({
            mobile: newMobile,
            philsys_number: newMobile,
        }).eq("id", driverId)
        if (!error) {
            showToast(en ? "Mobile number updated. Use new number to sign in next time." : "Na-update ang numero. Gamitin ang bagong numero sa susunod na pag-sign in.")
            setShowMobileUpdate(false)
            setNewMobile("")
            setMobileStep(1)
            onDone()
        }
    }

    return (
        <div>
            <div className="ph">
                <h1>{en ? "Edit My Information" : "I-edit ang Aking Impormasyon"}</h1>
                <p>{en ? "Update your details anytime. Changes will be saved immediately." : "I-update ang iyong mga detalye anumang oras."}</p>
            </div>
            <div className="pad">
                {driver.verification_status === "rejected" && driver.verification_notes && (
                    <div className="alert brick">
                        ❌ {en ? `Admin flagged these fields for correction: ${driver.verification_notes}` : `Mga field na kailangan itama: ${driver.verification_notes}`}
                    </div>
                )}
                {error && <div className="alert amber">{error}</div>}

                {/*<div className="card" style={{ padding: 14, marginBottom: 14 }}>*/}
                {/*    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>*/}
                {/*        📱 {en ? "Sign-In Mobile Number" : "Numero ng Telepono para sa Pag-sign In"}*/}
                {/*    </div>*/}
                {/*    <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>*/}
                {/*        {en ? "Current:" : "Kasalukuyan:"} <strong>{driver.mobile}</strong>*/}
                {/*    </div>*/}
                {/*    {!showMobileUpdate ? (*/}
                {/*        <button className="btn sm navy-o" onClick={() => setShowMobileUpdate(true)}>*/}
                {/*            {en ? "Change Sign-In Number" : "Palitan ang Numero"}*/}
                {/*        </button>*/}
                {/*    ) : (*/}
                {/*        <form onSubmit={handleMobileUpdate}>*/}
                {/*            {mobileStep === 1 ? (*/}
                {/*                <>*/}
                {/*                    <div className="fg">*/}
                {/*                        <label className="fl">{en ? "New Mobile Number" : "Bagong Numero ng Telepono"}</label>*/}
                {/*                        <input className="fi" placeholder="09XX XXX XXXX" value={newMobile} onChange={e => setNewMobile(e.target.value)} />*/}
                {/*                    </div>*/}
                {/*                    <div style={{ display: "flex", gap: 8 }}>*/}
                {/*                        <button className="btn sm gold" type="submit">{en ? "Send OTP" : "Magpadala ng OTP"}</button>*/}
                {/*                        <button className="btn sm outline" type="button" onClick={() => { setShowMobileUpdate(false); setMobileStep(1) }}>{en ? "Cancel" : "Kanselahin"}</button>*/}
                {/*                    </div>*/}
                {/*                </>*/}
                {/*            ) : (*/}
                {/*                <>*/}
                {/*                    <div className="alert amber">📱 {en ? `OTP sent to ${newMobile}` : `Napadala ang OTP sa ${newMobile}`}</div>*/}
                {/*                    <div className="fg">*/}
                {/*                        <label className="fl">OTP</label>*/}
                {/*                        <input className="fi" placeholder="_ _ _ _ _ _" value={mobileOtp} onChange={e => setMobileOtp(e.target.value)} style={{ fontSize: 22, letterSpacing: 8, textAlign: "center" }} />*/}
                {/*                    </div>*/}
                {/*                    <div style={{ display: "flex", gap: 8 }}>*/}
                {/*                        <button className="btn sm gold" type="submit">{en ? "Confirm" : "Kumpirmahin"}</button>*/}
                {/*                        <button className="btn sm outline" type="button" onClick={() => setMobileStep(1)}>{en ? "Back" : "Bumalik"}</button>*/}
                {/*                    </div>*/}
                {/*                </>*/}
                {/*            )}*/}
                {/*        </form>*/}
                {/*    )}*/}
                {/*</div>*/}

                <form onSubmit={handleSave}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>{en ? "Personal Information" : "Personal na Impormasyon"}</div>
                    <div className="fg"><label className="fl">{en ? "Last Name" : "Apelyido"}</label><input className="fi" placeholder="e.g. Santos" value={form.last_name} onChange={e => set("last_name", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "First Name" : "Pangalan"}</label><input className="fi" placeholder="e.g. Juan" value={form.first_name} onChange={e => set("first_name", e.target.value)} /></div>
                    <div className="fg">
                        <label className="fl">{en ? "Middle Name" : "Gitnang Pangalan"}</label>
                        <input className="fi" placeholder="e.g. Dela Cruz" value={noMiddle ? "" : form.middle_name} onChange={e => set("middle_name", e.target.value)} disabled={noMiddle} style={{ opacity: noMiddle ? 0.4 : 1 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                            <input type="checkbox" id="edit-nomiddle" checked={noMiddle} onChange={e => setNoMiddle(e.target.checked)} style={{ cursor: "pointer" }} />
                            <label htmlFor="edit-nomiddle" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>{en ? "I have no middle name" : "Wala akong gitnang pangalan"}</label>
                        </div>
                    </div>
                    <div className="fg"><label className="fl">{en ? "Extension Name" : "Extension Name"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>(Jr, Sr, III — {en ? "N/A if none" : "N/A kung wala"})</span></label><input className="fi" placeholder="N/A" value={form.extension_name} onChange={e => set("extension_name", e.target.value)} /></div>
                    <div className="fg">
                        <label className="fl">{en ? "Sex" : "Kasarian"}</label>
                        <select className="fsel" value={form.sex} onChange={e => set("sex", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            <option>Male</option><option>Female</option><option>Others</option>
                        </select>
                    </div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Date of Birth" : "Petsa ng Kapanganakan"}</div>
                    <div className="two-col">
                        <div className="fg"><label className="fl">{en ? "Month" : "Buwan"}</label>
                            <select className="fsel" value={form.birth_month} onChange={e => set("birth_month", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {months.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="fg"><label className="fl">{en ? "Day" : "Araw"}</label>
                            <select className="fsel" value={form.birth_day} onChange={e => set("birth_day", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {days.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="fg"><label className="fl">{en ? "Year (YYYY)" : "Taon (YYYY)"}</label><input className="fi" placeholder="e.g. 1985" value={form.birth_year} onChange={e => set("birth_year", e.target.value)} maxLength={4} /></div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Address" : "Tirahan"}</div>
                    <div className="fg"><label className="fl">Region</label><input className="fi" placeholder="e.g. NCR" value={form.region} onChange={e => set("region", e.target.value)} /></div>
                    <div className="fg"><label className="fl">Province</label><input className="fi" placeholder="e.g. Metro Manila" value={form.province} onChange={e => set("province", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "City / Municipality" : "Lungsod / Munisipyo"}</label><input className="fi" placeholder="e.g. Quezon City" value={form.city} onChange={e => set("city", e.target.value)} /></div>
                    <div className="fg"><label className="fl">Barangay</label><input className="fi" placeholder="e.g. Brgy. Poblacion" value={form.barangay} onChange={e => set("barangay", e.target.value)} /></div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Vehicle and Franchise" : "Sasakyan at Pransisa"}</div>
                    <div className="fg">
                        <label className="fl">{en ? "Denomination" : "Uri ng Sasakyan"}</label>
                        <select className="fsel" value={form.denomination} onChange={e => set("denomination", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            {denominations.map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="fg"><label className="fl">{en ? "Case Number" : "Case Number"}</label><input className="fi" placeholder="e.g. 2020-XXXX" value={form.case_number} onChange={e => set("case_number", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Operator's Name" : "Pangalan ng Operator"}</label><input className="fi" placeholder={en ? "Transport entity or individual name" : "Pangalan ng transport entity o indibidwal"} value={form.operator_name} onChange={e => set("operator_name", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Plate Number" : "Plate Number"}</label><input className="fi" placeholder="e.g. ABC 1234" value={form.plate_number} onChange={e => set("plate_number", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Chassis Number" : "Chassis Number"}</label><input className="fi" placeholder="e.g. XXXXXXXXXX" value={form.chassis_number} onChange={e => set("chassis_number", e.target.value)} /></div>
                    <div className="fg"><label className="fl">{en ? "Driver's License Number" : "Numero ng Driver's License"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>N/A if not applicable</span></label><input className="fi" placeholder="C01-XX-XXXXXX" value={form.license_number} onChange={e => set("license_number", e.target.value)} /></div>

                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "E-wallet" : "E-wallet"}</div>
                    <div className="fg">
                        <label className="fl">{en ? "E-wallet Type" : "Uri ng E-wallet"} <span style={{ fontWeight: 400, color: "var(--slate)" }}>{en ? "must be registered in driver's name" : "dapat nakalaan sa pangalan ng driver"}</span></label>
                        <select className="fsel" value={form.ewallet_type} onChange={e => set("ewallet_type", e.target.value)}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            <option>GCash</option><option>PayMaya</option>
                        </select>
                    </div>
                    <div className="fg"><label className="fl">{en ? "E-wallet Number" : "Numero ng E-wallet"}</label><input className="fi" placeholder="e.g. 0996-XXX-XXXX" value={form.ewallet_number} onChange={e => set("ewallet_number", e.target.value)} /></div>

                    <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Save Changes" : "I-save ang mga Pagbabago")}</button>
                    <button type="button" className="btn outline" onClick={onDone}>{en ? "Cancel" : "Kanselahin"}</button>
                </form>
            </div>
        </div>
    )

    function AdminReplyInline({ grievance, en, showToast, onDone }) {
        const [open, setOpen] = useState(false)
        const [reply, setReply] = useState(grievance.admin_reply || "")
        const [saving, setSaving] = useState(false)

        async function sendReply() {
            if (!reply.trim()) return
            setSaving(true)
            await supabase.from("grievances").update({
                admin_reply: reply,
                replied_at: new Date().toISOString(),
                driver_seen_reply: false,
                status: "replied",
            }).eq("id", grievance.id)
            setSaving(false)
            setOpen(false)
            showToast(en ? "Reply sent." : "Naipadala ang tugon.")
            onDone()
        }

        return open ? (
            <div style={{ width: "100%" }}>
            <textarea
                className="fta"
                style={{ minHeight: 60, fontSize: 12, marginBottom: 6 }}
                placeholder={en ? "Type your reply..." : "I-type ang iyong tugon..."}
                value={reply}
                onChange={e => setReply(e.target.value)}
            />
                <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn sm jade" onClick={sendReply} disabled={saving}>{saving ? "..." : (en ? "Send Reply" : "Ipadala")}</button>
                    <button className="btn sm outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "Kanselahin"}</button>
                </div>
            </div>
        ) : (
            <button className="btn sm navy-o" onClick={() => setOpen(true)}>
                ✉️ {grievance.admin_reply ? (en ? "Edit Reply" : "I-edit ang Tugon") : (en ? "Reply" : "Tumugon")}
            </button>
        )
    }
}
// ─── ADMIN PANEL (SPLIT-SCREEN VALIDATION MODULE ATTACHED) ───────────────────
function AdminPanel({ en, showToast }) {
    const [section, setSection] = useState("verify")
    const [events, setEvents] = useState([])
    const [pendingApps, setPendingApps] = useState([])
    const [unverifiedDrivers, setUnverifiedDrivers] = useState([])
    const [grievances, setGrievances] = useState([])
    const [expandedGroup, setExpandedGroup] = useState(null)
    const [editingEvent, setEditingEvent] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [savingEdit, setSavingEdit] = useState(false)
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [kpi, setKpi] = useState({ drivers: 0, apps: 0, approved: 0, events: 0 })
    const [eventForm, setEventForm] = useState({ program_name: "", program_agency: "", program_amount: "", venue: "", event_date: "", time_start: "", time_end: "", application_deadline: "", announcement_date: "", description: "" })
    const [saving, setSaving] = useState(false)
    const [rejectingId, setRejectingId] = useState(null)
    const [rejectFields, setRejectFields] = useState([])
    const [rejectNotes, setRejectNotes] = useState("")
    const [verifyRejectingId, setVerifyRejectingId] = useState(null)
    const [verifyRejectFields, setVerifyRejectFields] = useState([])
    const [verifyNotes, setVerifyNotes] = useState("")

    const rejectionOptions = ["Last Name","First Name","Middle Name","Extension Name","Sex","Date of Birth","Region","Province","City/Municipality","Barangay","Mobile Number","Denomination","Case Number","Operator's Name","Plate Number","Chassis Number","Driver's License No.","E-wallet Type","E-wallet Number"]
    useEffect(() => { loadAll() }, [])

    async function loadAll() {
        const [{ data: evts }, { data: apps }, { data: drivers }, { data: approved }, { data: unverified }, { data: griev }] = await Promise.all([
            supabase.from("payout_events").select("*").order("event_date", { ascending: false }),
            supabase.from("applications").select("*, drivers(full_name, license_number), payout_events(program_name, program_agency, venue, event_date, time_start, time_end)").eq("status", "pending"),
            supabase.from("drivers").select("id"),
            supabase.from("applications").select("id").eq("status", "approved"),
            supabase.from("drivers").select("*").eq("verification_status", "unverified"),
            supabase.from("grievances").select("*, drivers(full_name, mobile), applications(payout_events(program_name, program_agency))").order("created_at", { ascending: false }),
        ])
        setEvents(evts || [])
        setPendingApps(apps || [])
        setUnverifiedDrivers(unverified || [])
        setGrievances(griev || [])
        setKpi({ drivers: drivers?.length || 0, apps: apps?.length || 0, approved: approved?.length || 0, events: evts?.length || 0 })
        if (unverified && unverified.length > 0) setSelectedDriver(unverified[0])
    }

    function updateForm(field, val) { setEventForm(p => ({ ...p, [field]: val })) }

    async function publishEvent(e) {
        e.preventDefault()
        if (!eventForm.program_name || !eventForm.venue || !eventForm.event_date || !eventForm.application_deadline) {
            showToast(en ? "Please fill in all required fields, including the application deadline." : "Punan ang lahat ng required na fields, kasama ang deadline ng aplikasyon.")
            return
        }
        setSaving(true)
        const { error } = await supabase.from("payout_events").insert({
            program_name: eventForm.program_name, program_agency: eventForm.program_agency,
            program_amount: eventForm.program_amount, venue: eventForm.venue, event_date: eventForm.event_date,
            time_start: eventForm.time_start || "08:00:00", time_end: eventForm.time_end || "17:00:00",
            application_deadline: eventForm.application_deadline,
            description: eventForm.description || null,
        })
        setSaving(false)
        if (!error) {
            setEventForm({ program_name: "", program_agency: "", program_amount: "", venue: "", event_date: "", time_start: "", time_end: "", application_deadline: "", announcement_date: "", description: "" })
            showToast(en ? "Event published!" : "Na-publish ang event!")
            loadAll()
            setSection("events")
        }
    }

    async function approveApp(app) {
        const refCode = `REF-${Date.now().toString().slice(-8)}`
        await supabase.from("applications").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", app.id)
        await supabase.from("appointments").insert({
            application_id: app.id, driver_id: app.driver_id, event_id: app.event_id, reference_code: refCode,
            assigned_date: app.payout_events?.event_date || new Date().toISOString().split("T")[0],
            time_slot: `${app.payout_events?.time_start || "08:00"} – ${app.payout_events?.time_end || "17:00"}`,
            venue: app.payout_events?.venue || "", status: "confirmed",
        })
        showToast(en ? "Approved. Appointment created." : "Naaprubahan. Nagawa ang appointment.")
        loadAll()
    }

    async function confirmReject(app) {
        const fields = rejectFields.join(", ")
        const combined = rejectNotes.trim() ? `${fields}${fields ? " — " : ""}${rejectNotes.trim()}` : fields
        await supabase.from("applications").update({ status: "rejected", rejection_fields: combined, updated_at: new Date().toISOString() }).eq("id", app.id)
        setRejectingId(null); setRejectFields([]); setRejectNotes("")
        showToast(en ? "Application rejected." : "Tinanggihan ang aplikasyon.")
        loadAll()
    }

    async function verifyDriver(id, notes) {
        await supabase.from("drivers").update({
            verification_status: "verified",
            verification_notes: notes?.trim() || null
        }).eq("id", id)
        setVerifyNotes("")
        showToast(en ? "Account verified successfully." : "Na-verify ang account.")
        setSelectedDriver(null); loadAll()
    }

    async function rejectDriver(driverRow) {
        if (verifyRejectFields.length === 0) {
            showToast(en ? "Please select at least one incorrect field." : "Pumili ng kahit isang maling field.")
            return
        }
        const fields = verifyRejectFields.join(", ")
        const combined = verifyNotes.trim() ? `${fields} — ${verifyNotes.trim()}` : fields
        await supabase.from("drivers").update({ verification_status: "rejected", verification_notes: combined }).eq("id", driverRow.id)
        showToast(en ? "Account rejected." : "Tinanggihan ang account.")
        setVerifyRejectFields([]); setVerifyNotes(""); setSelectedDriver(null); loadAll()
    }

    async function resolveGrievance(id) {
        await supabase.from("grievances").update({ status: "resolved" }).eq("id", id)
        showToast(en ? "Marked as resolved." : "Naitala bilang nalutas.")
        loadAll()
    }

    async function saveEdit(e) {
        e.preventDefault()
        setSavingEdit(true)
        const { error } = await supabase.from("payout_events").update({
            program_name: editForm.program_name,
            program_agency: editForm.program_agency,
            program_amount: editForm.program_amount,
            venue: editForm.venue,
            event_date: editForm.event_date,
            time_start: editForm.time_start,
            time_end: editForm.time_end,
            application_deadline: editForm.application_deadline,
            description: editForm.description || null,
        }).eq("id", editingEvent.id)
        setSavingEdit(false)
        if (!error) {
            showToast(en ? "Event updated." : "Na-update ang event.")
            setEditingEvent(null)
            setEditForm({})
            loadAll()
        } else {
            showToast(en ? "Something went wrong." : "May nangyaring mali.")
        }
    }

    async function downloadExcel(ev) {
        const { data } = await supabase
            .from("applications")
            .select("*, drivers(full_name, last_name, first_name, middle_name, mobile, license_number, plate_number, denomination, operator_name, ewallet_type, ewallet_number)")
            .eq("event_id", ev.id)
        if (!data || data.length === 0) { showToast(en ? "No applicants yet." : "Wala pang nag-apply."); return }
        const headers = ["Full Name","Last Name","First Name","Middle Name","Mobile","License No","Plate No","Denomination","Operator","E-wallet Type","E-wallet No","Status","Applied At"]
        const rows = data.map(a => [
            a.drivers?.full_name || "",
            a.drivers?.last_name || "",
            a.drivers?.first_name || "",
            a.drivers?.middle_name || "",
            a.drivers?.mobile || "",
            a.drivers?.license_number || "",
            a.drivers?.plate_number || "",
            a.drivers?.denomination || "",
            a.drivers?.operator_name || "",
            a.drivers?.ewallet_type || "",
            a.drivers?.ewallet_number || "",
            a.status || "",
            new Date(a.applied_at).toLocaleDateString(),
        ])
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${ev.program_name}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    const tiles = [
        { ico: "📅", lbl: en ? "Create Event" : "Gumawa ng Event", key: "create" },
        { ico: "🗂️", lbl: en ? "All Events" : "Lahat ng Events", key: "events" },
        { ico: "📋", lbl: en ? "Applications" : "Mga Aplikasyon", key: "apps" },
        { ico: "🪪", lbl: en ? "Verify Accounts" : "I-verify ang mga Account", key: "verify" },
        { ico: "💬", lbl: en ? "Help Requests" : "Mga Hiling ng Tulong", key: "grievances" },
        { ico: "📊", lbl: en ? "Reports" : "Mga Ulat", key: "reports" },
    ]

    return (
        <div>
            <div className="ph"><h1>Admin Panel Desk</h1><p>UPLIFT Subsidy Core Suite</p></div>
            <div className="pad">
                <div className="admin-grid">
                    {tiles.map(t => (
                        <div key={t.key} className={`atile ${section === t.key ? "active-tile" : ""}`} onClick={() => setSection(t.key)}>
                            <div className="atile-ico">{t.ico}</div>
                            <div className="atile-lbl">{t.lbl}</div>
                        </div>
                    ))}
                </div>

                {section === "create" && (
                    <div className="asec">
                        <div className="asec-title">📅 {en ? "Create New Payout Event" : "Gumawa ng Bagong Payout Event"}</div>
                        <form onSubmit={publishEvent}>
                            <div className="fg">
                                <label className="fl">{en ? "Program Name *" : "Pangalan ng Programa *"}</label>
                                <input className="fi" value={eventForm.program_name} onChange={e => updateForm("program_name", e.target.value)} />
                            </div>
                            <div className="two-col">
                                <div className="fg"><label className="fl">Agency</label><input className="fi" value={eventForm.program_agency} onChange={e => updateForm("program_agency", e.target.value)} /></div>
                                <div className="fg"><label className="fl">Amount</label><input className="fi" value={eventForm.program_amount} onChange={e => updateForm("program_amount", e.target.value)} /></div>
                            </div>
                            <div className="fg"><label className="fl">Venue *</label><input className="fi" value={eventForm.venue} onChange={e => updateForm("venue", e.target.value)} /></div>
                            <div className="two-col">
                                <div className="fg"><label className="fl">{en ? "Payout Date *" : "Petsa ng Payout *"}</label><input className="fi" type="date" value={eventForm.event_date} onChange={e => updateForm("event_date", e.target.value)} /></div>
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Application Deadline (Date and Time) *" : "Deadline ng Aplikasyon (Petsa at Oras) *"}</label>
                                <input className="fi" type="datetime-local" value={eventForm.application_deadline} onChange={e => updateForm("application_deadline", e.target.value)} />
                                <div className="fh">{en ? "Drivers can no longer apply for this subsidy after this date and time." : "Hindi na makakapag-apply ang mga driver pagkatapos ng petsa at oras na ito."}</div>
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Description / Instructions for Drivers" : "Paglalarawan / Mga Tagubilin para sa mga Driver"}</label>
                                <textarea className="fta" placeholder={en ? "e.g. Bring original Driver's License and OR/CR. Wear proper attire." : "hal. Magdala ng orihinal na Driver's License at OR/CR. Magsuot ng tamang damit."} value={eventForm.description} onChange={e => updateForm("description", e.target.value)} style={{ minHeight: 80 }} />
                                <div className="fh">{en ? "This will be shown to drivers when they view or apply for this subsidy." : "Makikita ito ng mga driver kapag tiningnan o nag-apply sa subsidy na ito."}</div>
                            </div>
                            <button className="btn gold" type="submit" disabled={saving}>{saving ? "..." : "Publish Event"}</button>
                        </form>
                    </div>
                )}

                {section === "events" && (
                    <div className="asec">
                        <div className="asec-title">🗂️ All Events</div>
                        {events.length === 0 ? (
                            <div className="empty"><div>{en ? "No events yet." : "Wala pang event."}</div></div>
                        ) : events.map(ev => (
                            <div key={ev.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="arow-name">{ev.program_name}</div>
                                        <div className="arow-detail">{ev.program_agency} · ₱{ev.program_amount}</div>
                                        <div className="arow-detail">📅 {ev.event_date} · 📍 {ev.venue}</div>
                                        <div className="arow-detail">🕐 {ev.time_start} – {ev.time_end}</div>
                                        {ev.application_deadline && (
                                            <div className="arow-detail" style={{ color: "var(--brick)" }}>
                                                ⚠️ {en ? "Deadline:" : "Deadline:"} {new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                            </div>
                                        )}
                                        {ev.description && (
                                            <div className="arow-detail" style={{ fontStyle: "italic", color: "var(--slate)" }}>📋 {ev.description}</div>
                                        )}

                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 10, flexShrink: 0 }}>
                                        <button className="btn sm navy-o" onClick={() => downloadExcel(ev)}>⬇ {en ? "Export" : "I-export"}</button>
                                        <button className="btn sm outline" onClick={() => { setEditingEvent(ev); setEditForm({ ...ev }) }}>✏️ {en ? "Edit" : "I-edit"}</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {editingEvent && (
                            <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
                                <div className="modal-card" style={{ maxWidth: 500, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                                    <div className="modal-title">✏️ {en ? "Edit Event" : "I-edit ang Event"}</div>
                                    <form onSubmit={saveEdit}>
                                        <div className="fg"><label className="fl">{en ? "Program Name" : "Pangalan ng Program"}</label><input className="fi" value={editForm.program_name || ""} onChange={e => setEditForm(p => ({ ...p, program_name: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Agency" : "Ahensya"}</label><input className="fi" value={editForm.program_agency || ""} onChange={e => setEditForm(p => ({ ...p, program_agency: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Amount" : "Halaga"}</label><input className="fi" value={editForm.program_amount || ""} onChange={e => setEditForm(p => ({ ...p, program_amount: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Venue" : "Venue"}</label><input className="fi" value={editForm.venue || ""} onChange={e => setEditForm(p => ({ ...p, venue: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Payout Date" : "Petsa ng Payout"}</label><input className="fi" type="date" value={editForm.event_date || ""} onChange={e => setEditForm(p => ({ ...p, event_date: e.target.value }))} /></div>
                                        <div className="two-col">
                                            <div className="fg"><label className="fl">{en ? "Time Start" : "Oras ng Simula"}</label><input className="fi" type="time" value={editForm.time_start || ""} onChange={e => setEditForm(p => ({ ...p, time_start: e.target.value }))} /></div>
                                            <div className="fg"><label className="fl">{en ? "Time End" : "Oras ng Katapusan"}</label><input className="fi" type="time" value={editForm.time_end || ""} onChange={e => setEditForm(p => ({ ...p, time_end: e.target.value }))} /></div>
                                        </div>
                                        <div className="fg"><label className="fl">{en ? "Application Deadline" : "Deadline ng Aplikasyon"}</label><input className="fi" type="datetime-local" value={editForm.application_deadline ? editForm.application_deadline.slice(0, 16) : ""} onChange={e => setEditForm(p => ({ ...p, application_deadline: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Description / Instructions" : "Paglalarawan / Mga Tagubilin"}</label><textarea className="fta" value={editForm.description || ""} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} style={{ minHeight: 80 }} /></div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                            <button className="btn gold" type="submit" disabled={savingEdit}>{savingEdit ? "..." : (en ? "Save Changes" : "I-save ang mga Pagbabago")}</button>
                                            <button className="btn outline" type="button" onClick={() => { setEditingEvent(null); setEditForm({}) }}>{en ? "Cancel" : "Kanselahin"}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {section === "apps" && (
                    <div className="asec">
                        <div className="asec-title">📋 Pending Applications</div>
                        {pendingApps.map(a => (
                            <div key={a.id} style={{ paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                                <div className="arow" style={{ cursor: "default", border:"none", padding: 0 }}>
                                    <div>
                                        <div className="arow-name">{a.drivers?.full_name}</div>
                                        <div className="arow-detail">{a.payout_events?.program_name}</div>
                                    </div>
                                    <div className="btn-row">
                                        <button className="btn sm jade" onClick={() => approveApp(a)}>✓</button>
                                        <button className="btn sm brick-o" onClick={() => setRejectingId(a.id)}>✕</button>
                                    </div>
                                </div>
                                {rejectingId === a.id && (
                                    <div style={{ marginTop: 8, background: "var(--brick-bg)", padding: 8, borderRadius: 8 }}>
                                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:8 }}>
                                            {rejectionOptions.map(o => (
                                                <label key={o} style={{ fontSize:11, display:"flex", gap:4 }}><input type="checkbox" onChange={e => setRejectFields(p => e.target.checked ? [...p, o] : p.filter(x=>x!==o))} />{o}</label>
                                            ))}
                                        </div>
                                        <div className="fg" style={{ marginBottom: 8 }}>
                                            <label className="fl" style={{ fontSize: 11 }}>{en ? "Additional notes for driver (optional)" : "Karagdagang tala para sa driver (opsyonal)"}</label>
                                            <textarea className="fta" style={{ minHeight: 60, fontSize: 12 }} placeholder={en ? "Add specific notes..." : "Magdagdag ng tala..."} value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} />
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn sm gold" onClick={() => confirmReject(a)}>{en ? "Confirm Reject" : "Kumpirmahin"}</button>
                                            <button className="btn sm outline" onClick={() => { setRejectingId(null); setRejectFields([]); setRejectNotes("") }}>{en ? "Cancel" : "Kanselahin"}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {section === "verify" && (
                    <div className="split-view">
                        <div className="panel-scroller">
                            <h3>Queue Review Rows</h3>
                            {unverifiedDrivers.map(d => (
                                <div key={d.id} className={`arow ${selectedDriver?.id === d.id ? "selected-item" : ""}`} onClick={() => setSelectedDriver(d)}>
                                    <div>
                                        <div className="arow-name">{d.full_name}</div>
                                        <div className="arow-detail">License: {d.license_number}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3>Split Evaluation Console</h3>
                            {selectedDriver ? (
                                <div className="comparison-container">
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>📋 Declared Registration Metadata</div>
                                        <table className="data-specs-table">
                                            <tbody>
                                            <tr><td className="lbl-header">Last Name</td><td className="val-content">{selectedDriver.last_name}</td></tr>
                                            <tr><td className="lbl-header">First Name</td><td className="val-content">{selectedDriver.first_name}</td></tr>
                                            <tr><td className="lbl-header">Middle Name</td><td className="val-content">{selectedDriver.middle_name}</td></tr>
                                            <tr><td className="lbl-header">Extension Name</td><td className="val-content">{selectedDriver.extension_name}</td></tr>
                                            <tr><td className="lbl-header">Sex</td><td className="val-content">{selectedDriver.sex}</td></tr>
                                            <tr><td className="lbl-header">Date of Birth</td><td className="val-content">{selectedDriver.birth_month} {selectedDriver.birth_day}, {selectedDriver.birth_year} (Age: {selectedDriver.age})</td></tr>
                                            <tr><td className="lbl-header">Region</td><td className="val-content">{selectedDriver.region}</td></tr>
                                            <tr><td className="lbl-header">Province</td><td className="val-content">{selectedDriver.province}</td></tr>
                                            <tr><td className="lbl-header">City / Municipality</td><td className="val-content">{selectedDriver.city}</td></tr>
                                            <tr><td className="lbl-header">Barangay</td><td className="val-content">{selectedDriver.barangay}</td></tr>
                                            <tr><td className="lbl-header">Mobile</td><td className="val-content">{selectedDriver.mobile}</td></tr>
                                            <tr><td className="lbl-header">Denomination</td><td className="val-content">{selectedDriver.denomination}</td></tr>
                                            <tr><td className="lbl-header">Case Number</td><td className="val-content">{selectedDriver.case_number}</td></tr>
                                            <tr><td className="lbl-header">Operator's Name</td><td className="val-content">{selectedDriver.operator_name}</td></tr>
                                            <tr><td className="lbl-header">Plate Number</td><td className="val-content">{selectedDriver.plate_number}</td></tr>
                                            <tr><td className="lbl-header">Chassis Number</td><td className="val-content">{selectedDriver.chassis_number}</td></tr>
                                            <tr><td className="lbl-header">Driver's License No.</td><td className="val-content">{selectedDriver.license_number}</td></tr>
                                            <tr><td className="lbl-header">E-wallet Type</td><td className="val-content">{selectedDriver.ewallet_type}</td></tr>
                                            <tr><td className="lbl-header">E-wallet Number</td><td className="val-content">{selectedDriver.ewallet_number}</td></tr>
                                            </tbody>
                                        </table>

                                        <div style={{ marginTop:12, padding:10, background:"rgba(0,0,0,0.02)", borderRadius:8 }}>
                                            <div style={{ fontWeight:700, fontSize:12, marginBottom:4, color:"var(--brick)" }}>Flag Discrepancy Reasons</div>
                                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginBottom:10 }}>
                                                {rejectionOptions.map(opt => (
                                                    <label key={opt} style={{ fontSize:11, display:"flex", alignItems:"center", gap:4 }}>
                                                        <input type="checkbox" checked={verifyRejectFields.includes(opt)} onChange={e => setVerifyRejectFields(p => e.target.checked ? [...p, opt] : p.filter(x=>x!==opt))} />
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="fg" style={{ marginBottom: 8, marginTop: 8 }}>
                                                <label className="fl" style={{ fontSize: 11 }}>{en ? "Notes for driver (optional)" : "Tala para sa driver (opsyonal)"}</label>
                                                <textarea className="fta" style={{ minHeight: 60, fontSize: 12 }} placeholder={en ? "Add any notes visible to the driver..." : "Magdagdag ng tala na makikita ng driver..."} value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} />
                                            </div>
                                            <div style={{ display:"flex", gap:6 }}>
                                                <button className="btn sm jade" style={{ flex:1 }} onClick={() => verifyDriver(selectedDriver.id, verifyNotes)}>✓ {en ? "Verify" : "I-verify"}</button>
                                                <button className="btn sm brick-o" style={{ flex:1 }} onClick={() => rejectDriver(selectedDriver)}>✕ {en ? "Reject" : "Itanggi"}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🖼️ Submitted Documents</div>
                                        {selectedDriver.document_urls ? (
                                            selectedDriver.document_urls.split(",").map((url, i) => (
                                                <div key={i} style={{ marginBottom: 10 }}>
                                                    <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 4 }}>
                                                        {en ? `Document ${i + 1}` : `Dokumento ${i + 1}`} —
                                                        <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--gold-dk)", marginLeft: 4 }}>
                                                            {en ? "Open full size" : "Buksan nang buo"}
                                                        </a>
                                                    </div>
                                                    {url.endsWith(".pdf") ? (
                                                        <div style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, textAlign: "center", fontSize: 12, color: "var(--slate)" }}>
                                                            📄 PDF — <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--gold-dk)" }}>{en ? "Click to view" : "I-click para tingnan"}</a>
                                                        </div>
                                                    ) : (
                                                        <a href={url} target="_blank" rel="noreferrer">
                                                            <img src={url} alt={`Document ${i + 1}`} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                                                        </a>
                                                    )}
                                                </div>
                                            ))
                                        ) : selectedDriver.license_url ? (
                                            <a href={selectedDriver.license_url} target="_blank" rel="noreferrer">
                                                <img src={selectedDriver.license_url} alt="License" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
                                            </a>
                                        ) : (
                                            <div style={{ fontSize: 12, color: "var(--slate)", padding: 12, background: "var(--cream)", borderRadius: 8 }}>
                                                {en ? "No documents submitted yet." : "Wala pang naisumiteng dokumento."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : "Select driver item row block from layout list."}
                        </div>
                    </div>
                )}

                {section === "grievances" && (() => {
                    const grouped = {}
                    const general = []
                    grievances.forEach(g => {
                        const programName = g.applications?.payout_events?.program_name
                        if (programName) {
                            if (!grouped[programName]) grouped[programName] = []
                            grouped[programName].push(g)
                        } else {
                            general.push(g)
                        }
                    })
                    const groupNames = Object.keys(grouped)
                    return (
                        <div className="asec">
                            <div className="asec-title">💬 {en ? "Help Requests by Subsidy" : "Mga Hiling ng Tulong ayon sa Subsidy"}</div>
                            {grievances.length === 0 ? (
                                <div className="empty"><div>{en ? "No help requests yet." : "Wala pang hiling ng tulong."}</div></div>
                            ) : (
                                <>
                                    {groupNames.map(name => (
                                        <div key={name} style={{ marginBottom: 10 }}>
                                            <div
                                                onClick={() => setExpandedGroup(expandedGroup === name ? null : name)}
                                                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--cream)", borderRadius: "var(--r-sm)", cursor: "pointer" }}
                                            >
                                                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>{name}</span>
                                                <span style={{ fontSize: 12, color: "var(--slate)" }}>{grouped[name].length} {en ? "concern(s)" : "alalahanin"} {expandedGroup === name ? "▲" : "▼"}</span>
                                            </div>
                                            {expandedGroup === name && grouped[name].map(g => (
                                                <div key={g.id} className="arow" style={{ cursor: "default" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div className="arow-name">{g.drivers?.full_name} · {g.drivers?.mobile}</div>
                                                        <div className="arow-detail">{g.concern_type}</div>
                                                        <div className="arow-detail" style={{ marginTop: 4, color: "var(--navy)" }}>{g.message}</div>
                                                        <div className="arow-detail">{new Date(g.created_at).toLocaleString()}</div>
                                                    </div>
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                                                        {g.admin_reply && (
                                                            <span style={{ fontSize: 10, color: "var(--jade)" }}>✓ {en ? "Replied" : "Nasagot"}</span>
                                                        )}
                                                        <AdminReplyInline grievance={g} en={en} showToast={showToast} onDone={loadAll} />
                                                        {g.status !== "resolved" ? (
                                                            <button className="btn sm jade" onClick={() => resolveGrievance(g.id)}>{en ? "Mark Resolved" : "Markahan"}</button>
                                                        ) : (
                                                            <span className="pill approved">{en ? "Resolved" : "Nalutas"}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {general.length > 0 && (
                                        <div>
                                            <div
                                                onClick={() => setExpandedGroup(expandedGroup === "general" ? null : "general")}
                                                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--cream)", borderRadius: "var(--r-sm)", cursor: "pointer" }}
                                            >
                                                <span style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>{en ? "General Inquiries" : "Pangkalahatang Tanong"}</span>
                                                <span style={{ fontSize: 12, color: "var(--slate)" }}>{general.length} {en ? "concern(s)" : "alalahanin"} {expandedGroup === "general" ? "▲" : "▼"}</span>
                                            </div>
                                            {expandedGroup === "general" && general.map(g => (
                                                <div key={g.id} className="arow" style={{ cursor: "default" }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div className="arow-name">{g.drivers?.full_name} · {g.drivers?.mobile}</div>
                                                        <div className="arow-detail">{g.concern_type}</div>
                                                        <div className="arow-detail" style={{ marginTop: 4, color: "var(--navy)" }}>{g.message}</div>
                                                        <div className="arow-detail">{new Date(g.created_at).toLocaleString()}</div>
                                                    </div>
                                                    {g.status !== "resolved" ? (
                                                        <button className="btn sm jade" onClick={() => resolveGrievance(g.id)}>{en ? "Mark Resolved" : "Markahan"}</button>
                                                    ) : (
                                                        <span className="pill approved">{en ? "Resolved" : "Nalutas"}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}

// ─── ROOT CONTAINER ENGINE ───────────────────────────────────────────────────
export default function App() {
    const [lang, setLang] = useState("en")
    const [page, setPage] = useState(sessionStorage.getItem("uplift_page") || "signin")
    const [helpAppId, setHelpAppId] = useState(null)
    const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem("uplift_session"))
    const [restoringSession, setRestoringSession] = useState(!!sessionStorage.getItem("uplift_session"))
    const [driver, setDriver] = useState(null)
    const [driverId, setDriverId] = useState(null)
    const [apps, setApps] = useState([])
    const [appointment, setAppointment] = useState(null)
    const [openEvents, setOpenEvents] = useState([])
    const [concerns, setConcerns] = useState([])
    const [toast, setToast] = useState("")
    useEffect(() => {
        const saved = sessionStorage.getItem("uplift_session")
        const savedPage = sessionStorage.getItem("uplift_page")
        if (saved) {
            handleLogin(saved, savedPage || "dashboard").then(() => {
                setRestoringSession(false)
            })
        } else {
            setRestoringSession(false)
        }
    }, [])
    const [modalQueue, setModalQueue] = useState([])
    const [currentModal, setCurrentModal] = useState(null)
    const [sessionNotifShown, setSessionNotifShown] = useState(false)
    const en = lang === "en"

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000) }
    function buildNotifQueue(driverData, appsData, apptData, eventsData, readIds = []) {
        const queue = []
        const now = new Date()
        function isNew(id) {
            const deadlineTypes = ["deadline_", "new_event_"]
            if (deadlineTypes.some(prefix => id.startsWith(prefix))) return true
            return !readIds.includes(id)
        }

        // Verification status
        if (driverData.verification_status === "verified") {
            queue.push({
                id: "verified",
                icon: "✅",
                title: en ? "Account Verified!" : "Na-verify ang Account!",
                body: en ? "Your identity has been verified. Future subsidy applications will auto-fill from your profile." : "Na-verify na ang iyong pagkakakilanlan. Ang mga susunod na aplikasyon ay awtomatikong mapupunan.",
                action: null,
                closeLabel: en ? "Got it" : "Nakuha ko",
            })
        } else if (driverData.verification_status === "rejected" && driverData.verification_notes) {
            queue.push({
                id: "rejected_verification",
                icon: "❌",
                title: en ? "Verification Rejected" : "Tinanggihan ang Verification",
                body: en ? `Please correct the following fields: ${driverData.verification_notes}` : `Pakitama ang mga sumusunod na field: ${driverData.verification_notes}`,
                action: "editprofile",
                actionLabel: en ? "Edit My Information" : "I-edit ang Aking Impormasyon",
                closeLabel: en ? "Later" : "Mamaya na",
            })
        }

        // Application status changes
        ;(appsData || []).forEach(a => {
            if (a.status === "approved") {
                queue.push({
                    id: `approved_${a.id}`,
                    icon: "🎉",
                    title: en ? "Application Approved!" : "Naaprubahan ang Aplikasyon!",
                    body: en
                        ? `Your application for ${a.payout_events?.program_name} has been approved. Claim your subsidy at ${a.payout_events?.venue} on ${a.payout_events?.event_date}.`
                        : `Naaprubahan ang iyong aplikasyon para sa ${a.payout_events?.program_name}. Kunin sa ${a.payout_events?.venue} sa ${a.payout_events?.event_date}.`,
                    action: "subsidies",
                    actionLabel: en ? "View Details" : "Tingnan ang Detalye",
                    closeLabel: en ? "Got it" : "Nakuha ko",
                })
            } else if (a.status === "rejected" && a.rejection_fields) {
                queue.push({
                    id: `rejected_app_${a.id}`,
                    icon: "❌",
                    title: en ? "Application Rejected" : "Tinanggihan ang Aplikasyon",
                    body: en
                        ? `Your application for ${a.payout_events?.program_name} was rejected. Reason: ${a.rejection_fields}.`
                        : `Tinanggihan ang aplikasyon para sa ${a.payout_events?.program_name}. Dahilan: ${a.rejection_fields}.`,
                    action: "editprofile",
                    actionLabel: en ? "Edit My Information" : "I-edit ang Impormasyon",
                    action2: "subsidies",
                    action2Label: en ? "View Application" : "Tingnan ang Aplikasyon",
                    closeLabel: en ? "Later" : "Mamaya na",
                })
            }
        })

        // Deadline warnings — only for events the driver has NOT yet applied to
        const existingEventIds = (appsData || []).map(a => a.event_id)
        ;(eventsData || []).forEach(ev => {
            if (!ev.application_deadline) return
            if (existingEventIds.includes(ev.id)) return
            const deadline = new Date(ev.application_deadline)
            const hoursLeft = (deadline - now) / (1000 * 60 * 60)
            if (hoursLeft < 0) return
            if (hoursLeft <= 48) {
                const isToday = hoursLeft <= 24
                queue.push({
                    id: `deadline_${ev.id}`,
                    icon: isToday ? "🔴" : "🟡",
                    title: isToday
                        ? (en ? "Deadline is TODAY!" : "Deadline Ngayon!")
                        : (en ? "Deadline Tomorrow!" : "Deadline Bukas!"),
                    body: en
                        ? `Applications for ${ev.program_name} close on ${deadline.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Don't miss it!`
                        : `Magsasara ang mga aplikasyon para sa ${ev.program_name} sa ${deadline.toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Huwag palampasin!`,
                    action: { type: "apply", eventId: ev.id },
                    actionLabel: en ? "Apply Now" : "Mag-apply Na",
                    closeLabel: en ? "Later" : "Mamaya na",
                })
            }
        })

        // New events the driver is eligible for (not yet applied, not expired)
        ;(eventsData || []).forEach(ev => {
            if (existingEventIds.includes(ev.id)) return
            if (!ev.application_deadline || new Date(ev.application_deadline) < now) return
            const publishedRecently = ev.announcement_date
                ? (now - new Date(ev.announcement_date)) / (1000 * 60 * 60 * 24) <= 3
                : (now - new Date(ev.created_at || now)) / (1000 * 60 * 60 * 24) <= 3
            if (publishedRecently) {
                queue.push({
                    id: `new_event_${ev.id}`,
                    icon: "📢",
                    title: en ? "New Subsidy Available!" : "Bagong Subsidy!",
                    body: en
                        ? `${ev.program_name} (${ev.program_amount}) is now open for applications. Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
                        : `Bukas na ang ${ev.program_name} (${ev.program_amount}) para sa mga aplikasyon. Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
                    action: { type: "apply", eventId: ev.id },
                    actionLabel: en ? "Apply Now" : "Mag-apply Na",
                    closeLabel: en ? "Maybe Later" : "Mamaya Na Lang",
                })
            }
        })

        return queue.filter(n => isNew(n.id))
    }
    function navigate(targetPage, contextId) {
        if (targetPage === "helpcenter") setHelpAppId(contextId || null)
        sessionStorage.setItem("uplift_page", targetPage)
        setPage(targetPage)
    }

    async function loadDriverData(id, triggerModals = false, readIds = []) {
        const [{ data: profile }, { data: appsData }, { data: apptData }, { data: eventsData }] = await Promise.all([
            supabase.from("drivers").select("*").eq("id", id).single(),
            supabase.from("applications").select("*, payout_events(*)").eq("driver_id", id).order("applied_at", { ascending: false }),
            supabase.from("appointments").select("*, payout_events(program_name)").eq("driver_id", id).eq("status", "confirmed").single(),
            supabase.from("payout_events").select("*").order("event_date", { ascending: true }),
        ])
        if (profile) {
            setDriver({
                name: profile.full_name.split(" ")[0],
                verification_status: profile.verification_status,
                verification_notes: profile.verification_notes,
                license_url: profile.license_url,
                last_name: profile.last_name, first_name: profile.first_name,
                middle_name: profile.middle_name, extension_name: profile.extension_name,
                region: profile.region, province: profile.province,
                city: profile.city, barangay: profile.barangay,
                birth_month: profile.birth_month, birth_day: profile.birth_day,
                birth_year: profile.birth_year, age: profile.age, sex: profile.sex,
                denomination: profile.denomination, case_number: profile.case_number,
                operator_name: profile.operator_name, plate_number: profile.plate_number,
                chassis_number: profile.chassis_number, license_number: profile.license_number,
                ewallet_type: profile.ewallet_type, ewallet_number: profile.ewallet_number,
            })
        }
        setApps(appsData || [])
        setAppointment(apptData || null)
        setOpenEvents(eventsData || [])
        const { data: concernsData } = await supabase
            .from("grievances")
            .select("*, applications(event_id, payout_events(program_name, program_agency))")
            .eq("driver_id", id)
            .order("created_at", { ascending: false })
        setConcerns(concernsData || [])
        if (triggerModals && profile) {
            const queue = buildNotifQueue(profile, appsData || [], apptData, eventsData || [], readIds)
            if (queue.length > 0) {
                setModalQueue(queue.slice(1))
                setCurrentModal(queue[0])
            }
        }
    }

    async function handleLogin(mobileNum, returnPage = "dashboard") {
        const { data } = await supabase.from("drivers").select("*").eq("mobile", mobileNum).single()
        if (data) {
            setDriverId(data.id)
            sessionStorage.setItem("uplift_session", mobileNum)
            const { data: reads } = await supabase
                .from("notification_reads")
                .select("notification_id")
                .eq("driver_id", data.id)
            const readIds = (reads || []).map(r => r.notification_id)
            await loadDriverData(data.id, false, readIds)
            setLoggedIn(true)
            setPage(returnPage)
        }
    }

    async function handleUploadDocument(files) {
        if (!driverId || !files || files.length === 0) return
        showToast(en ? "Uploading documents..." : "Ina-upload ang mga dokumento...")
        const urls = []
        for (const file of files) {
            const ext = file.name.split(".").pop()
            const filename = `${driverId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { error: uploadError } = await supabase.storage
                .from("licenses")
                .upload(filename, file, { contentType: file.type, upsert: true })
            if (!uploadError) {
                const { data: urlData } = supabase.storage.from("licenses").getPublicUrl(filename)
                urls.push(urlData.publicUrl)
            }
        }
        if (urls.length > 0) {
            const imageExtensions = [".jpg", ".jpeg", ".png"]
            const firstImageUrl = urls.find(u => imageExtensions.some(ext => u.toLowerCase().endsWith(ext))) || urls[0]
            await supabase.from("drivers").update({
                license_url: firstImageUrl,
                document_urls: urls.join(","),
                verification_status: "unverified"
            }).eq("id", driverId)
            showToast(en ? `${urls.length} document(s) submitted for verification.` : `${urls.length} dokumento ang naisumite para sa verification.`)
            await loadDriverData(driverId)
        } else {
            showToast(en ? "Upload failed. Please try again." : "Hindi na-upload. Subukan muli.")
        }
    }

    function handleLogout() {
        sessionStorage.removeItem("uplift_session")
        sessionStorage.removeItem("uplift_page")
        sessionStorage.removeItem("uplift_draft_message")
        sessionStorage.removeItem("uplift_draft_id")
        sessionStorage.removeItem("uplift_draft_appid")
        sessionStorage.removeItem("uplift_draft_type")
        sessionStorage.removeItem("uplift_draft_show")
        setLoggedIn(false); setDriver(null); setDriverId(null); setApps([]); setAppointment(null); setOpenEvents([]); setConcerns([]); setPage("signin")
    }

    async function refreshApps() { if (driverId) await loadDriverData(driverId) }

    async function closeModal() {
        if (currentModal?.id && driverId) {
            const deadlineTypes = ["deadline_", "new_event_"]
            const isDeadline = deadlineTypes.some(prefix => currentModal.id.startsWith(prefix))
            if (!isDeadline) {
                await supabase.from("notification_reads").upsert({
                    driver_id: driverId,
                    notification_id: currentModal.id,
                }, { onConflict: "driver_id,notification_id" })
            }
        }
        if (modalQueue.length > 0) {
            setCurrentModal(modalQueue[0])
            setModalQueue(prev => prev.slice(1))
        } else {
            setCurrentModal(null)
        }
    }

    function handleModalAction(action) {
        if (!action) return
        if (typeof action === "string") {
            navigate(action)
        } else if (action.type === "apply") {
            navigate("apply", action.eventId)
        }
    }

    const navItems = [
        { key: "dashboard", ico: "🏠", en: "Home", fil: "Home" },
        { key: "subsidies", ico: "📋", en: "Subsidies", fil: "Subsidies" },
    ]

    function renderPage() {
        if (!loggedIn) {
            if (page === "signup") return <SignUp en={en} onNav={setPage} onLogin={handleLogin} />
            if (page === "changenumber") return <ChangeNumber en={en} onNav={setPage} />
            if (page === "forgot") return <ForgotPassword en={en} onNav={setPage} />
            if (page === "admin") return <AdminPanel en={en} showToast={showToast} />
            return <SignIn en={en} onNav={setPage} onLogin={handleLogin} />
        }
        if (page === "admin") return <AdminPanel en={en} showToast={showToast} />
        if (page === "editprofile") return <EditProfile en={en} driverId={driverId} driver={driver} showToast={showToast} onDone={async () => { await loadDriverData(driverId); setPage("dashboard") }} />
        if (page === "subsidies") return <Subsidies en={en} onNav={navigate} apps={apps} appointment={appointment} driverId={driverId} showToast={showToast} refreshApps={refreshApps} />
        if (page === "apply") return <Apply en={en} driverId={driverId} driver={driver} showToast={showToast} refreshApps={refreshApps} onNav={navigate} />
        if (page === "helpcenter") return <HelpCenter en={en} apps={apps} driverId={driverId} showToast={showToast} onNav={navigate} preselectedAppId={helpAppId} />
        if (page === "notifications") return <Notifications en={en} apps={apps} appointment={appointment} driver={driver} openEvents={openEvents} onOpenModal={(modal) => setCurrentModal(modal)} />
        return <Dashboard en={en} onNav={navigate} driver={driver || { name: "Driver" }} apps={apps} appointment={appointment} onUploadDocument={handleUploadDocument} concerns={concerns} driverId={driverId} showToast={showToast} openEvents={openEvents} onOpenModal={(modal) => setCurrentModal(modal)} refreshConcerns={async () => { if (driverId) { const { data } = await supabase.from("grievances").select("*, applications(event_id, payout_events(program_name, program_agency))").eq("driver_id", driverId).order("created_at", { ascending: false }); setConcerns(data || []) }}} />
    }

    return (
        <>
            <style>{css}</style>
            <div className={`app ${loggedIn ? 'logged-in-layout' : ''}`}>
                <Toast msg={toast} />
                <NotifModal notif={currentModal} onClose={closeModal} onAction={handleModalAction} />
                <div className="topbar">
                    <div className="logo" onClick={() => setPage(loggedIn ? "dashboard" : "signin")}>UPLIFT <span>EO 110</span></div>
                    <div className="topbar-right">
                        <button className="tbtn" onClick={() => setLang(l => l === "en" ? "fil" : "en")}>{en ? "Filipino" : "English"}</button>
                        <button className="tbtn ghost" onClick={() => setPage("admin")}>Admin</button>
                        {loggedIn && <button className="tbtn" onClick={handleLogout}>{en ? "Sign Out" : "Lumabas"}</button>}
                    </div>
                </div>

                {loggedIn && (
                    <div className="sidebar">
                        {navItems.map(item => (
                            <button key={item.key} className={`sidebar-item ${page === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}>
                                <span className="sico">{item.ico}</span>
                                <span>{en ? item.en : item.fil}</span>
                            </button>
                        ))}
                        <button className="sidebar-item" onClick={() => setPage("admin")}>
                            <span className="sico">⚙️</span><span>Admin Desk</span>
                        </button>
                    </div>
                )}

                <div className={loggedIn ? "main-content" : ""}>
                    <div className={loggedIn ? "scroll" : "scroll no-nav"}>
                        <div className={loggedIn ? "page-inner" : ""}>
                            {restoringSession ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
                                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--navy)", fontSize: 14 }}>Loading...</div>
                                </div>
                            ) : renderPage()}
                        </div>
                    </div>
                </div>

                {loggedIn && (
                    <nav className="bnav">
                        {navItems.map(item => (
                            <button key={item.key} className={`bnav-item ${page === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}>
                                <span className="ico">{item.ico}</span>
                                <span className="lbl">{en ? item.en : item.fil}</span>
                            </button>
                        ))}
                    </nav>
                )}
            </div>
        </>
    )
}