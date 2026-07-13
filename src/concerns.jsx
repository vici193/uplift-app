import { useState, useEffect } from "react"
import { supabase } from "./supabase"

export function ConcernsInline({ en, concerns, apps, driverId, showToast, refreshConcerns, showTutorial, tutStep, getHighlightStyle, GuideBox, onOpenThread }) {
    // const [expandedSub, setExpandedSub] = useState(null)
    useEffect(() => {
        if (sessionStorage.getItem("uplift_draft_show") === "true") {
            sessionStorage.removeItem("uplift_draft_show")
        }
    }, [])
    useEffect(() => {
        refreshConcerns()
        const interval = setInterval(() => {
            refreshConcerns()
        }, 10000)
        return () => clearInterval(interval)
    }, [])
    const [newConcernAppId, setNewConcernAppId] = useState(sessionStorage.getItem("uplift_draft_appid") || null)
    const [newConcernType, setNewConcernType] = useState(sessionStorage.getItem("uplift_draft_type") || "")
    const [newConcernMessage, setNewConcernMessage] = useState(sessionStorage.getItem("uplift_draft_message") || "")
    const [showNewForm, setShowNewForm] = useState(!!sessionStorage.getItem("uplift_draft_message") || sessionStorage.getItem("uplift_draft_show") === "true")

    // Auto-reveal the New Concern form while the tutorial is walking through its subfields
    useEffect(() => {
        if (showTutorial && tutStep >= 2) setShowNewForm(true)
    }, [showTutorial, tutStep])

    function getThreadMessages(concern) {
        const msgs = concern.is_draft || concern.status === "draft" ? [] : [
            { id: `opening-${concern.id}`, message: concern.message, sent_by: "driver", created_at: concern.created_at }
        ]
        const extra = (concern.grievance_messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        return [...msgs, ...extra]
    }

    function getLastMessage(concern) {
        const thread = getThreadMessages(concern)
        return thread.length > 0 ? thread[thread.length - 1] : null
    }

    async function markSeen(concern) {
        const last = getLastMessage(concern)
        if (last && last.sent_by === "admin" && !concern.driver_seen_reply) {
            await supabase.from("grievances").update({ driver_seen_reply: true }).eq("id", concern.id)
            await refreshConcerns()
        }
    }

    const [autoSaveTimer, setAutoSaveTimer] = useState(null)
    const [currentDraftId, setCurrentDraftId] = useState(sessionStorage.getItem("uplift_draft_id") || null)

    async function handleNewMessageChange(value) {
        setNewConcernMessage(value)
        sessionStorage.setItem("uplift_draft_message", value)
        if (autoSaveTimer) clearTimeout(autoSaveTimer)
        const timer = setTimeout(async () => {
            if (!value.trim()) {
                if (currentDraftId) {
                    await supabase.from("grievances").delete().eq("id", currentDraftId)
                    setCurrentDraftId(null)
                    sessionStorage.removeItem("uplift_draft_id")
                    await refreshConcerns()
                }
                return
            }
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
        const isAppHelp = newConcernType === "How to Use This App"
        if (!newConcernMessage.trim() || (!isAppHelp && !newConcernAppId)) {
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
        const last = getLastMessage(c)
        if (last && last.sent_by === "admin" && !c.driver_seen_reply) return (
            <span style={{ background: "var(--jade-bg)", color: "var(--jade)", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
            🔔 {en ? "New Update!" : "Bagong Update!"}
        </span>
        )
        if (last && last.sent_by === "admin") return (
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

            {Object.entries(grouped).map(([programName, items]) => {
                const renderCard = (c) => (
                    <div
                        key={c.id}
                        className="card"
                        style={{ marginBottom: 8, cursor: "pointer" }}
                        onClick={async () => {
                            onOpenThread(c.id)
                            await markSeen(c)
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{c.concern_type}</div>
                                <div style={{ fontSize: 11, color: "var(--slate)" }}>{new Date(c.created_at).toLocaleDateString()}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                {statusBadge(c)}
                                <span style={{ color: "var(--slate)" }}>›</span>
                            </div>
                        </div>
                    </div>
                )
                return (
                    <div key={programName} style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6 }}>
                            📋 {programName}
                        </div>
                        {items.map(renderCard)}
                    </div>
                )
            })}

            {showNewForm ? (
                <div className="card">
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                        {en ? "New Concern" : "Bagong Alalahanin"}
                    </div>
                    <div id="tut-step-2" className="fg" style={getHighlightStyle ? getHighlightStyle(2, 'white') : undefined}>
                        <label className="fl">{en ? "Type of Concern" : "Uri ng Alalahanin"}</label>
                        <select className="fsel" value={newConcernType} onChange={e => { setNewConcernType(e.target.value); sessionStorage.setItem("uplift_draft_type", e.target.value) }}>
                            <option value="">{en ? "Select..." : "Pumili..."}</option>
                            <option value="Application Issue">{en ? "Application Issue" : "Problema sa Aplikasyon"}</option>
                            <option value="Payout Issue">{en ? "Payout Issue" : "Problema sa Payout"}</option>
                            <option value="Eligibility Question">{en ? "Eligibility Question" : "Tanong sa Kwalipikasyon"}</option>
                            <option value="Document Concern">{en ? "Document Concern" : "Alalahanin sa Dokumento"}</option>
                            <option value="How to Use This App">{en ? "How to Use This App" : "Paano Gamitin ang App na Ito"}</option>
                            <option value="Other">{en ? "Other" : "Iba pa"}</option>
                        </select>
                    </div>
                    {GuideBox && <GuideBox stepIndex={2} />}
                    <div id="tut-step-3" className="fg" style={getHighlightStyle ? getHighlightStyle(3, 'white') : undefined}>
                        <label className="fl">{newConcernType === "How to Use This App" ? (en ? "Which subsidy is this about? (optional)" : "Tungkol saan itong subsidy? (opsyonal)") : (en ? "Which subsidy is this about? *" : "Tungkol saan itong subsidy? *")}</label>
                        <select className="fsel" value={newConcernAppId || ""} onChange={e => { setNewConcernAppId(e.target.value); sessionStorage.setItem("uplift_draft_appid", e.target.value) }}>
                            <option value="">{en ? "Select a subsidy..." : "Pumili ng subsidy..."}</option>
                            {apps.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.payout_events?.program_name} ({a.status})
                                </option>
                            ))}
                        </select>
                    </div>
                    {GuideBox && <GuideBox stepIndex={3} />}
                    <div id="tut-step-4" className="fg" style={getHighlightStyle ? getHighlightStyle(4, 'white') : undefined}>
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
                    {GuideBox && <GuideBox stepIndex={4} />}
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

export function ConcernThreadView({ en, concern, showToast, refreshConcerns, onBack }) {
    const [draftMessage, setDraftMessage] = useState(concern.draft_message || "")
    const [draftTimer, setDraftTimer] = useState(null)
    const [followUpText, setFollowUpText] = useState("")
    const [sendingFollowUp, setSendingFollowUp] = useState(false)

    function getThreadMessages(c) {
        const msgs = c.is_draft || c.status === "draft" ? [] : [
            { id: `opening-${c.id}`, message: c.message, sent_by: "driver", created_at: c.created_at }
        ]
        const extra = (c.grievance_messages || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        return [...msgs, ...extra]
    }

    function handleDraftChange(value) {
        setDraftMessage(value)
        if (draftTimer) clearTimeout(draftTimer)
        const timer = setTimeout(async () => {
            if (!value.trim()) {
                await supabase.from("grievances").delete().eq("id", concern.id)
                onBack()
                await refreshConcerns()
                return
            }
            await supabase.from("grievances").update({ draft_message: value }).eq("id", concern.id)
        }, 1500)
        setDraftTimer(timer)
    }

    async function submitConcern() {
        const message = draftMessage ?? concern.draft_message
        if (!message?.trim()) return
        await supabase.from("grievances").update({
            message: message,
            is_draft: false,
            status: "submitted",
        }).eq("id", concern.id)
        showToast(en ? "Concern submitted." : "Naisumite ang alalahanin.")
        await refreshConcerns()
    }

    async function sendFollowUp() {
        if (!followUpText.trim()) return
        setSendingFollowUp(true)
        await supabase.from("grievance_messages").insert({
            grievance_id: concern.id,
            message: followUpText,
            sent_by: "driver",
        })
        setFollowUpText("")
        setSendingFollowUp(false)
        await refreshConcerns()
    }

    const isDraft = concern.is_draft || concern.status === "draft"
    const programName = concern.applications?.payout_events?.program_name || (en ? "General Concern" : "Pangkalahatang Alalahanin")
    const thread = getThreadMessages(concern)

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span className="link" onClick={() => { onBack(); setFollowUpText("") }}>← {en ? "Back to My Concerns" : "Bumalik sa Aking mga Alalahanin"}</span>
            </div>
            <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>
                    📋 {programName}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <div style={{ fontSize: 12, color: "var(--slate)" }}>{concern.concern_type}</div>
                    {concern.is_grievance && (
                        <span style={{ background: "var(--brick-bg)", color: "var(--brick)", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>
                            ⚑ {en ? "Grievance" : "Reklamo"}
                        </span>
                    )}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                {thread.length === 0 && !isDraft && (
                    <div style={{ fontSize: 12, color: "var(--slate)", fontStyle: "italic" }}>
                        {en ? "No messages yet." : "Wala pang mensahe."}
                    </div>
                )}
                {thread.map(m => {
                    const isDriver = m.sent_by === "driver"
                    return (
                        <div key={m.id} style={{ alignSelf: isDriver ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                            <div style={{
                                background: isDriver ? "var(--navy)" : "var(--jade-bg)",
                                border: isDriver ? "none" : "1px solid var(--jade)",
                                color: isDriver ? "#fff" : "var(--navy)",
                                borderRadius: isDriver ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                padding: "10px 14px", fontSize: 13, lineHeight: 1.6
                            }}>
                                {m.message}
                            </div>
                            <div style={{ fontSize: 10, color: "var(--slate)", marginTop: 3, textAlign: isDriver ? "right" : "left" }}>
                                {isDriver ? (en ? "You" : "Ikaw") : `🏛️ ${en ? "Agency" : "Ahensya"}`} · {new Date(m.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </div>
                        </div>
                    )
                })}
                {!isDraft && thread.length > 0 && thread[thread.length - 1].sent_by === "driver" && (
                    <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
                        <div style={{ background: "var(--cream)", border: "1px solid var(--border)", color: "var(--slate)", borderRadius: "14px 14px 14px 4px", padding: "10px 14px", fontSize: 12, fontStyle: "italic" }}>
                            ⏳ {en ? "Waiting for the agency to respond..." : "Naghihintay ng tugon mula sa ahensya..."}
                        </div>
                    </div>
                )}
            </div>

            {/* Draft compose — only shown before the first submission */}
            {isDraft && (
                <div className="card">
                    <div style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, marginBottom: 8 }}>
                        📝 {en ? "This concern hasn't been sent yet. Finish writing it and submit when ready." : "Hindi pa naipapadala ito. Tapusin ang pagsulat at isumite kapag handa na."}
                    </div>
                    <textarea
                        className="fta"
                        value={draftMessage ?? concern.draft_message ?? ""}
                        onChange={e => handleDraftChange(e.target.value)}
                        placeholder={en ? "Your concern..." : "Ang iyong alalahanin..."}
                        style={{ minHeight: 90, marginBottom: 8 }}
                    />
                    <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 8 }}>
                        💾 {en ? "Auto-saving as you type..." : "Awtomatikong nini-save habang nagta-type..."}
                    </div>
                    <button className="btn navy" style={{ marginBottom: 0 }} onClick={submitConcern}>
                        {en ? "Send" : "Ipadala"}
                    </button>
                </div>
            )}

            {/* Follow-up composer — always available once the concern has been sent */}
            {!isDraft && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <textarea
                        className="fta"
                        value={followUpText}
                        onChange={e => setFollowUpText(e.target.value)}
                        placeholder={en ? "Write a follow-up message..." : "Magsulat ng follow-up na mensahe..."}
                        style={{ minHeight: 44, flex: 1, marginBottom: 0 }}
                    />
                    <button className="btn navy sm" style={{ width: "auto", marginBottom: 0, padding: "12px 18px" }} disabled={sendingFollowUp || !followUpText.trim()} onClick={sendFollowUp}>
                        {sendingFollowUp ? "..." : (en ? "Send" : "Ipadala")}
                    </button>
                </div>
            )}
        </div>
    )
}

export function MyConcernsPage({ en, concerns, apps, driverId, showToast, refreshConcerns, onNav, showTutorial, setShowTutorial }) {
    const [openThreadId, setOpenThreadId] = useState(null)
    const openThread = openThreadId ? concerns.find(c => c.id === openThreadId) : null

    // --- TUTORIAL LOGIC ---
    const [tutStep, setTutStep] = useState(0)

    useEffect(() => {
        if (showTutorial) document.body.classList.add('lock-scroll')
        else document.body.classList.remove('lock-scroll')
        return () => document.body.classList.remove('lock-scroll')
    }, [showTutorial])

    useEffect(() => {
        if (showTutorial) {
            const element = document.getElementById(`tut-step-${tutStep}`)
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [tutStep, showTutorial])

    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    const tutSteps = [
        {
            en: "This is where all your concerns and grievances live, grouped by subsidy. Tap any entry to see the full conversation and any reply from the agency.",
            fil: "Dito makikita ang lahat ng iyong alalahanin at reklamo, hinati-hati ayon sa subsidy. I-tap ang alinman para makita ang buong usapan at tugon ng ahensya."
        },
        {
            en: "Didn't find your concern above? Tap 'File a New Concern' at the bottom to send a new question directly to the agency.",
            fil: "Hindi mo nahanap ang alalahanin mo sa itaas? I-tap ang 'Mag-file ng Bagong Alalahanin' sa ibaba para magpadala ng bagong tanong sa ahensya."
        },
        {
            en: "Start by picking the Type of Concern that best matches your situation.",
            fil: "Magsimula sa pagpili ng Uri ng Alalahanin na pinakaakma sa iyong sitwasyon."
        },
        {
            en: "Then choose which subsidy this is about. This is optional if you're just asking how to use the app — otherwise it's required so the right agency can respond.",
            fil: "Pagkatapos, piliin kung aling subsidy ito tungkol. Opsyonal ito kung tanong lang tungkol sa paggamit ng app — kung hindi, kailangan ito para makasagot ang tamang ahensya."
        },
        {
            en: "Finally, describe your concern in the message box. Your draft is saved automatically as you type, so you won't lose your progress.",
            fil: "Panghuli, ilarawan ang iyong alalahanin sa message box. Awtomatikong na-save ang iyong draft habang nagta-type ka, kaya hindi mawawala ang iyong ginawa."
        }
    ]

    const getHighlightStyle = (stepIndex, bgType) => {
        if (showTutorial && tutStep === stepIndex) {
            return {
                position: "relative",
                zIndex: 1000,
                boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                background: bgType === 'navy' ? "var(--navy)" : "#fff",
                borderRadius: "var(--r)",
                transition: "all 0.3s ease"
            }
        }
        return { transition: "all 0.3s ease" }
    }

    // Renders the guide text + Skip/Next directly below whichever section is currently highlighted,
    // so it's always in the normal page flow and can never overlap or hide behind anything.
    function GuideBox({ stepIndex }) {
        if (!showTutorial || tutStep !== stepIndex) return null
        return (
            <div className="guide-box" style={{
                position: "relative", zIndex: 1000,
                background: "var(--navy)", borderRadius: "var(--r)", padding: "16px",
                margin: "10px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                pointerEvents: "auto"
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
                    💡 {en ? "My Concerns Guide" : "Gabay sa Aking mga Alalahanin"} ({tutStep + 1}/{tutSteps.length})
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
    // ----------------------

    // A specific concern is open — render ONLY the conversation view. No backdrop, no highlight,
    // no GuideBox exist anywhere in this branch, so the tutorial structurally cannot appear here.
    if (openThread) {
        return (
            <div>
                <div className="ph">
                    <h1>{en ? "My Concerns" : "Aking mga Alalahanin"}</h1>
                    <p>{en ? "All your concerns and grievances in one place" : "Lahat ng iyong mga alalahanin sa iisang lugar"}</p>
                </div>
                <div className="pad">
                    <span className="link" onClick={() => onNav("dashboard")}>← {en ? "Back to Home" : "Bumalik sa Home"}</span>
                    <div className="spacer" />
                    <ConcernThreadView en={en} concern={openThread} showToast={showToast} refreshConcerns={refreshConcerns} onBack={() => setOpenThreadId(null)} />
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* ── TUTORIAL BACKDROP (spotlight effect only — guide text renders inline below each section) ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

            <div id="tut-step-0" className="ph" style={getHighlightStyle(0, 'navy')}>
                <h1>{en ? "My Concerns" : "Aking mga Alalahanin"}</h1>
                <p>{en ? "All your concerns and grievances in one place" : "Lahat ng iyong mga alalahanin sa iisang lugar"}</p>
            </div>
            <GuideBox stepIndex={0} />
            <div className="pad">
                <span className="link" onClick={() => onNav("dashboard")}>← {en ? "Back to Home" : "Bumalik sa Home"}</span>
                <div className="spacer" />
                <div id="tut-step-1" style={getHighlightStyle(1, 'white')}>
                    <ConcernsInline en={en} concerns={concerns} apps={apps} driverId={driverId} showToast={showToast} refreshConcerns={refreshConcerns} showTutorial={showTutorial} tutStep={tutStep} getHighlightStyle={getHighlightStyle} GuideBox={GuideBox} onOpenThread={setOpenThreadId} />
                </div>
                <GuideBox stepIndex={1} />
            </div>
        </div>
    )
}

export function ConcernThread({concerns, en}) {
    if (!concerns || concerns.length === 0) return null
    return (
        <div style={{marginBottom: 16}}>
            <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--navy)",
                marginBottom: 8
            }}>
                💬 {en ? "Your previous messages on this topic:" : "Mga nakaraang mensahe mo sa paksang ito:"}
            </div>
            {concerns.map(c => (
                <div key={c.id} style={{marginBottom: 10}}>
                    <div style={{
                        background: "var(--cream)",
                        borderRadius: "var(--r-sm)",
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "var(--navy)"
                    }}>
                        <div style={{fontSize: 11, color: "var(--slate)", marginBottom: 4}}>
                            {c.is_draft || c.status === "draft"
                                ? <span style={{
                                    color: "var(--amber)",
                                    fontWeight: 600
                                }}>📝 {en ? "Draft" : "Draft"}</span>
                                : <span
                                    style={{color: "var(--slate)"}}>{en ? "You" : "Ikaw"} · {new Date(c.created_at).toLocaleDateString()}</span>
                            }
                        </div>
                        {c.message}
                    </div>
                    {c.admin_reply && (
                        <div style={{
                            background: "var(--jade-bg)",
                            border: "1px solid var(--jade)",
                            borderRadius: "var(--r-sm)",
                            padding: "10px 12px",
                            fontSize: 13,
                            color: "var(--navy)",
                            marginTop: 4
                        }}>
                            <div style={{fontSize: 11, color: "var(--jade)", fontWeight: 700, marginBottom: 4}}>
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
