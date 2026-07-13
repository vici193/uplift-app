import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import { Pill } from "./ui.jsx"
import { ConcernThread } from "./concerns.jsx"
import { PH_CITIES_BY_PROVINCE, PH_PROVINCES_BY_REGION, PH_REGIONS } from "./shared.js"

export function HelpCenter({en, apps, driverId, showToast, onNav, preselectedAppId, showTutorial, setShowTutorial}) {
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

    // --- TUTORIAL LOGIC (covers the app-picker screen, then continues into the per-subsidy category screen) ---
    const [tutStep, setTutStep] = useState(0)

    useEffect(() => {
        if (showTutorial) document.body.classList.add('lock-scroll')
        else document.body.classList.remove('lock-scroll')
        return () => document.body.classList.remove('lock-scroll')
    }, [showTutorial])

    useEffect(() => {
        if (showTutorial) {
            const element = document.getElementById(`tut-step-${tutStep}`)
            if (element) element.scrollIntoView({behavior: 'smooth', block: 'center'})
        }
    }, [tutStep, showTutorial])

    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    // Restart the guide at step 0 whenever we move from the app-picker into the category screen
    useEffect(() => {
        if (showTutorial) setTutStep(0)
    }, [selectedApp])

    // Close the tutorial automatically once the driver picks a category and moves deeper into the flow
    useEffect(() => {
        if (category && showTutorial) setShowTutorial(false)
    }, [category])

    const landingTutSteps = [
        {
            en: "Welcome to the Help Center. Pick which subsidy application your question is about to get started.",
            fil: "Maligayang pagdating sa Help Center. Piliin kung aling aplikasyon ng subsidy ang tungkol sa iyong tanong para magsimula."
        },
        {
            en: "Already sent a concern before? Tap 'My Concerns' to see all your past questions and their replies in one place.",
            fil: "May naipadala ka na bang alalahanin dati? I-tap ang 'My Concerns' para makita ang lahat ng dati mong tanong at ang mga tugon dito."
        }
    ]

    const isRejected = selectedApp?.status === "rejected"

    const categoryTutSteps = isRejected ? [
        {
            en: "This shows which subsidy application your question will be about.",
            fil: "Ipinapakita nito kung aling aplikasyon ng subsidy ang tungkol sa iyong tanong."
        },
        {
            en: "Pick the topic that best matches your question — each one leads to a quick, specific answer.",
            fil: "Piliin ang paksang pinakaakma sa iyong tanong — bawat isa ay may mabilis at tiyak na sagot."
        },
        {
            en: "Since this application was rejected, you also have the option to file a grievance if you disagree with the decision — this escalates it directly to the agency.",
            fil: "Dahil natanggihan ang aplikasyong ito, mayroon ka ring option na mag-file ng reklamo kung hindi ka sang-ayon sa desisyon — direkta itong iesescalate sa ahensya."
        }
    ] : [
        {
            en: "This shows which subsidy application your question will be about.",
            fil: "Ipinapakita nito kung aling aplikasyon ng subsidy ang tungkol sa iyong tanong."
        },
        {
            en: "Pick the topic that best matches your question — each one leads to a quick, specific answer. Since this application is still pending or was approved, filing a grievance isn't available here; that option only appears for rejected applications.",
            fil: "Piliin ang paksang pinakaakma sa iyong tanong — bawat isa ay may mabilis at tiyak na sagot. Dahil naka-pending pa o naaprubahan na ang aplikasyong ito, hindi available dito ang pag-file ng reklamo; lalabas lang ang option na iyon para sa mga natanggihang aplikasyon."
        }
    ]

    const tutSteps = selectedApp ? categoryTutSteps : landingTutSteps

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
        return {transition: "all 0.3s ease"}
    }

    // Renders the guide text + Skip/Next directly below whichever section is currently highlighted,
    // so it's always in the normal page flow and can never overlap or hide behind anything.
    function GuideBox({stepIndex}) {
        if (!showTutorial || tutStep !== stepIndex) return null
        return (
            <div className="guide-box" style={{
                position: "relative", zIndex: 1000,
                background: "var(--navy)", borderRadius: "var(--r)", padding: "16px",
                margin: "10px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                pointerEvents: "auto"
            }}>
                <div style={{fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6}}>
                    💡 {en ? "Help Center Guide" : "Gabay sa Help Center"} ({tutStep + 1}/{tutSteps.length})
                </div>
                <div style={{fontSize: 13, color: "#fff", marginBottom: 14, lineHeight: 1.6}}>
                    {en ? tutSteps[tutStep].en : tutSteps[tutStep].fil}
                </div>
                <div style={{display: "flex", gap: 8, justifyContent: "flex-end"}}>
                    <button className="btn outline sm" style={{
                        margin: 0,
                        background: "transparent",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.4)"
                    }} onClick={() => setShowTutorial(false)}>
                        {en ? "Skip" : "Laktawan"}
                    </button>
                    <button className="btn gold sm" style={{margin: 0}} onClick={() => {
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

    function getBusinessDaysStr(fromDate) {
        const base = new Date(fromDate)
        const d5 = new Date(base);
        d5.setDate(d5.getDate() + 5)
        const d7 = new Date(base);
        d7.setDate(d7.getDate() + 7)
        const opts = {month: 'short', day: 'numeric'}
        return `${d5.toLocaleDateString('en-US', opts)} – ${d7.toLocaleDateString('en-US', opts)}`
    }

    const categories = [
        {key: "timing", label: en ? "When will I receive my subsidy?" : "Kailan ko matatanggap ang subsidy?"},
        {
            key: "change",
            label: en ? "I'd like to change something about my application" : "Gusto kong baguhin ang aking aplikasyon"
        },
        {
            key: "amount",
            label: en ? "I have a concern about the amount or eligibility" : "May alalahanin ako sa halaga o pagiging kwalipikado"
        },
        {key: "venue", label: en ? "Issue at the payout venue" : "Problema sa venue ng payout"},
        {key: "feedback", label: en ? "General feedback" : "Pangkalahatang puna"},
        ...(selectedApp?.status === "rejected" ? [{
            key: "grievance",
            label: en ? "File a Grievance" : "Mag-file ng Reklamo"
        }] : []),
    ]

    const subQuestions = {
        change: [
            {
                key: "wrong_personal",
                label: en ? "Wrong personal information (name, birthdate, etc.)" : "Maling personal na impormasyon"
            },
            {
                key: "wrong_vehicle",
                label: en ? "Wrong vehicle or license details" : "Maling detalye ng sasakyan o lisensya"
            },
            {
                key: "wrong_contact",
                label: en ? "Wrong e-wallet or contact number" : "Maling e-wallet o numero ng kontak"
            },
            {key: "other_correction", label: en ? "Other correction" : "Ibang pagwawasto"},
        ],
        amount: [
            {
                key: "wrong_amount",
                label: en ? "I think the subsidy amount is incorrect" : "Mali ang halaga ng subsidy"
            },
            {
                key: "not_eligible",
                label: en ? "I was told I'm not eligible — why?" : "Sinabihan akong hindi kwalipikado — bakit?"
            },
        ],
        venue: [
            {key: "venue_closed", label: en ? "The venue was closed or moved" : "Sarado o lumipat ang venue"},
            {
                key: "long_line",
                label: en ? "Long lines or no slots left when I arrived" : "Mahabang pila o walang naiwan na slot"
            },
            {
                key: "rider_issue",
                label: en ? "Issue with the officer or process at the venue" : "Problema sa opisyal o proseso sa venue"
            },
        ],
        feedback: [
            {key: "other_feedback", label: en ? "Other" : "Iba pa"},
        ],
        grievance: [
            {
                key: "griev_wrong_info",
                label: en ? "My information was incorrectly flagged" : "Mali ang na-flag na impormasyon ko"
            },
            {
                key: "griev_unfair",
                label: en ? "I believe the rejection was unfair" : "Sa palagay ko ay hindi patas ang pagtanggi"
            },
            {
                key: "griev_missing_docs",
                label: en ? "My documents were not properly reviewed" : "Hindi maayos na nasuri ang aking mga dokumento"
            },
            {key: "griev_other", label: en ? "Other grievance" : "Ibang reklamo"},
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
        const {data} = await supabase
            .from("grievances")
            .select("*")
            .eq("driver_id", driverId)
            .eq("application_id", appId)
            .eq("concern_type", concernType)
            .order("created_at", {ascending: true})
        setConcerns(data || [])
        setLoadingConcerns(false)
        if (data) {
            for (const c of data) {
                if (c.admin_reply && !c.driver_seen_reply) {
                    await supabase.from("grievances").update({driver_seen_reply: true}).eq("id", c.id)
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
                await supabase.from("grievances").update({
                    draft_message: value,
                    message: value
                }).eq("id", currentDraftId)
            } else {
                const {data} = await supabase.from("grievances").insert({
                    driver_id: driverId,
                    application_id: selectedApp.id,
                    concern_type: concernType,
                    message: value,
                    draft_message: value,
                    is_draft: true,
                    status: "draft",
                    is_grievance: category?.key === "grievance",
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
            await supabase.from("grievances").update({
                message: escalateMessage,
                is_draft: false,
                status: "submitted"
            }).eq("id", currentDraftId)
        } else {
            await supabase.from("grievances").insert({
                driver_id: driverId,
                application_id: selectedApp?.id || null,
                concern_type: concernType,
                message: escalateMessage,
                is_draft: false,
                status: "submitted",
                is_grievance: category?.key === "grievance",
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
    // ── Picking which application this is about ──
    if (!selectedApp) {
        return (
            <div>
                {/* ── TUTORIAL BACKDROP (spotlight effect only — guide text renders inline below each section) ── */}
                {showTutorial && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                        zIndex: 999
                    }}/>
                )}

                <div className="ph">
                    <h1>{en ? "Help Center" : "Help Center"}</h1>
                    <p>{en ? "Select a subsidy application to get help with" : "Pumili ng aplikasyon na nais mong tulungan"}</p>
                </div>
                <div className="pad">
                        <span className="link"
                              onClick={() => onNav("dashboard")}>← {en ? "Back to Home" : "Bumalik sa Home"}</span>
                    <div className="spacer"/>
                    <div id="tut-step-1" style={getHighlightStyle(1, 'white')}>
                        <button className="btn outline" onClick={() => onNav("myconcerns")}>
                            📋 {en ? "My Concerns" : "Aking mga Alalahanin"}
                        </button>
                    </div>
                    <GuideBox stepIndex={1}/>
                    <div className="spacer"/>
                    <div id="tut-step-0" style={getHighlightStyle(0, 'white')}>
                        {apps.length === 0 ? (
                            <div className="empty">
                                <div className="empty-ico">💬</div>
                                <div>{en ? "You have no applications yet." : "Wala ka pang aplikasyon."}</div>
                            </div>
                        ) : apps.map(a => (
                            <div className="card" key={a.id} style={{cursor: "pointer"}}
                                 onClick={() => setSelectedApp(a)}>
                                <div className="card-top">
                                    <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
                                    <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
                                </div>
                                <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
                                <div className="card-footer">
                                    <Pill status={a.status} en={en}/>
                                    <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <GuideBox stepIndex={0}/>
                </div>
            </div>
        )
    }

    // ── Context header, like Foodpanda's order card ──
    const ContextHeader = () => (
        <div className="card" style={{background: "var(--cream)"}}>
            <div className="card-top">
                <div className="card-name">{selectedApp.payout_events?.program_name}</div>
                <Pill status={selectedApp.status} en={en}/>
            </div>
            <div className="card-agency">{selectedApp.payout_events?.program_agency}</div>
            <div style={{fontSize: 11, color: "var(--slate)"}}>
                {en ? "Applied:" : "Inapply:"} {new Date(selectedApp.applied_at).toLocaleDateString()}
            </div>
        </div>
    )
    // ── Category list ──
    if (!category) {
        return (
            <div>
                {/* ── TUTORIAL BACKDROP ── */}
                {showTutorial && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                        zIndex: 999
                    }}/>
                )}

                <div className="ph">
                    <h1>{en ? "Help Center" : "Help Center"}</h1>
                    <p>{en ? "What do you need help with?" : "Saan ka kailangan ng tulong?"}</p>
                </div>
                <div className="pad">
                        <span className="link"
                              onClick={() => setSelectedApp(null)}>← {en ? "Choose a different application" : "Pumili ng ibang aplikasyon"}</span>
                    <div className="spacer"/>
                    <div id="tut-step-0" style={getHighlightStyle(0, 'white')}>
                        <ContextHeader/>
                    </div>
                    <GuideBox stepIndex={0}/>
                    <div className="spacer"/>
                    <div id="tut-step-1" style={getHighlightStyle(1, 'white')}>
                        {categories.filter(c => c.key !== "grievance").map(c => (
                            <div
                                key={c.key}
                                className="arow"
                                style={{cursor: "pointer"}}
                                onClick={() => {
                                    if (c.key === "timing") {
                                        setCategory(c);
                                        setSubQuestion({key: "timing_answer", label: c.label});
                                        loadConcerns(selectedApp.id, c.label)
                                    } else {
                                        setCategory(c);
                                    }
                                }}
                            >
                                <div className="arow-name">
                                    {c.label}
                                </div>
                                <div style={{color: "var(--slate)"}}>›</div>
                            </div>
                        ))}
                    </div>
                    <GuideBox stepIndex={1}/>
                    <div id="tut-step-2" style={getHighlightStyle(2, 'white')}>
                        {categories.filter(c => c.key === "grievance").map(c => (
                            <div
                                key={c.key}
                                className="arow"
                                style={{
                                    cursor: "pointer",
                                    borderLeft: "3px solid var(--brick)",
                                    background: "var(--brick-bg)"
                                }}
                                onClick={() => {
                                    setCategory(c);
                                    loadConcerns(selectedApp.id, c.label)
                                }}
                            >
                                <div className="arow-name" style={{color: "var(--brick)"}}>
                                    ⚑ {c.label}
                                </div>
                                <div style={{color: "var(--slate)"}}>›</div>
                            </div>
                        ))}
                    </div>
                    <GuideBox stepIndex={2}/>
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
                        <span className="link" onClick={() => {
                            setCategory(null);
                            setSubQuestion(null);
                            setEscalateMessage("");
                            sessionStorage.removeItem("uplift_help_draft")
                        }}>← {en ? "Back" : "Bumalik"}</span>
                    <div className="spacer"/>
                    <button className="btn outline" onClick={() => onNav("myconcerns")}>
                        📋 {en ? "My Concerns" : "Aking mga Alalahanin"}
                    </button>
                    <div className="spacer"/>
                    <ContextHeader/>
                    <div className="spacer"/>
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
                    <div className="spacer"/>
                    <ConcernThread concerns={concerns} en={en}/>
                    <div className="griev">
                        <div
                            className="griev-title">{en ? "Send a message to the agency" : "Magpadala ng mensahe sa ahensya"}</div>
                        <div
                            className="griev-sub">{en ? "Still need help? Describe your concern and we will forward it to the agency." : "Kailangan pa ng tulong? Ilarawan ang iyong alalahanin at ipapasa namin ito sa ahensya."}</div>
                        <textarea className="fta"
                                  placeholder={en ? "Describe your concern about timing..." : "Ilarawan ang iyong alalahanin..."}
                                  value={escalateMessage} onChange={e => handleMessageChange(e.target.value)}/>
                        {escalateMessage.trim() && <div style={{
                            fontSize: 11,
                            color: "var(--slate)",
                            marginBottom: 6
                        }}>💾 {en ? "Auto-saving draft..." : "Awtomatikong nini-save..."}</div>}
                        <button className="btn navy" disabled={submitting}
                                onClick={submitConcernFromHelp}>{submitting ? "..." : (en ? "Submit" : "Isumite")}</button>
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
                    <div className="spacer"/>
                    <button className="btn outline" onClick={() => onNav("myconcerns")}>
                        📋 {en ? "My Concerns" : "Aking mga Alalahanin"}
                    </button>
                    <div className="spacer"/>
                    {(subQuestions[category.key] || []).map(sq => (
                        <div key={sq.key} className="arow" style={{cursor: "pointer"}} onClick={() => {
                            setSubQuestion(sq);
                            loadConcerns(selectedApp.id, sq.label)
                        }}>
                            <div className="arow-name">{sq.label}</div>
                            <div style={{color: "var(--slate)"}}>›</div>
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
                <div className="spacer"/>
                <ContextHeader/>
                <div className="spacer"/>

                {isProfileFix && (
                    <div className="alert jade">
                        ✏️ {en
                        ? "You can correct this directly from your profile. Go to Edit My Information, make the correction, and save."
                        : "Maaari mong itama ito direkta mula sa iyong profile. Pumunta sa Edit My Information, itama, at i-save."}
                    </div>
                )}
                {isProfileFix && (
                    <button className="btn gold"
                            onClick={() => onNav("editprofile")}>{en ? "Go to Edit My Information" : "Pumunta sa Edit My Information"}</button>
                )}

                {!isProfileFix && (
                    <>
                        <ConcernThread concerns={concerns} en={en}/>
                        <div className="griev">
                            <div className="griev-title">{en ? "Tell us more" : "Sabihin sa amin"}</div>
                            <div
                                className="griev-sub">{en ? "We will forward this to the concerned agency." : "Ipapasa namin ito sa ahensya."}</div>
                            <textarea className="fta"
                                      placeholder={en ? "Describe your concern..." : "Ilarawan ang alalahanin..."}
                                      value={escalateMessage} onChange={e => handleMessageChange(e.target.value)}/>
                            {escalateMessage.trim() && <div style={{
                                fontSize: 11,
                                color: "var(--slate)",
                                marginBottom: 6
                            }}>💾 {en ? "Auto-saving draft..." : "Awtomatikong nini-save..."}</div>}
                            <button className="btn navy" disabled={submitting}
                                    onClick={submitConcernFromHelp}>{submitting ? "..." : (en ? "Submit" : "Isumite")}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export function EditProfile({ en, driverId, driver, showToast, onDone, showTutorial, setShowTutorial }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [noMiddle, setNoMiddle] = useState(driver.middle_name === "N/A")
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

    // --- TUTORIAL LOGIC ---
    const [tutStep, setTutStep] = useState(0)

    useEffect(() => {
        if (showTutorial) document.body.classList.add('lock-scroll');
        else document.body.classList.remove('lock-scroll');
        return () => document.body.classList.remove('lock-scroll');
    }, [showTutorial]);

    useEffect(() => {
        if (showTutorial) {
            const element = document.getElementById(`tut-step-${tutStep}`);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [tutStep, showTutorial]);

    useEffect(() => { if (!showTutorial) setTutStep(0) }, [showTutorial])

    const tutSteps = [
        { en: "Welcome to your Profile. Here you can update your information at any time.", fil: "Maligayang pagdating sa iyong Profile. Dito mo maaaring i-update ang iyong impormasyon anumang oras." },
        { en: "Ensure your Personal Information matches your Driver's License exactly.", fil: "Siguraduhing eksaktong tugma ang Personal na Impormasyon sa iyong Driver's License." },
        { en: "Keep your Address up to date.", fil: "Panatilihing updated ang iyong Tirahan." },
        { en: "Verify your Vehicle and Franchise details.", fil: "I-verify ang detalye ng Sasakyan at Pransisa." },
        { en: "Double-check your E-wallet details.", fil: "I-double-check ang detalye ng iyong E-wallet." },
        { en: "Once done, click 'Save Changes'.", fil: "Kapag tapos ka na, i-click ang 'I-save ang mga Pagbabago'." }
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
                // Fix: Using undefined instead of 0 prevents overwriting the default .ph padding!
                padding: bgType === 'white' ? 12 : undefined,
                margin: bgType === 'white' ? -12 : undefined,
                transition: "all 0.3s ease"
            }
        }
        return { transition: "all 0.3s ease" }
    }

    function GuideBox({ stepIndex }) {
        if (!showTutorial || tutStep !== stepIndex) return null
        return (
            <div className="guide-box" style={{ position: "relative", zIndex: 1000, background: "var(--navy)", borderRadius: "var(--r)", padding: "16px", margin: "10px 0 20px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", pointerEvents: "auto", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>💡 {tutStep + 1}/{tutSteps.length}</div>
                <div style={{ fontSize: 13, color: "#fff", marginBottom: 14, lineHeight: 1.6 }}>{en ? tutSteps[tutStep].en : tutSteps[tutStep].fil}</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn outline sm" style={{ background: "transparent", color: "#fff" }} onClick={() => setShowTutorial(false)}>{en ? "Skip" : "Laktawan"}</button>
                    <button className="btn gold sm" onClick={() => tutStep < tutSteps.length - 1 ? setTutStep(t => t + 1) : setShowTutorial(false)}>{tutStep < tutSteps.length - 1 ? (en ? "Next" : "Susunod") : (en ? "Finish" : "Tapusin")}</button>
                </div>
            </div>
        )
    }

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
        showToast(wasRejected ? (en ? "Profile updated. Resubmitted for verification." : "Na-update ang profile.") : (en ? "Profile updated successfully." : "Matagumpay na na-update ang profile."))
        onDone()
    }

    return (
        <div>
            {showTutorial && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)', zIndex: 999 }} />}

            <div id="tut-step-0" className="ph" style={getHighlightStyle(0, 'navy')}>
                <h1>{en ? "Edit My Information" : "I-edit ang Aking Impormasyon"}</h1>
                <p>{en ? "Update your details anytime." : "I-update ang iyong mga detalye anumang oras."}</p>
            </div>
            <GuideBox stepIndex={0} />

            <div className="pad">
                <form onSubmit={handleSave}>
                    <div id="tut-step-1" style={getHighlightStyle(1, 'white')}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>{en ? "Personal Information" : "Personal na Impormasyon"}</div>
                        <div className="fg"><label className="fl">{en ? "Last Name" : "Apelyido"}</label><input className="fi" value={form.last_name} onChange={e => set("last_name", e.target.value)} /></div>
                        <div className="fg"><label className="fl">{en ? "First Name" : "Pangalan"}</label><input className="fi" value={form.first_name} onChange={e => set("first_name", e.target.value)} /></div>
                        <div className="fg">
                            <label className="fl">{en ? "Middle Name" : "Gitnang Pangalan"}</label>
                            <input className="fi" value={noMiddle ? "" : form.middle_name} onChange={e => set("middle_name", e.target.value)} disabled={noMiddle} style={{ opacity: noMiddle ? 0.4 : 1 }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <input type="checkbox" id="edit-nomiddle" checked={noMiddle} onChange={e => setNoMiddle(e.target.checked)} style={{ cursor: "pointer" }} />
                                <label htmlFor="edit-nomiddle" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>{en ? "I have no middle name" : "Wala akong gitnang pangalan"}</label>
                            </div>
                        </div>
                        <div className="fg"><label className="fl">{en ? "Extension Name" : "Extension Name"}</label><input className="fi" value={form.extension_name} onChange={e => set("extension_name", e.target.value)} /></div>
                        <div className="fg">
                            <label className="fl">{en ? "Sex" : "Kasarian"}</label>
                            <select className="fsel" value={form.sex} onChange={e => set("sex", e.target.value)}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                <option>Male</option><option>Female</option><option>Others</option>
                            </select>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>{en ? "Date of Birth" : "Petsa ng Kapanganakan"}</div>
                        <div className="two-col">
                            <div className="fg"><label className="fl">{en ? "Month" : "Buwan"}</label><select className="fsel" value={form.birth_month} onChange={e => set("birth_month", e.target.value)}>{months.map(m => <option key={m}>{m}</option>)}</select></div>
                            <div className="fg"><label className="fl">{en ? "Day" : "Araw"}</label><select className="fsel" value={form.birth_day} onChange={e => set("birth_day", e.target.value)}>{days.map(d => <option key={d}>{d}</option>)}</select></div>
                        </div>
                        <div className="fg"><label className="fl">{en ? "Year (YYYY)" : "Taon (YYYY)"}</label><input className="fi" value={form.birth_year} onChange={e => set("birth_year", e.target.value)} maxLength={4} /></div>
                    </div>
                    <GuideBox stepIndex={1} />

                    <div style={{ marginTop: 16 }}>
                        <div id="tut-step-2" style={getHighlightStyle(2, 'white')}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>{en ? "Address" : "Tirahan"}</div>
                            <div className="fg"><label className="fl">Region</label>
                                <select className="fsel" value={form.region} onChange={e => {
                                    set("region", e.target.value); set("province", ""); set("city", "")
                                }}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    {PH_REGIONS.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="fg"><label className="fl">Province</label>
                                <select className="fsel" value={form.province} disabled={!form.region} onChange={e => {
                                    set("province", e.target.value); set("city", "")
                                }}>
                                    <option value="">{form.region ? (en ? "Select..." : "Pumili...") : (en ? "Select a region first" : "Pumili muna ng rehiyon")}</option>
                                    {(form.region ? (PH_PROVINCES_BY_REGION[form.region] || []) : []).map(p => <option key={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="fg"><label className="fl">{en ? "City / Municipality" : "Lungsod / Munisipyo"}</label>
                                <select className="fsel" value={form.city} disabled={!form.province} onChange={e => set("city", e.target.value)}>
                                    <option value="">{form.province ? (en ? "Select..." : "Pumili...") : (en ? "Select a province first" : "Pumili muna ng probinsya")}</option>
                                    {(form.province ? (PH_CITIES_BY_PROVINCE[form.province] || []) : []).map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="fg"><label className="fl">Barangay</label><input className="fi" value={form.barangay} onChange={e => set("barangay", e.target.value)} /></div>
                        </div>
                        <GuideBox stepIndex={2} />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div id="tut-step-3" style={getHighlightStyle(3, 'white')}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>{en ? "Vehicle and Franchise" : "Sasakyan at Pransisa"}</div>
                            <div className="fg"><label className="fl">{en ? "Denomination" : "Uri ng Sasakyan"}</label><select className="fsel" value={form.denomination} onChange={e => set("denomination", e.target.value)}>{denominations.map(d => <option key={d}>{d}</option>)}</select></div>
                            <div className="fg"><label className="fl">Case Number</label><input className="fi" value={form.case_number} onChange={e => set("case_number", e.target.value)} /></div>
                            <div className="fg"><label className="fl">Operator's Name</label><input className="fi" value={form.operator_name} onChange={e => set("operator_name", e.target.value)} /></div>
                            <div className="fg"><label className="fl">Plate Number</label><input className="fi" value={form.plate_number} onChange={e => set("plate_number", e.target.value)} /></div>
                            <div className="fg"><label className="fl">Chassis Number</label><input className="fi" value={form.chassis_number} onChange={e => set("chassis_number", e.target.value)} /></div>
                            <div className="fg"><label className="fl">License Number</label><input className="fi" value={form.license_number} onChange={e => set("license_number", e.target.value)} /></div>
                        </div>
                        <GuideBox stepIndex={3} />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div id="tut-step-4" style={getHighlightStyle(4, 'white')}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10 }}>E-wallet</div>
                            <div className="fg"><label className="fl">{en ? "Type" : "Uri"}</label><select className="fsel" value={form.ewallet_type} onChange={e => set("ewallet_type", e.target.value)}><option>GCash</option><option>PayMaya</option></select></div>
                            <div className="fg"><label className="fl">{en ? "Number" : "Numero"}</label><input className="fi" value={form.ewallet_number} onChange={e => set("ewallet_number", e.target.value)} /></div>
                            <div className="fg"><label className="fl">{en ? "Number" : "Numero"}</label><input className="fi" value={form.ewallet_number} onChange={e => set("ewallet_number", e.target.value)} /></div>
                        </div>
                        <GuideBox stepIndex={4} />
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div id="tut-step-5" style={getHighlightStyle(5, 'white')}>
                            <button className="btn gold" type="submit" disabled={loading} style={{ pointerEvents: 'auto' }}>{loading ? "..." : (en ? "Save Changes" : "I-save")}</button>
                        </div>
                        <GuideBox stepIndex={5} />
                    </div>
                </form>
            </div>
        </div>
    )
}
