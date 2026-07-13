import { useEffect, useRef, useState } from "react"
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode/+esm"
import jsQR from "https://cdn.jsdelivr.net/npm/jsqr/+esm"

export function Pill({ status, en }) {
    const map = {
        approved: { label: en ? "• Approved" : "• Naaprubahan", cls: "approved" },
        claimed: { label: en ? "✓ Subsidy Received" : "✓ Natanggap na", cls: "claimed" },
        rejected: { label: en ? "• Rejected" : "• Tinanggihan", cls: "rejected" },
        pending: { label: en ? "• Awaiting Response" : "• Naghihintay ng Tugon", cls: "pending" },
        confirmed: { label: en ? "• Confirmed" : "• Nakumpirma", cls: "approved" },
        submitted: { label: en ? "• Submitted" : "• Naisumite", cls: "pending" },
        draft: { label: en ? "• Draft" : "• Draft", cls: "pending" },
        resolved: { label: en ? "• Resolved" : "• Nalutas", cls: "approved" },
        replied: { label: en ? "• Response Received" : "• May Tugon", cls: "approved" },
        under_review: { label: en ? "• Under Review" : "• Sinusuri", cls: "pending" },
        has_response: { label: en ? "• Response Received" : "• May Tugon", cls: "response" },
        response_received: { label: en ? "• New Response!" : "• Bagong Tugon!", cls: "response" },
    }
    const p = map[status] || { label: `• ${status}`, cls: "pending" }
    return <span className={`pill ${p.cls}`}>{p.label}</span>
}

export function Toast({ msg }) {
    return msg ? <div className="toast">{msg}</div> : null
}

export function SlotsBar({ remaining, total }) {
    if (!total) return null
    const pct = Math.round((remaining / total) * 100)
    const cls = pct > 50 ? "" : pct > 20 ? "low" : "empty-bar"
    return <div className="slots-bar"><div className={`slots-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
}

export function NotifModal({ notif, onClose, onAction }) {
    if (!notif) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>

                {/* Only use notif.tutorialText — this is where the injected text lives */}
                {notif.tutorialText && (
                    <div style={{
                        background: "var(--amber-bg)",
                        border: "1px solid var(--amber)",
                        padding: "10px",
                        borderRadius: "var(--r-sm)",
                        marginBottom: "15px",
                        fontSize: 12,
                        color: "var(--navy)",
                        fontWeight: 600,
                        lineHeight: 1.4
                    }}>
                        💡 {notif.tutorialText}
                    </div>
                )}

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

export function QRDisplay({ value }) {
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

export function QRScanner({ onResult, en }) {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [error, setError] = useState(null)
    const rafRef = useRef(null)

    useEffect(() => {
        let stream
        async function start() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                tick()
            } catch (e) {
                setError(en ? "Camera access denied or unavailable." : "Hindi ma-access ang camera.")
            }
        }
        function tick() {
            const video = videoRef.current, canvas = canvasRef.current
            if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                const ctx = canvas.getContext("2d")
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const code = jsQR(imageData.data, canvas.width, canvas.height)
                if (code?.data) {
                    onResult(code.data)
                    return
                }
            }
            rafRef.current = requestAnimationFrame(tick)
        }
        start()
        return () => {
            cancelAnimationFrame(rafRef.current)
            stream?.getTracks().forEach(t => t.stop())
        }
    }, [])

    return (
        <div style={{ textAlign: "center" }}>
            <video ref={videoRef} style={{ width: "100%", maxWidth: 320, borderRadius: 8 }} muted playsInline />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {error && <div style={{ color: "var(--brick)", fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
    )
}