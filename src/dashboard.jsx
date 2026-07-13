    import { useState, useEffect } from "react"
    import { supabase } from "./supabase"
    import { Pill, QRDisplay } from "./ui.jsx"

    export function DashUpload({ en, onUploadDocument, driver }) {
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

    export function NotifFeed({ en, apps, appointment, driver, openEvents, onOpenModal, compact }) {
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
                    action: { type: "view_subsidy", appId: a.id },
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
            else if (a.status === "pending" && a.application_messages?.length > 0 && !a.driver_seen_latest) {
                const latest = [...a.application_messages].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0]
                notifs.unshift({
                    dot: "info",
                    icon: "🔔",
                    title: en ? "New Response!" : "Bagong Tugon!",
                    msg: `${a.payout_events?.program_name} — ${latest?.message?.slice(0, 60)}${latest?.message?.length > 60 ? "..." : ""}`,
                    time: en ? "New" : "Bago",
                    modal: {
                        icon: "🏛️",
                        title: en ? "Message from Agency" : "Mensahe mula sa Ahensya",
                        body: latest?.message || "",
                        action: { type: "view_subsidy", appId: a.id },
                        actionLabel: en ? "View My Subsidies" : "Tingnan ang Subsidies",
                        closeLabel: en ? "Got it" : "Ok"
                    }
                })
            } else if (a.status === "pending") notifs.push({
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
                action: { type: "view_subsidy", appId: appointment.application_id },
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

    export function Dashboard({ en, onNav, driver, apps, appointment, onUploadDocument, concerns, driverId, showToast, refreshApps, refreshConcerns, openEvents, onOpenModal, showTutorial, setShowTutorial }) {
        const [tutStep, setTutStep] = useState(0)
        const [isTutorialActive, setIsTutorialActive] = useState(false)
        const modalTutSteps = {
            approved: {
                en: "This is your Approval Notice. Click 'View' to see your payout instructions, venue, and date.",
                fil: "Ito ang iyong Paunawa ng Pag-apruba. I-click ang 'Tingnan' para makita ang instruksyon sa payout, venue, at petsa."
            },
            rejected: {
                en: "Your application was rejected. Click 'Edit' to fix the flagged information, or 'Later' to review it later.",
                fil: "Ang iyong aplikasyon ay tinanggihan. I-click ang 'I-edit' para ayusin ang impormasyon, o 'Mamaya' para balikan ito mamaya."
            },
            appointment: {
                en: "This confirms your appointment. Click 'View' to see your QR code and schedule details.",
                fil: "Kinukumpirma nito ang iyong appointment. I-click ang 'Tingnan' para makita ang iyong QR code at detalye ng iskedyul."
            }
        };

        const handleModalOpen = (modal) => {
            let type = '';
            if (modal.icon === '🎉') type = 'approved';
            else if (modal.icon === '❌') type = 'rejected';
            else if (modal.icon === '📅') type = 'appointment';

            onOpenModal({
                ...modal,
                tutorialText: modalTutSteps[type]?.[en ? 'en' : 'fil']
            });
        };

        useEffect(() => {
            if (refreshApps) refreshApps()
            const interval = setInterval(() => {
                if (refreshApps) refreshApps()
            }, 15000)
            return () => clearInterval(interval)
        }, [])

        useEffect(() => {
            if (!showTutorial) setTutStep(0)
        }, [showTutorial])

        useEffect(() => {
            if (showTutorial) {
                document.body.classList.add('lock-scroll');
            } else {
                document.body.classList.remove('lock-scroll');
            }
            return () => document.body.classList.remove('lock-scroll');
        }, [showTutorial]);

        useEffect(() => {
            if (showTutorial) {
                const element = document.getElementById(`tut-step-${tutStep}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, [tutStep, showTutorial]);

        const tutSteps = [
            {
                en: "This is your Welcome Area. It shows your name, your active subsidies, and whether your account is fully verified.",
                fil: "Ito ang iyong Welcome Area. Ipinapakita dito ang iyong pangalan, mga aktibong subsidy, at kung verified na ang iyong account."
            },
            {
                en: "This is your Notifications panel. Important updates about your applications, deadlines, and messages from the agency will appear here.",
                fil: "Ito ang panel ng mga Abiso. Dito lalabas ang mga mahahalagang update sa iyong mga aplikasyon, deadline, at mensahe mula sa ahensya."
            },
            {
                en: "Click here to browse all available payout events and submit a new subsidy application.",
                fil: "I-click ito upang tingnan ang lahat ng available na payout event at mag-submit ng bagong aplikasyon para sa subsidy."
            },
            {
                en: "Here you can track the status of the subsidies you've applied for, whether they are pending, approved, or rejected.",
                fil: "Dito mo masusubaybayan ang status ng mga inapplyan mong subsidy, kung ito ay nakabinbin, naaprubahan, o tinanggihan."
            },
            {
                en: "Need assistance or want to update your details? Use these buttons to visit the Help Center or edit your profile.",
                fil: "Kailangan ng tulong o nais i-update ang iyong detalye? Gamitin ang mga button na ito para pumunta sa Help Center o i-edit ang iyong profile."
            }
        ]

        const getHighlightStyle = (stepIndex, bgType) => {
            if (showTutorial && tutStep === stepIndex) {
                return {
                    position: "relative",
                    zIndex: 1000,
                    boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                    pointerEvents: "none",
                    background: bgType === 'navy' ? "var(--navy)" : (bgType === 'white' ? "#fff" : "var(--cream)"),
                    borderRadius: "var(--r)",
                    transition: "all 0.3s ease"
                }
            }
            return { transition: "all 0.3s ease" }
        }

        function GuideBox({ stepIndex }) {
            if (!showTutorial || tutStep !== stepIndex) return null
            return (
                <div className="guide-box" style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    left: 0,
                    width: "100%",
                    zIndex: 1000,
                    background: "var(--navy)",
                    borderRadius: "var(--r)",
                    padding: "16px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                    pointerEvents: "auto",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
                        💡 {tutStep + 1}/{tutSteps.length}
                    </div>
                    <div style={{ fontSize: 13, color: "#fff", marginBottom: 14, lineHeight: 1.6 }}>
                        {en ? tutSteps[tutStep].en : tutSteps[tutStep].fil}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn outline sm" style={{ margin: 0, background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} onClick={() => setShowTutorial(false)}>
                            {en ? "Skip" : "Laktawan"}
                        </button>
                        <button className="btn gold sm" style={{ margin: 0 }} onClick={() => {
                            if (tutStep < tutSteps.length - 1) setTutStep(t => t + 1)
                            else setShowTutorial(false)
                        }}>
                            {tutStep < tutSteps.length - 1 ? (en ? "Next" : "Susunod") : (en ? "Finish" : "Tapusin")}
                        </button>
                    </div>
                </div>
            )
        }

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
                {showTutorial && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                        zIndex: 999
                    }} />
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "0 0 0 0" }}>

                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <div id="tut-step-0" className="dh" style={{ flex: 1, borderRadius: "var(--r)", padding: "24px 20px", ...getHighlightStyle(0, 'navy') }}>
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
                                    <button onClick={() => onNav("editprofile")} style={{ pointerEvents: "auto", marginTop: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                        ✏️ {en ? "Edit My Information" : "I-edit ang Aking Impormasyon"}
                                    </button>
                                </div>
                            )}
                        </div>
                        <GuideBox stepIndex={0} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <div id="tut-step-1" className="dh" style={{ flex: 1, borderRadius: "var(--r)", padding: "16px 14px", ...getHighlightStyle(1, 'navy') }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                🔔 {en ? "Notifications" : "Mga Abiso"}
                            </div>
                            <div style={{ overflowY: "auto", maxHeight: 160 }}>
                                <NotifFeed en={en} apps={apps} appointment={appointment} driver={driver} openEvents={openEvents} onOpenModal={handleModalOpen} compact={true} />
                            </div>
                        </div>
                        <GuideBox stepIndex={1} />
                    </div>
                </div>

                <div className="pad">
                    <div id="tut-step-2" style={{ padding: showTutorial && tutStep === 2 ? 12 : 0, ...getHighlightStyle(2, 'cream') }}>
                        <div className="srow" style={{ marginTop: showTutorial && tutStep === 2 ? 0 : 0 }}>
                            <h2>{en ? "Apply for a Subsidy" : "Mag-apply ng Subsidy"}</h2>
                        </div>
                        <div className="card" style={{ padding: "16px", textAlign: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 12 }}>
                                {en ? "Browse open payout events and submit your application." : "Tingnan ang mga bukas na payout event at mag-apply."}
                            </div>
                            <button className="btn gold" style={{ pointerEvents: "auto" }} onClick={() => onNav("apply")}>{en ? "Browse Available Subsidies" : "Tingnan ang Available na Subsidy"}</button>
                        </div>
                        <GuideBox stepIndex={2} />
                    </div>

                    <div className="spacer" />

                    <div id="tut-step-3" style={{ padding: showTutorial && tutStep === 3 ? 12 : 0, ...getHighlightStyle(3, 'cream') }}>
                        <div className="srow">
                            <h2>{en ? "My Subsidies" : "Ang Aking mga Subsidy"}</h2>
                            <button className="srow-btn" style={{ pointerEvents: "auto" }} onClick={() => onNav("subsidies")}>{en ? "See all" : "Lahat"} →</button>
                        </div>
                        {apps.length === 0 ? (
                            <div className="card" style={{ textAlign: "center", padding: 16, color: "var(--slate)", fontSize: 13 }}>
                                {en ? "No applications yet." : "Wala pang aplikasyon."}
                            </div>) : apps.slice(0, 2).map(a => {
                            const hasNewMessage = a.application_messages?.length > 0 && !a.driver_seen_latest
                            const hasAnyMessage = a.application_messages?.length > 0
                            const pillStatus = a.status === "claimed" ? "claimed"
                                : a.status === "approved" ? "approved"
                                    : a.status === "rejected" ? "rejected"
                                        : hasNewMessage ? "response_received"
                                            : hasAnyMessage ? "has_response"
                                                : "under_review"
                            return (
                                <div
                                    className="card"
                                    key={a.id}
                                    style={{ cursor: "pointer", pointerEvents: "auto" }}
                                    onClick={() => {
                                        if (showTutorial) return;

                                        // Instantly navigate
                                        onNav("subsidies", a.id);

                                        // Mark as read in the background with a delay to ensure it saves!
                                        if (hasNewMessage) {
                                            supabase.from("applications")
                                                .update({ driver_seen_latest: true })
                                                .eq("id", a.id)
                                                .then(() => {
                                                    setTimeout(() => {
                                                        if (refreshApps) refreshApps();
                                                    }, 500);
                                                });
                                        }
                                    }}
                                >
                                    <div className="card-top">
                                        <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
                                        <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
                                    </div>
                                    <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
                                    <div className="card-footer">
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                            <Pill status={pillStatus} en={en} />
                                            {hasNewMessage && (
                                                <span style={{ background: "var(--gold)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>!</span>
                                            )}
                                        </div>
                                        <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )
                        })}
                        <GuideBox stepIndex={3} />
                    </div>

                    <div className="spacer" />

                    <div id="tut-step-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: showTutorial && tutStep === 4 ? 12 : 0, ...getHighlightStyle(4, 'cream') }}>
                        <div className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center", pointerEvents: "auto" }} onClick={() => onNav("myconcerns")}>
                            <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--gold-dk)", marginBottom: 4 }}>{en ? "Need Help?" : "Kailangan ng Tulong?"}</div>
                            <div style={{ fontSize: 12, color: "var(--slate)" }}>{en ? "Concerns, Grievances and FAQ" : "Mga Alalahanin, Reklamo at FAQ"}</div>
                        </div>
                        <div className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center", pointerEvents: "auto" }} onClick={() => onNav("editprofile")}>
                            <div style={{ fontSize: 24, marginBottom: 6 }}>👤</div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>{en ? "My Profile" : "Aking Profile"}</div>
                            <div style={{ fontSize: 12, color: "var(--slate)" }}>{en ? "Edit your information" : "I-edit ang impormasyon"}</div>
                        </div>
                        <GuideBox stepIndex={4} />
                    </div>

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

    export function ApprovedDetails({ a, en }) {
        const latestMsg = a.application_messages?.length > 0
            ? [...a.application_messages].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0]
            : null

        return (
            <div>
                {/* Admin approval message */}
                {latestMsg && (
                    <div style={{ background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "var(--navy)", lineHeight: 1.7 }}>
                        <div style={{ fontSize: 11, color: "var(--jade)", fontWeight: 700, marginBottom: 6 }}>
                            🏛️ {en ? "Instructions from Agency" : "Mga Tagubilin mula sa Ahensya"}
                        </div>
                        {latestMsg.message}
                    </div>
                )}

                {/* Previous messages */}
                {a.application_messages?.length > 1 && (
                    <div style={{ marginTop: 8 }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, color: "var(--slate)", marginBottom: 6 }}>
                            {en ? "Previous messages:" : "Mga nakaraang mensahe:"}
                        </div>
                        {[...a.application_messages]
                            .sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
                            .slice(1)
                            .map((msg, i) => (
                                <div key={msg.id || i} style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px", marginBottom: 6, fontSize: 12, color: "var(--slate)" }}>
                                    <div style={{ fontSize: 10, color: "var(--slate)", marginBottom: 2 }}>
                                        {new Date(msg.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                    </div>
                                    {msg.message}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        )
    }

    export function AppointmentDetail({ en, app, allAppointments, driverId, showToast, refreshApps, onNav, onBack }) {
        const [qr, setQr] = useState(false)
        const appt = allAppointments?.find(ap => ap.event_id === app?.event_id) || null

        const hasAnyMessage = app?.application_messages?.length > 0
        const status = app?.status === "claimed" ? "claimed"
            : app?.status === "approved" ? "approved"
                : app?.status === "rejected" ? "rejected"
                    : "pending"
        const deadline = app?.payout_events?.application_deadline
        const deadlinePassed = deadline ? new Date(deadline) < new Date() : false
        const canReapply = status === "rejected" && !!app?.rejection_has_fields && !deadlinePassed

        const sortedMessages = hasAnyMessage
            ? [...app.application_messages].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
            : []
        const latestMsg = sortedMessages[0] || null
        const olderMessages = sortedMessages.slice(1)

        return (
            <div>
                <div className="ph">
                    <h1>{app?.payout_events?.program_name}</h1>
                    <p>{app?.payout_events?.program_agency}</p>
                </div>
                <div className="pad">
                    <span className="link" onClick={onBack}>← {en ? "Back to My Subsidies" : "Bumalik sa Aking mga Subsidy"}</span>
                    <div className="spacer" />

                    <div style={{ marginBottom: 12 }}><Pill status={status === "pending" ? (hasAnyMessage ? "has_response" : "under_review") : status} en={en} /></div>

                    {/* Rejected: reason */}
                    {status === "rejected" && (
                        <div style={{ background: "var(--brick-bg)", border: "1px solid var(--brick)", borderRadius: "var(--r-sm)", padding: "16px", marginBottom: 16, fontSize: 13, color: "var(--navy)", lineHeight: 1.8 }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--brick)", marginBottom: 8 }}>
                                ❌ {en ? "Application Rejected" : "Tinanggihan ang Aplikasyon"}
                            </div>
                            {app?.rejection_fields
                                ? (en ? `Please correct: ${app.rejection_fields}` : `Pakitama: ${app.rejection_fields}`)
                                : (en ? "See the message below for details." : "Tingnan ang mensahe sa ibaba para sa detalye.")}
                        </div>
                    )}

                    {status === "rejected" && canReapply && (
                        <>
                            <button className="btn outline" onClick={() => onNav("editprofile")}>
                                ✏️ {en ? "Fix Details in Profile" : "Ayusin ang Detalye sa Profile"}
                            </button>
                            <button className="btn gold" onClick={() => onNav("apply", app.event_id)}>
                                🔄 {en ? "Reapply for this Subsidy" : "Mag-reapply para sa Subsidy na ito"}
                            </button>
                        </>
                    )}

                    {/* Pending, no messages yet */}
                    {status === "pending" && !hasAnyMessage && (
                        <div style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "16px", marginBottom: 16, fontSize: 13, color: "var(--slate)", fontStyle: "italic" }}>
                            ⏳ {en ? "Your application is under review. No updates yet." : "Sinusuri ang iyong aplikasyon. Wala pang update."}
                        </div>
                    )}

                    {/* Instructions from Agency (latest message) */}
                    {latestMsg && (
                        <div style={{ background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: "16px", marginBottom: 16, fontSize: 13, color: "var(--navy)", lineHeight: 1.8 }}>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--jade)", marginBottom: 8 }}>
                                🏛️ {en ? "Latest Message from Agency" : "Pinakabagong Mensahe mula sa Ahensya"}
                            </div>
                            {latestMsg.message}
                        </div>
                    )}

                    {/* Appointment Card — approved only */}
                    {status === "approved" && appt && (
                        <div className="appt-card" style={{ marginBottom: 16 }}>
                            <div className="appt-label">ACTIVE APPOINTMENT</div>
                            <div className="appt-prog">{appt.payout_events?.program_name}</div>
                            <div className="appt-row">
                                <span className="appt-ico">📅</span>
                                <div className="appt-txt">
                                    {appt.assigned_date}
                                    <small>{appt.time_slot}</small>
                                </div>
                            </div>
                            <div className="appt-row">
                                <span className="appt-ico">📍</span>
                                <div className="appt-txt">
                                    {appt.venue}
                                    <small>{en ? "Bring Driver's License + this reference" : "Dalhin ang Driver's License + reference na ito"}</small>
                                </div>
                            </div>
                            <div className="appt-ref">{en ? "Ref:" : "Ref:"} <strong>{appt.reference_code}</strong></div>
                        </div>
                    )}

                    {/* Subsidy claimed — release confirmation */}
                    {status === "claimed" && (
                        <div className="card" style={{ padding: 16, textAlign: "center", marginBottom: 16 }}>
                            <div style={{ fontSize: 28 }}>✅</div>
                            <div style={{ fontWeight: 700 }}>{en ? "Subsidy Received" : "Natanggap na ang Subsidy"}</div>
                            <div style={{ fontSize: 12, color: "var(--slate)" }}>
                                {app?.claimed_at && new Date(app.claimed_at).toLocaleString("en-PH")}
                            </div>
                        </div>
                    )}

                    {/* QR Code — approved only */}
                    {status === "approved" && appt && (
                        <>
                            <button className="btn gold" onClick={() => setQr(!qr)}>
                                {qr ? (en ? "Hide QR Code" : "Itago ang QR") : (en ? "Show QR Code" : "Ipakita ang QR")}
                            </button>
                            {qr && (
                                <div className="card" style={{ textAlign: "center", padding: 20 }}>
                                    <QRDisplay value={`UPLIFT|${appt.reference_code}|${appt.assigned_date}|${appt.venue}`} />
                                    <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 10 }}>
                                        {en ? "Show this QR code to the officer at the venue." : "Ipakita ang QR code na ito sa opisyal sa venue."}
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)", marginTop: 8, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: 1 }}>
                                        {appt.reference_code}
                                    </div>
                                </div>
                            )}
                        </>
                    )}


                    <button className="btn outline" onClick={() => onNav("helpcenter", app.id)}>
                        💬 {en ? "Need Help?" : "Kailangan ng Tulong?"}
                    </button>

                    {/* Previous messages / full log */}
                    {olderMessages.length > 0 && (
                        <>
                            <div className="spacer" />
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 8 }}>
                                {en ? "Previous Updates" : "Mga Nakaraang Update"}
                            </div>
                            {olderMessages.map((msg, i) => (
                                <div key={msg.id || i} style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 12px", marginBottom: 8, fontSize: 12, color: "var(--slate)", lineHeight: 1.6 }}>
                                    <div style={{ fontSize: 10, color: "var(--slate)", marginBottom: 4 }}>
                                        🏛️ {en ? "Agency" : "Ahensya"} · {new Date(msg.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                    </div>
                                    {msg.message}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        )
    }

    export function Appointment({en, appointment}) {
        const [qr, setQr] = useState(false)
        const [rescheduled, setRescheduled] = useState(false)

        if (!appointment) {
            return (
                <div>
                    <div className="ph"><h1>{en ? "My Schedule" : "Ang Aking Iskedyul"}</h1>
                        <p>{en ? "Your assigned payout slot" : "Ang iyong itinalagang slot ng payout"}</p></div>
                    <div className="pad">
                        <div className="empty">
                            <div className="empty-ico">📅</div>
                            <div>{en ? "No appointment yet. Apply for a subsidy to get a schedule." : "Wala pang appointment. Mag-apply ng subsidy para makakuha ng iskedyul."}</div>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div>
                <div className="ph"><h1>{en ? "My Schedule" : "Ang Aking Iskedyul"}</h1>
                    <p>{en ? "Your assigned payout slot" : "Ang iyong itinalagang slot ng payout"}</p></div>
                <div className="pad">
                    <div className="appt-card">
                        <div className="appt-label">ACTIVE APPOINTMENT</div>
                        <div className="appt-prog">{appointment.payout_events?.program_name}</div>
                        <div className="appt-row"><span className="appt-ico">📅</span>
                            <div className="appt-txt">{appointment.assigned_date}<small>{appointment.time_slot}</small>
                            </div>
                        </div>
                        <div className="appt-row"><span className="appt-ico">📍</span>
                            <div
                                className="appt-txt">{appointment.venue}<small>{en ? "Bring Driver's License + this reference" : "Dalhin ang Driver's License + reference na ito"}</small>
                            </div>
                        </div>
                        <div className="appt-ref">{en ? "Ref:" : "Ref:"} <strong>{appointment.reference_code}</strong>
                        </div>
                    </div>
                    {qr && (
                        <div className="qr-box">
                            <div className="qr-sq">▦</div>
                            <div
                                className="qr-cap">{en ? "Show this to the officer at the venue." : "Ipakita ito sa opisyal sa venue."}</div>
                            <div className="qr-ref">{appointment.reference_code}</div>
                        </div>
                    )}
                    <button className="btn gold"
                            onClick={() => setQr(!qr)}>{qr ? (en ? "Hide QR Code" : "Itago ang QR") : (en ? "Show QR Code" : "Ipakita ang QR")}</button>
                    {!rescheduled ? (
                        <button className="btn outline"
                                onClick={() => setRescheduled(true)}>{en ? "I cannot make this schedule" : "Hindi ako makakarating sa oras na ito"}</button>
                    ) : (
                        <div className="alert amber">
                            <strong>{en ? "Noted." : "Natanggap."}</strong><br/>{en ? "Please come during walk-in hours. Bring your Driver's License." : "Pumunta sa walk-in hours. Dalhin ang Driver's License."}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    export function Notifications({en, apps, appointment, driver, openEvents, onOpenModal}) {
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
                    msg_en: `📢 New subsidy available: ${ev.program_name} (${ev.program_amount}). Apply before ${new Date(ev.application_deadline).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                    })}.`,
                    msg_fil: `📢 Bagong subsidy: ${ev.program_name} (${ev.program_amount}). Mag-apply bago ang ${new Date(ev.application_deadline).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                    })}.`,
                    modal: {
                        icon: "📢",
                        title: en ? "New Subsidy Available!" : "Bagong Subsidy!",
                        body: en
                            ? `${ev.program_name} (${ev.program_amount}) is now open. Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                            })}.`
                            : `Bukas na ang ${ev.program_name} (${ev.program_amount}). Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                            })}.`,
                        action: {type: "apply", eventId: ev.id},
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
                        type: "rejected",
                        time: hoursLeft <= 24 ? (en ? "Today" : "Ngayon") : (en ? "Tomorrow" : "Bukas"),
                        msg_en: `⚠️ Deadline for ${a.payout_events?.program_name}: ${new Date(deadline).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                        })}`,
                        msg_fil: `⚠️ Deadline ng ${a.payout_events?.program_name}: ${new Date(deadline).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                        })}`,
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
                        action: {type: "view_subsidy", appId: a.id},
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
                        action2: {type: "view_subsidy", appId: a.id},
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
                    action: {type: "view_subsidy", appId: appointment.application_id},
                    actionLabel: en ? "View My Subsidies" : "Tingnan ang Mga Subsidy",
                    closeLabel: en ? "Got it" : "Nakuha ko",
                }
            })
        }

        return (
            <div>
                <div className="ph"><h1>{en ? "Updates" : "Mga Update"}</h1>
                    <p>{en ? "Tap any item for details and actions" : "I-tap ang anumang item para sa detalye at aksyon"}</p>
                </div>
                <div className="pad">
                    {notifs.length === 0 ? (
                        <div className="empty">
                            <div className="empty-ico">🔔</div>
                            <div>{en ? "No updates yet." : "Wala pang update."}</div>
                        </div>
                    ) : notifs.map((n, i) => (
                        <div
                            className="notif"
                            key={i}
                            style={{cursor: n.modal ? "pointer" : "default"}}
                            onClick={() => n.modal && onOpenModal && onOpenModal(n.modal)}
                        >
                            <div className={`ndot ${n.type}`}/>
                            <div style={{flex: 1}}>
                                <div className="nmsg">{en ? n.msg_en : n.msg_fil}</div>
                                <div
                                    className="ntime">{n.time}{n.modal ? ` · ${en ? "tap for details" : "i-tap para sa detalye"}` : ""}</div>
                            </div>
                            {n.modal &&
                                <div style={{color: "var(--gold-dk)", fontSize: 16, alignSelf: "center"}}>›</div>}
                        </div>
                    ))}
                </div>
            </div>
        )
    }
