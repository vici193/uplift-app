import { useState, useEffect, Fragment } from "react"
import { supabase } from "./supabase"
import { AppointmentDetail } from "./dashboard.jsx"
import { Pill } from "./ui.jsx"
import { dlCodeHint, formatCaseNumber, formatLicenseNumber, formatMobileDisplay, formatPlateNumber, licenseNumberPlaceholder, toProperCase, toProperCaseKeepAcronyms } from "./shared.js"

export function Subsidies({ en, onNav, apps, allAppointments, driverId, showToast, refreshApps, preselectedAppId, showTutorial, setShowTutorial }) {
    const [detailApp, setDetailApp] = useState(null)
    const [tutStep, setTutStep] = useState(0)

    useEffect(() => {
        if (showTutorial) document.body.classList.add('lock-scroll');
        else document.body.classList.remove('lock-scroll');
        return () => document.body.classList.remove('lock-scroll');
    }, [showTutorial]);

    useEffect(() => {
        if (showTutorial) {
            const element = document.getElementById(`tut-step-${tutStep}`);
            if (element) {
                element.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
        }
    }, [tutStep, showTutorial]);

    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    const mockApps = [
        {
            id: 'mock-1',
            payout_events: {
                program_name: "Fuel Subsidy Tranche 1",
                program_amount: "5000",
                program_agency: "LTFRB",
                venue: "Quezon City Hall",
                event_date: "2026-08-15"
            },
            status: "approved",
            applied_at: "2026-07-01",
            application_messages: []
        },
        {
            id: 'mock-new-msg',
            payout_events: {
                program_name: "Education Subsidy",
                program_amount: "3000",
                program_agency: "CHED",
                venue: "Online",
                event_date: "2026-08-30"
            },
            status: "pending",
            applied_at: "2026-07-10",
            application_messages: [{id: "msg1", message: "Please update your ID.", created_at: "2026-07-11"}],
            driver_seen_latest: false
        },
        {
            id: 'mock-2',
            payout_events: {
                program_name: "Tricycle Operator Aid",
                program_amount: "2000",
                program_agency: "LGU",
                venue: "Brgy. Covered Court",
                event_date: "2026-08-20"
            },
            status: "pending",
            applied_at: "2026-07-05",
            application_messages: []
        },
        {
            id: 'mock-3',
            payout_events: {
                program_name: "Transport Relief Fund",
                program_amount: "1000",
                program_agency: "DOTr",
                venue: "SM North EDSA",
                event_date: "2026-08-25"
            },
            status: "rejected",
            applied_at: "2026-07-08",
            application_messages: []
        }
    ]

    const tutSteps = [
        {
            en: "This page contains the complete history of all your subsidy applications and their current status.",
            fil: "Ang pahinang ito ay naglalaman ng kumpletong kasaysayan ng lahat ng iyong mga aplikasyon at ang kanilang kasalukuyang katayuan."
        },
        {
            en: "This is an example of an Approved application. It will show a green pill. Click on it to view your appointment details and QR code.",
            fil: "Ito ay halimbawa ng naaprubahang aplikasyon. Mayroon itong kulay berdeng pill. I-click ito para makita ang detalye ng appointment at QR code."
        },
        {
            en: "If the agency sends you a message, a 'New Response!' badge appears. Click the card to read the instructions or reply to them.",
            fil: "Kapag nagpadala ng mensahe ang ahensya, lalabas ang 'Bagong Tugon!' badge. I-click ang card para basahin at sagutin ito."
        },
        {
            en: "A Pending application means the agency is still reviewing your documents. Check back later for updates.",
            fil: "Ang nakabinbing aplikasyon ay nangangahulugang sinusuri pa ng ahensya ang iyong mga dokumento. Balikan ito mamaya para sa mga update."
        },
        {
            en: "A Rejected application will show a red pill. Click on it to read the agency's feedback so you can correct your details and reapply.",
            fil: "Ang tinanggihang aplikasyon ay may pulang pill. I-click ito upang mabasa ang mensahe ng ahensya nang maitama mo ang iyong detalye at makapag-apply muli."
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
                transition: "all 0.3s ease",
            }
        }
        return {transition: "all 0.3s ease"}
    }

    function GuideBox({stepIndex}) {
        if (!showTutorial || tutStep !== stepIndex) return null
        return (
            <div className="guide-box" style={{
                position: "relative", zIndex: 1000,
                background: "var(--navy)", borderRadius: "var(--r)", padding: "16px",
                margin: "10px 0 20px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                pointerEvents: "auto",
                border: "1px solid rgba(255,255,255,0.1)"
            }}>
                <div style={{fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6}}>
                    💡 {tutStep + 1}/{tutSteps.length}
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

    // Handles direct link from Notification Bell OR Dashboard
    useEffect(() => {
        if (preselectedAppId && apps.length > 0) {
            const targetApp = apps.find(a => a.id === preselectedAppId)
            if (targetApp) {
                setDetailApp(targetApp)
                onNav("subsidies", null)

                // Guaranteed to mark as read even if they didn't click the card
                const hasNewMessage = targetApp.application_messages?.length > 0 && !targetApp.driver_seen_latest;
                if (hasNewMessage) {
                    supabase.from("applications")
                        .update({ driver_seen_latest: true })
                        .eq("id", targetApp.id)
                        .then(() => {
                            setTimeout(() => {
                                if (refreshApps) refreshApps();
                            }, 500);
                        });
                }
            }
        }
    }, [preselectedAppId, apps])

    useEffect(() => {
        refreshApps()
        const interval = setInterval(() => {
            refreshApps()
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (detailApp && showTutorial) {
            setShowTutorial(false);
            showToast(en ? "Tutorial is only available on the main Subsidies list." : "Available lang ang tutorial sa pangunahing listahan ng Subsidies.");
        }
    }, [detailApp, showTutorial]);

    if (detailApp) {
        return (
            <AppointmentDetail
                en={en}
                app={detailApp}
                allAppointments={allAppointments}
                driverId={driverId}
                showToast={showToast}
                refreshApps={refreshApps}
                onNav={onNav}
                onBack={() => setDetailApp(null)}
            />
        )
    }

    const displayApps = showTutorial ? mockApps : apps;

    return (
        <div>
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }}/>
            )}

            <div style={{display: "flex", flexDirection: "column"}}>
                <div id="tut-step-0" className="ph" style={getHighlightStyle(0, 'navy')}>
                    <h1>{en ? "My Subsidies" : "Ang Aking mga Subsidy"}</h1>
                    <p>{en ? "Status of all your applications and appointments" : "Katayuan ng lahat ng iyong mga aplikasyon at appointment"}</p>
                </div>
                <GuideBox stepIndex={0}/>
            </div>

            <div className="pad">
                <div className="srow"><h2>{en ? "My Applications" : "Aking mga Aplikasyon"}</h2></div>
                {displayApps.length === 0 ? (
                    <div className="empty">
                        <div className="empty-ico">📋</div>
                        <div>{en ? "No applications yet." : "Wala pang aplikasyon."}</div>
                        <button className="btn gold" style={{marginTop: 12}}
                                onClick={() => onNav("apply")}>{en ? "Browse Available Subsidies" : "Tingnan ang Mga Available na Subsidy"}</button>
                    </div>
                ) : displayApps.map((a, index) => {
                    const hasNewMessage = a.application_messages?.length > 0 && !a.driver_seen_latest
                    const hasAnyMessage = a.application_messages?.length > 0
                    const pillStatus = a.status === "claimed" ? "claimed"
                        : a.status === "approved" ? "approved"
                            : a.status === "rejected" ? "rejected"
                                : hasNewMessage ? "response_received"
                                    : hasAnyMessage ? "has_response"
                                        : "under_review"

                    let idAttr = undefined;
                    let highlightStyle = {};
                    let stepIdxForBox = -1;
                    if (showTutorial) {
                        if (index === 0) {
                            idAttr = "tut-step-1";
                            highlightStyle = getHighlightStyle(1, 'white');
                            stepIdxForBox = 1;
                        }
                        if (index === 1) {
                            idAttr = "tut-step-2";
                            highlightStyle = getHighlightStyle(2, 'white');
                            stepIdxForBox = 2;
                        }
                        if (index === 2) {
                            idAttr = "tut-step-3";
                            highlightStyle = getHighlightStyle(3, 'white');
                            stepIdxForBox = 3;
                        }
                        if (index === 3) {
                            idAttr = "tut-step-4";
                            highlightStyle = getHighlightStyle(4, 'white');
                            stepIdxForBox = 4;
                        }
                    }

                    return (
                        <Fragment key={a.id}>
                            <div
                                id={idAttr}
                                className="card"
                                style={{
                                    cursor: "pointer",
                                    marginBottom: showTutorial && tutStep === stepIdxForBox ? 0 : 10, ...highlightStyle
                                }}
                                onClick={() => {
                                    if (showTutorial) return;

                                    // Instantly load the details UI
                                    setDetailApp(a)

                                    // Make sure it saves to the database behind the scenes
                                    if (hasNewMessage) {
                                        supabase.from("applications")
                                            .update({driver_seen_latest: true})
                                            .eq("id", a.id)
                                            .then(() => {
                                                setTimeout(() => {
                                                    if (refreshApps) refreshApps();
                                                }, 500);
                                            })
                                    }
                                }}
                            >
                                <div className="card-top">
                                    <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
                                    <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
                                </div>
                                <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
                                <div style={{fontSize: 12, color: "var(--slate)", marginBottom: 8}}>
                                    📍 {a.payout_events?.venue} · 📅 {a.payout_events?.event_date}
                                </div>
                                <div className="card-footer" style={{flexWrap: "wrap", gap: 8}}>
                                    <div style={{display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap"}}>
                                        <Pill status={pillStatus} en={en}/>
                                        {hasNewMessage && (
                                            <span style={{
                                                background: "var(--gold)",
                                                color: "#fff",
                                                borderRadius: "50%",
                                                width: 18,
                                                height: 18,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 11,
                                                fontWeight: 700
                                            }}>!</span>
                                        )}
                                    </div>
                                    <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {showTutorial && stepIdxForBox !== -1 && <GuideBox stepIndex={stepIdxForBox}/>}
                        </Fragment>
                    )
                })}
            </div>
        </div>
    )
}

export function Apply({
                   en,
                   driverId,
                   driver,
                   showToast,
                   refreshApps,
                   onNav,
                   preselectedEventId,
                   showTutorial,
                   setShowTutorial
               }) {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [existing, setExisting] = useState({})
    const [applyingTo, setApplyingTo] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [appForm, setAppForm] = useState(null)
    const [showApplyHelp, setShowApplyHelp] = useState(false)

    // --- ARCHIVE LOGIC ---
    const [archivedIds, setArchivedIds] = useState(() => {
        try {
            const saved = localStorage.getItem(`uplift_archived_${driverId}`)
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    })
    const [showArchived, setShowArchived] = useState(false)

    function toggleArchive(eventId) {
        setArchivedIds(prev => {
            const next = prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
            localStorage.setItem(`uplift_archived_${driverId}`, JSON.stringify(next))
            return next
        })
    }

    const isVerified = driver?.verification_status === "verified"

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

    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    // Reset step whenever we switch between the browse list and the application form
    useEffect(() => {
        setTutStep(0)
    }, [applyingTo])

    const browseTutSteps = [
        {
            en: "This is Available Subsidies. Every open payout event you qualify for shows up here.",
            fil: "Ito ang Available Subsidies. Lalabas dito ang lahat ng bukas na payout event na kwalipikado ka.",
            position: { top: '190px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Each card shows the program's amount, agency, payout schedule, venue, and the application deadline — take note of the deadline, since late applications won't be accepted.",
            fil: "Ipinapakita ng bawat card ang halaga, ahensya, iskedyul ng payout, venue, at deadline ng aplikasyon — pansinin ang deadline, dahil hindi tinatanggap ang mga huling aplikasyon.",
            position: { top: '340px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Tap 'Apply' on a subsidy you qualify for to start your application. Once you've applied, this turns into a status pill instead.",
            fil: "I-tap ang 'Mag-apply' sa subsidy na kwalipikado ka para simulan ang aplikasyon. Kapag naka-apply ka na, magiging status pill na lang ito.",
            position: { bottom: '160px', left: '50%', transform: 'translateX(-50%)' }
        }
    ]

    const formTutSteps = [
        {
            en: "This is the application form for the subsidy you selected. If you get stuck, tap 'Need Help?' up here for quick tips.",
            fil: "Ito ang application form para sa napiling subsidy. Kung na-stuck ka, i-tap ang 'Kailangan ng Tulong?' dito para sa mabilis na tip.",
            position: { top: '100px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Fill in your Personal Information exactly as it appears on your Driver's License.",
            fil: "Punan ang iyong Personal na Impormasyon nang eksaktong tugma sa iyong Driver's License.",
            position: { top: '250px', left: '15%', transform: 'translateX(-50%)' }
        },
        {
            en: "Your Address helps the agency confirm you're within the coverage area for this subsidy.",
            fil: "Ang iyong Tirahan ay tumutulong sa ahensya na kumpirmahin kung nasa saklaw ka ng subsidy na ito.",
            position: { top: '150px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Your Vehicle and Franchise details must match your official documents exactly — mismatches are one of the most common reasons for rejection.",
            fil: "Dapat eksaktong tugma ang iyong Sasakyan at Pransisa sa opisyal na dokumento — isa ito sa pinakakaraniwang dahilan ng pagkatanggi.",
            position: { top: '350px', left: '15%', transform: 'translateX(-50%)' }
        },
        {
            en: "Your E-wallet is where the subsidy payout will be sent, if this program pays out digitally. It must be registered in your own name.",
            fil: "Dito ipapadala ang subsidy payout kung digital ang paraan ng pagbayad ng programang ito. Dapat nakalaan ito sa sarili mong pangalan.",
            position: { bottom: '200px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Once everything looks correct, tap 'Submit Application.' You'll be able to track its status from My Subsidies.",
            fil: "Kapag tama na ang lahat, i-tap ang 'Isumite ang Aplikasyon.' Masusubaybayan mo ang status nito sa My Subsidies.",
            position: { bottom: '120px', left: '50%', transform: 'translateX(-50%)' }
        }
    ]

    const tutSteps = applyingTo ? formTutSteps : browseTutSteps

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
                position: "relative", zIndex: 1000,
                background: "var(--navy)", borderRadius: "var(--r)", padding: "16px",
                margin: "10px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                pointerEvents: "auto"
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
                    💡 {tutStep + 1}/{tutSteps.length}
                </div>
                <div style={{ fontSize: 13, color: "#fff", marginBottom: 14, lineHeight: 1.6 }}>
                    {en ? tutSteps[tutStep].en : tutSteps[tutStep].fil}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn outline sm" style={{
                        margin: 0,
                        background: "transparent",
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.4)"
                    }} onClick={() => setShowTutorial(false)}>
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

    const mockEvent = {
        id: "mock-event",
        program_name: "Fuel Subsidy Tranche 2",
        program_amount: "3000",
        program_agency: "LTFRB",
        event_date: "2026-09-01",
        time_start: "08:00:00",
        time_end: "17:00:00",
        venue: "Manila City Hall",
        application_deadline: "2026-08-25T17:00:00",
    }

    useEffect(() => {
        async function load() {
            const { data: evts } = await supabase
                .from("payout_events")
                .select("*")
                .gte("event_date", new Date().toISOString().split("T")[0])
                .order("event_date", { ascending: true })
            const { data: apps } = await supabase
                .from("applications")
                .select("event_id, status")
                .eq("driver_id", driverId)
            const now = new Date()
            const stillOpen = (evts || [])
                .filter(e => !e.application_deadline || new Date(e.application_deadline) > now)
                .filter(e => {
                    if (!e.qualified_denominations) return true
                    const allowed = e.qualified_denominations.split(",").map(s => s.trim()).filter(Boolean)
                    return allowed.length === 0 || allowed.includes(driver?.denomination)
                })
            setEvents(stillOpen)

            const appMap = {}
            ;(apps || []).forEach(a => {
                appMap[a.event_id] = a.status
            })
            setExisting(appMap)
            setLoading(false)
            if (preselectedEventId) {
                const match = stillOpen.find(e => e.id === preselectedEventId)
                if (match) openApplyForm(match)
            }
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

    function setF(field, val) {
        setAppForm(p => ({ ...p, [field]: val }))
    }

    async function submitApplication(e) {
        e.preventDefault()
        if (appForm.event.application_deadline && new Date(appForm.event.application_deadline) < new Date()) {
            showToast(en ? "The application deadline for this subsidy has passed." : "Lumipas na ang deadline ng aplikasyon para sa subsidy na ito.")
            setApplyingTo(null)
            setAppForm(null)
            return
        }
        setSubmitting(true)

        const { data: existingApps } = await supabase
            .from("applications")
            .select("id, status")
            .eq("driver_id", driverId)
            .eq("event_id", appForm.event.id)

        let errorObj;

        if (existingApps && existingApps.length > 0) {
            const targetAppId = existingApps[0].id
            const { error } = await supabase.from("applications").update({
                status: "pending",
                applied_at: new Date().toISOString(),
                rejection_fields: null,
                rejection_has_fields: false,
                admin_message: null
            }).eq("id", targetAppId)
            errorObj = error

            if (existingApps.length > 1) {
                const extraIds = existingApps.slice(1).map(a => a.id)
                await supabase.from("applications").delete().in("id", extraIds)
            }
        } else {
            const { error } = await supabase.from("applications").insert({
                driver_id: driverId,
                event_id: appForm.event.id,
                status: "pending",
                applied_at: new Date().toISOString(),
            })
            errorObj = error
        }

        if (!errorObj) {
            setExisting(prev => ({ ...prev, [appForm.event.id]: "pending" }))
            setApplyingTo(null)
            setAppForm(null)

            // Automatically remove it from archived list if it was re-applied
            setArchivedIds(prev => {
                if (prev.includes(appForm.event.id)) {
                    const next = prev.filter(id => id !== appForm.event.id)
                    localStorage.setItem(`uplift_archived_${driverId}`, JSON.stringify(next))
                    return next
                }
                return prev
            })

            refreshApps()
            showToast(en ? "Application submitted!" : "Naisumite ang aplikasyon!")
        } else {
            showToast(en ? "Something went wrong. Please try again." : "May nangyaring mali. Subukan muli.")
        }
        setSubmitting(false)
    }

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const days = Array.from({ length: 31 }, (_, i) => String(i + 1))
    const denominations = ["MPUJ", "TPUJ", "MUVE", "TUVE", "MPUB", "PUB", "Mini-Bus", "School Transport", "Taxi"]

    if (applyingTo && appForm) {
        return (
            <div>
                {showTutorial && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                        zIndex: 999
                    }} />
                )}

                <div id="tut-step-0" className="ph" style={getHighlightStyle(0, 'navy')}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <h1>{en ? "Apply for Subsidy" : "Mag-apply ng Subsidy"}</h1>
                            <p>{appForm.event.program_name} · {appForm.event.program_amount}</p>
                        </div>
                        <button className="btn sm" style={{
                            width: "auto",
                            flexShrink: 0,
                            background: "rgba(255,255,255,0.12)",
                            border: "1.5px solid rgba(255,255,255,0.6)",
                            color: "#fff",
                            padding: "8px 16px",
                            fontSize: 13,
                            pointerEvents: "auto"
                        }} onClick={() => setShowApplyHelp(!showApplyHelp)}>
                            💬 {en ? "Need Help?" : "Kailangan ng Tulong?"}
                        </button>
                    </div>
                </div>
                <GuideBox stepIndex={0} />
                <div className="pad">
                    {showApplyHelp && (
                        <div className="alert"
                             style={{ background: "var(--cream)", border: "1px solid var(--border)" }}>
                            <div style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                marginBottom: 8,
                                color: "var(--navy)"
                            }}>
                                💡 {en ? "Tips for a smooth application" : "Mga Tip para sa Maayos na Aplikasyon"}
                            </div>
                            <ul style={{
                                margin: 0,
                                paddingLeft: 18,
                                fontSize: 12,
                                color: "var(--slate)",
                                lineHeight: 1.8
                            }}>
                                <li>{en ? "Your name must match your Driver's License exactly (check spelling and spacing)." : "Dapat eksaktong tugma ang pangalan mo sa iyong Driver's License (tsekan ang spelling at spacing)."}</li>
                                <li>{en ? "No middle or extension name? Type \"N/A\" instead of leaving it blank." : "Walang middle o extension name? I-type ang \"N/A\" sa halip na iwanang blangko."}</li>
                                <li>{en ? "Double-check your e-wallet number and type — a wrong e-wallet is one of the most common reasons for rejection." : "I-double-check ang iyong e-wallet number at type — isa ito sa pinakakaraniwang dahilan ng pagkatanggi."}</li>
                                <li>{en ? "Make sure your plate and chassis numbers match your official documents." : "Siguraduhing tugma ang plate at chassis number sa iyong opisyal na dokumento."}</li>
                                <li>{en ? "Still unsure? Submit anyway — you'll see exactly what to fix if anything is wrong." : "Kulang pa rin sa tiwala? Isumite pa rin — makikita mo kung ano ang itatama kung mayroon man."}</li>
                            </ul>
                        </div>
                    )}
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
                        <div id="tut-step-1" style={getHighlightStyle(1, 'white')}>
                            <div style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--navy)",
                                marginBottom: 10
                            }}>{en ? "Personal Information" : "Personal na Impormasyon"}</div>
                            <div className="fg"><label
                                className="fl">{en ? "Last Name *" : "Apelyido *"}</label><input className="fi"
                                                                                                 placeholder="e.g. Santos"
                                                                                                 value={appForm.last_name}
                                                                                                 onChange={e => setF("last_name", e.target.value)}
                                                                                                 onBlur={() => setF("last_name", toProperCase(appForm.last_name))} />
                            </div>
                            <div className="fg"><label
                                className="fl">{en ? "First Name *" : "Pangalan *"}</label><input className="fi"
                                                                                                  placeholder="e.g. Juan"
                                                                                                  value={appForm.first_name}
                                                                                                  onChange={e => setF("first_name", e.target.value)}
                                                                                                  onBlur={() => setF("first_name", toProperCase(appForm.first_name))} />
                            </div>
                            <div className="fg"><label
                                className="fl">{en ? "Middle Name *" : "Gitnang Pangalan *"}</label><input
                                className="fi" placeholder="e.g. Dela Cruz — N/A if none"
                                value={appForm.middle_name} onChange={e => setF("middle_name", e.target.value)}
                                onBlur={() => setF("middle_name", toProperCase(appForm.middle_name))} /></div>
                            <div className="fg"><label className="fl">{en ? "Extension Name *" : "Extension Name *"}
                                <span style={{ fontWeight: 400, color: "var(--slate)" }}>N/A if not applicable</span></label><input
                                className="fi" placeholder="e.g. Jr — N/A if none" value={appForm.extension_name}
                                onChange={e => setF("extension_name", e.target.value)} /></div>
                            <div className="fg">
                                <label className="fl">{en ? "Sex *" : "Kasarian *"}</label>
                                <select className="fsel" value={appForm.sex}
                                        onChange={e => setF("sex", e.target.value)}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Others</option>
                                </select>
                            </div>

                            <div style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--navy)",
                                marginBottom: 10,
                                marginTop: 16
                            }}>{en ? "Date of Birth" : "Petsa ng Kapanganakan"}</div>
                            <div className="two-col">
                                <div className="fg"><label className="fl">{en ? "Month" : "Buwan"}</label>
                                    <select className="fsel" value={appForm.birth_month}
                                            onChange={e => setF("birth_month", e.target.value)}>
                                        <option value="">{en ? "Select..." : "Pumili..."}</option>
                                        {months.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="fg"><label className="fl">{en ? "Day" : "Araw"}</label>
                                    <select className="fsel" value={appForm.birth_day}
                                            onChange={e => setF("birth_day", e.target.value)}>
                                        <option value="">{en ? "Select..." : "Pumili..."}</option>
                                        {days.map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="two-col">
                                <div className="fg"><label
                                    className="fl">{en ? "Year (YYYY)" : "Taon (YYYY)"}</label><input className="fi"
                                                                                                      placeholder="e.g. 1985"
                                                                                                      value={appForm.birth_year}
                                                                                                      onChange={e => setF("birth_year", e.target.value)}
                                                                                                      maxLength={4} />
                                </div>
                                <div className="fg"><label className="fl">{en ? "Age" : "Edad"}</label><input
                                    className="fi" placeholder="e.g. 40" value={appForm.age}
                                    onChange={e => setF("age", e.target.value)} /></div>
                            </div>
                        </div>

                        <GuideBox stepIndex={1} />

                        <div id="tut-step-2" style={getHighlightStyle(2, 'white')}>
                            <div style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--navy)",
                                marginBottom: 10,
                                marginTop: 16
                            }}>{en ? "Address" : "Tirahan"}</div>
                            <div className="fg"><label className="fl">Region</label><input className="fi"
                                                                                           placeholder="e.g. NCR"
                                                                                           value={appForm.region}
                                                                                           onChange={e => setF("region", e.target.value)} />
                            </div>
                            <div className="fg"><label className="fl">Province</label><input className="fi"
                                                                                             placeholder="e.g. Metro Manila"
                                                                                             value={appForm.province}
                                                                                             onChange={e => setF("province", e.target.value)} />
                            </div>
                            <div className="fg"><label
                                className="fl">{en ? "City / Municipality" : "Lungsod / Munisipyo"}</label><input
                                className="fi" placeholder="e.g. Quezon City" value={appForm.city}
                                onChange={e => setF("city", e.target.value)} /></div>
                            <div className="fg"><label className="fl">Barangay</label><input className="fi"
                                                                                             placeholder="e.g. Brgy. Poblacion"
                                                                                             value={appForm.barangay}
                                                                                             onChange={e => setF("barangay", e.target.value)} />
                            </div>
                            <div className="fg"><label
                                className="fl">{en ? "Contact Number *" : "Numero ng Kontak *"}</label><input
                                className="fi" placeholder="09XX XXX XXXX"
                                value={formatMobileDisplay(appForm.mobile)}
                                onChange={e => setF("mobile", formatMobileDisplay(e.target.value))} /></div>
                        </div>

                        <GuideBox stepIndex={2} />

                        <div id="tut-step-3" style={getHighlightStyle(3, 'white')}>
                            <div style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--navy)",
                                marginBottom: 10,
                                marginTop: 16
                            }}>{en ? "Vehicle and Franchise" : "Sasakyan at Pransisa"}</div>
                            <div className="fg">
                                <label className="fl">{en ? "Denomination *" : "Uri ng Sasakyan *"}</label>
                                <select className="fsel" value={appForm.denomination}
                                        onChange={e => setF("denomination", e.target.value)}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    {denominations.map(d => <option key={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="fg"><label className="fl">{en ? "Case Number *" : "Case Number *"} <span
                                style={{ fontWeight: 400, color: "var(--slate)" }}>e.g. 2020-XXXX</span></label><input
                                className="fi" placeholder="2020-XXXX" value={appForm.case_number}
                                onChange={e => setF("case_number", formatCaseNumber(e.target.value))} /></div>
                            <div className="fg"><label
                                className="fl">{en ? "Operator's Name *" : "Pangalan ng Operator *"}</label><input
                                className="fi"
                                placeholder={en ? "Transport entity or individual name" : "Pangalan ng transport entity o indibidwal"}
                                value={appForm.operator_name} onChange={e => setF("operator_name", e.target.value)}
                                onBlur={() => setF("operator_name", toProperCaseKeepAcronyms(appForm.operator_name))} />
                            </div>
                            <div className="fg"><label
                                className="fl">{en ? "Plate Number *" : "Plate Number *"}</label><input
                                className="fi" placeholder="e.g. ABC 1234" value={appForm.plate_number}
                                onChange={e => setF("plate_number", formatPlateNumber(e.target.value))} /></div>
                            <div className="fg"><label
                                className="fl">{en ? "Chassis Number *" : "Chassis Number *"}</label><input
                                className="fi" placeholder="e.g. XXXXXXXXXX" value={appForm.chassis_number}
                                onChange={e => setF("chassis_number", e.target.value)} /></div>
                            <div className="fg"><label
                                className="fl">{en ? "Driver's License No. *" : "Numero ng Driver's License *"}</label><input
                                className="fi" placeholder={licenseNumberPlaceholder(appForm.denomination)}
                                value={appForm.license_number}
                                onChange={e => setF("license_number", formatLicenseNumber(e.target.value))} />
                                <div
                                    className="fh">{en ? `Format: ${licenseNumberPlaceholder(appForm.denomination)}.` : `Format: ${licenseNumberPlaceholder(appForm.denomination)}.`} {appForm.denomination && dlCodeHint(appForm.denomination, en)}</div>
                            </div>
                        </div>

                        <GuideBox stepIndex={3} />

                        <div id="tut-step-4" style={getHighlightStyle(4, 'white')}>
                            <div style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                color: "var(--navy)",
                                marginBottom: 10,
                                marginTop: 16
                            }}>{en ? "E-wallet" : "E-wallet"}</div>
                            <div className="fg">
                                <label className="fl">{en ? "E-wallet Name *" : "Pangalan ng E-wallet *"} <span
                                    style={{
                                        fontWeight: 400,
                                        color: "var(--slate)"
                                    }}>{en ? "must be registered in driver's name" : "dapat nakalaan sa pangalan ng driver"}</span></label>
                                <select className="fsel" value={appForm.ewallet_type}
                                        onChange={e => setF("ewallet_type", e.target.value)}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    <option>GCash</option>
                                    <option>PayMaya</option>
                                </select>
                            </div>
                            <div className="fg"><label
                                className="fl">{en ? "E-wallet Account Number *" : "Numero ng E-wallet Account *"}
                                <span style={{
                                    fontWeight: 400,
                                    color: "var(--slate)"
                                }}>e.g. 0996-XXX-XXXX</span></label><input className="fi"
                                                                           placeholder="0996-XXX-XXXX"
                                                                           value={appForm.ewallet_number}
                                                                           onChange={e => setF("ewallet_number", e.target.value)} />
                            </div>
                        </div>

                        <GuideBox stepIndex={4} />

                        <div id="tut-step-5" style={getHighlightStyle(5, 'white')}>
                            <button className="btn gold" type="submit" disabled={submitting}
                                    style={{ pointerEvents: "auto" }}>{submitting ? "..." : (en ? "Submit Application" : "Isumite ang Aplikasyon")}</button>
                            <button type="button" className="btn outline" style={{ pointerEvents: "auto" }}
                                    onClick={() => {
                                        setApplyingTo(null);
                                        setAppForm(null)
                                    }}>{en ? "Cancel" : "Kanselahin"}</button>
                        </div>

                        <GuideBox stepIndex={5} />
                    </form>
                </div>
            </div>
        )
    }

    const baseEvents = showTutorial ? [mockEvent] : events
    const displayEvents = baseEvents.filter(e => {
        const isArchived = archivedIds.includes(e.id)
        return showArchived ? isArchived : !isArchived
    })

    return (
        <div>
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

            <div id="tut-step-0" className="ph" style={getHighlightStyle(0, 'navy')}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <h1>{en ? "Available Subsidies" : "Mga Available na Subsidy"}</h1>
                        <p>{en ? "Browse and apply for open payout events" : "Tingnan at mag-apply sa mga bukas na payout event"}</p>
                    </div>
                    <button className="btn sm" style={{
                        width: "auto",
                        flexShrink: 0,
                        background: showArchived ? "#fff" : "rgba(255,255,255,0.12)",
                        border: "1.5px solid rgba(255,255,255,0.6)",
                        color: showArchived ? "var(--navy)" : "#fff",
                        padding: "8px 16px",
                        fontSize: 13,
                        pointerEvents: "auto"
                    }} onClick={() => setShowArchived(!showArchived)}>
                        🗃️ {showArchived ? (en ? "Hide Archived" : "Itago ang Archived") : (en ? "Show Archived" : "Ipakita ang Archived")}
                    </button>
                </div>
            </div>
            <GuideBox stepIndex={0} />
            <div className="pad" style={{ paddingBottom: 0 }}>
                <span className="link"
                      onClick={() => onNav("dashboard")}>← {en ? "Back to Home" : "Bumalik sa Home"}</span>
            </div>
            <div className="pad">
                {loading && !showTutorial ? (
                    <div className="empty">
                        <div>{en ? "Loading..." : "Naglo-load..."}</div>
                    </div>
                ) : displayEvents.length === 0 ? (
                    <div className="empty">
                        <div className="empty-ico">📭</div>
                        <div>{showArchived
                            ? (en ? "No archived events." : "Walang naka-archive na event.")
                            : (en ? "No open payout events at the moment." : "Walang bukas na payout event sa ngayon.")}</div>
                    </div>
                ) : displayEvents.map((event) => {
                    const appStatus = showTutorial ? null : existing[event.id]
                    const cardId = showTutorial ? "tut-step-1" : undefined
                    const cardStyle = showTutorial ? getHighlightStyle(1, 'white') : {}
                    return (
                        <Fragment key={event.id}>
                            <div className="event-card" id={cardId} style={cardStyle}>
                                <div className="event-card-top">
                                    <div className="event-name">{event.program_name}</div>
                                    <div className="event-amount">{event.program_amount}</div>
                                </div>
                                <div className="event-agency">{event.program_agency}</div>
                                <div
                                    className="event-meta">📅 {en ? "Payout Date:" : "Petsa ng Payout:"} {event.event_date}</div>
                                <div className="event-meta">🕐 {event.time_start} – {event.time_end}</div>
                                <div className="event-meta">📍 {event.venue}</div>
                                {event.application_deadline && (
                                    <div className="event-meta" style={{ color: "var(--brick)", fontWeight: 600 }}>
                                        ⚠️ {en ? "Apply before:" : "Mag-apply bago ang:"} {new Date(event.application_deadline).toLocaleString("en-PH", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit"
                                    })}
                                    </div>
                                )}
                                {event.description && (
                                    <div style={{
                                        marginTop: 8,
                                        padding: "8px 10px",
                                        background: "var(--cream)",
                                        borderRadius: "var(--r-sm)",
                                        fontSize: 12,
                                        color: "var(--slate)",
                                        lineHeight: 1.6
                                    }}>
                                        📋 {event.description}
                                    </div>
                                )}
                                {event.announcement_date && (
                                    <div className="event-meta" style={{ color: "var(--amber)" }}>
                                        📢 {en ? "Final Announcement:" : "Huling Anunsyo:"} {event.announcement_date}
                                    </div>
                                )}

                                <div className="event-footer">
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        {appStatus === "rejected" && (
                                            <button
                                                type="button"
                                                onClick={() => toggleArchive(event.id)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "var(--slate)",
                                                    fontSize: 12,
                                                    textDecoration: "underline",
                                                    cursor: "pointer",
                                                    fontWeight: 600
                                                }}
                                            >
                                                {archivedIds.includes(event.id) ? (en ? "Unarchive" : "I-unarchive") : (en ? "Archive" : "I-archive")}
                                            </button>
                                        )}
                                    </div>
                                    <div
                                        id={showTutorial ? "tut-step-2" : undefined}
                                        style={showTutorial && tutStep === 2 ? { ...getHighlightStyle(2, 'white'), borderRadius: '20px' } : undefined}
                                    >
                                        {appStatus ? (
                                            <Pill status={appStatus} en={en} />
                                        ) : (
                                            <button
                                                className="btn sm navy-o"
                                                style={{ margin: 0 }}
                                                onClick={() => {
                                                    if (showTutorial) return;
                                                    openApplyForm(event)
                                                }}
                                            >
                                                {en ? "Apply" : "Mag-apply"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <GuideBox stepIndex={2} />
                            </div>
                            <GuideBox stepIndex={1} />
                        </Fragment>
                    )
                })}
            </div>
        </div>
    )
}
