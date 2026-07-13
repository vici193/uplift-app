import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"
import { ChangeNumber, ForgotPassword, SignIn, SignUp } from "./auth"
import { AdminPanel } from "./admin"
import { EditProfile, HelpCenter } from "./pages"
import { Apply, Subsidies } from "./subsidies"
import { MyConcernsPage } from "./concerns"
import { Dashboard, Notifications } from "./dashboard"
import { css } from "./shared"
import { NotifModal, Toast } from "./ui"

export default function App() {
    const [lang, setLang] = useState("fil")
    const [page, setPage] = useState(sessionStorage.getItem("uplift_page") || "signin")
    const [showTutorial, setShowTutorial] = useState(false)
    const [helpAppId, setHelpAppId] = useState(null)
    const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem("uplift_session"))
    const [restoringSession, setRestoringSession] = useState(!!sessionStorage.getItem("uplift_session"))
    const logoTapCount = useRef(0)
    const logoTapTimer = useRef(null)

    function handleLogoTap() {
        logoTapCount.current += 1
        if (logoTapTimer.current) clearTimeout(logoTapTimer.current)
        logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0 }, 5000)
        if (logoTapCount.current >= 5) {
            logoTapCount.current = 0
            navigate("admin")
            return true
        }
        showToast(`${logoTapCount.current}/5`)
        return false
    }

    const [driver, setDriver] = useState(null)
    const [driverId, setDriverId] = useState(null)
    const [apps, setApps] = useState([])
    const [appointment, setAppointment] = useState(null)
    const [allAppointments, setAllAppointments] = useState([])
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

    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(""), 3000)
    }

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
                    action: {type: "view_subsidy", appId: a.id},
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
                    action2: {type: "view_subsidy", appId: a.id},
                    action2Label: en ? "View Application" : "Tingnan ang Aplikasyon",
                    closeLabel: en ? "Later" : "Mamaya na",
                })
            }
        })

        // Deadline warnings
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
                        ? `Applications for ${ev.program_name} close on ${deadline.toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                        })}. Don't miss it!`
                        : `Magsasara ang mga aplikasyon para sa ${ev.program_name} sa ${deadline.toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                        })}. Huwag palampasin!`,
                    action: {type: "apply", eventId: ev.id},
                    actionLabel: en ? "Apply Now" : "Mag-apply Na",
                    closeLabel: en ? "Later" : "Mamaya na",
                })
            }
        })

        // New events
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
                        ? `${ev.program_name} (${ev.program_amount}) is now open for applications. Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                        })}.`
                        : `Bukas na ang ${ev.program_name} (${ev.program_amount}) para sa mga aplikasyon. Deadline: ${new Date(ev.application_deadline).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                        })}.`,
                    action: {type: "apply", eventId: ev.id},
                    actionLabel: en ? "Apply Now" : "Mag-apply Na",
                    closeLabel: en ? "Maybe Later" : "Mamaya Na Lang",
                })
            }
        })

        return queue.filter(n => isNew(n.id))
    }

    const [applyEventId, setApplyEventId] = useState(null)
    const [subsidyAppId, setSubsidyAppId] = useState(null)

    function navigate(targetPage, contextId) {
        setShowTutorial(false)
        if (targetPage === "helpcenter") setHelpAppId(contextId || null)
        if (targetPage === "apply") setApplyEventId(contextId || null)
        if (targetPage === "subsidies") setSubsidyAppId(contextId || null)
        sessionStorage.setItem("uplift_page", targetPage)
        setPage(targetPage)
    }

    async function loadDriverData(id, triggerModals = false, readIds = []) {
        const [{data: profile}, {data: appsData}, {data: apptData}, {data: eventsData}] = await Promise.all([
            supabase.from("drivers").select("*").eq("id", id).single(),
            supabase.from("applications").select("*, payout_events(*), application_messages(id, message, created_at, sent_by)").eq("driver_id", id).order("applied_at", {ascending: false}),
            supabase.from("appointments").select("*, payout_events(program_name, venue, event_date, time_start, time_end)").eq("driver_id", id).eq("status", "confirmed"),
            supabase.from("payout_events").select("*").order("event_date", {ascending: true}),
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
        setAllAppointments(apptData || [])
        setAppointment(apptData?.[0] || null)
        setOpenEvents(eventsData || [])
        const {data: concernsData} = await supabase
            .from("grievances")
            .select("*, applications(payout_events(program_name)), grievance_messages(id, message, sent_by, created_at)")
            .eq("driver_id", id)
            .order("created_at", {ascending: false})
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
        const {data} = await supabase.from("drivers").select("*").eq("mobile", mobileNum).single()
        if (data) {
            setShowTutorial(false)
            setDriverId(data.id)
            sessionStorage.setItem("uplift_session", mobileNum)
            const {data: reads} = await supabase
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
            const {error: uploadError} = await supabase.storage
                .from("licenses")
                .upload(filename, file, {contentType: file.type, upsert: true})
            if (!uploadError) {
                const {data: urlData} = supabase.storage.from("licenses").getPublicUrl(filename)
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
        setLoggedIn(false);
        setDriver(null);
        setDriverId(null);
        setApps([]);
        setAppointment(null);
        setOpenEvents([]);
        setConcerns([]);
        setPage("signin")
    }

    async function refreshApps() {
        if (!driverId) return
        const {data} = await supabase
            .from("applications")
            .select("*, payout_events(*), application_messages(id, message, created_at, sent_by)")
            .eq("driver_id", driverId)
            .order("applied_at", {ascending: false})
        if (data) setApps(data)
    }

    async function refreshConcerns() {
        if (!driverId) return
        const {data} = await supabase
            .from("grievances")
            .select("*, applications(payout_events(program_name)), grievance_messages(id, message, sent_by, created_at)")
            .eq("driver_id", driverId)
            .order("created_at", {ascending: false})
        setConcerns(data || [])
    }

    async function closeModal() {
        if (currentModal?.id && driverId) {
            const deadlineTypes = ["deadline_", "new_event_"]
            const isDeadline = deadlineTypes.some(prefix => currentModal.id.startsWith(prefix))
            if (!isDeadline) {
                await supabase.from("notification_reads").upsert({
                    driver_id: driverId,
                    notification_id: currentModal.id,
                }, {onConflict: "driver_id,notification_id"})
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
        } else if (action.type === "view_subsidy") {
            navigate("subsidies", action.appId)
        }
    }

    const navItems = [
        {key: "dashboard", ico: "🏠", en: "Home", fil: "Home"},
        {key: "subsidies", ico: "📋", en: "Subsidies", fil: "Subsidies"},
    ]

    function renderPage() {
        if (!loggedIn) {
            if (page === "signup") return <SignUp en={en} onNav={navigate} onLogin={handleLogin}
                                                  showTutorial={showTutorial} setShowTutorial={setShowTutorial}/>
            if (page === "changenumber") return <ChangeNumber en={en} onNav={navigate} showTutorial={showTutorial}
                                                              setShowTutorial={setShowTutorial}/>
            if (page === "forgot") return <ForgotPassword en={en} onNav={navigate} showTutorial={showTutorial}
                                                          setShowTutorial={setShowTutorial}/>
            if (page === "admin") return <AdminPanel en={en} showToast={showToast} refreshApps={refreshApps} refreshConcerns={refreshConcerns} />
            return <SignIn en={en} onNav={navigate} onLogin={handleLogin} showTutorial={showTutorial}
                           setShowTutorial={setShowTutorial}/>
        }
        if (page === "admin") return <AdminPanel en={en} showToast={showToast} refreshApps={refreshApps} refreshConcerns={refreshConcerns} />
        if (page === "editprofile") return <EditProfile en={en} driverId={driverId} driver={driver}
                                                        showToast={showToast} onDone={async () => {
            await loadDriverData(driverId);
            setPage("dashboard")
        }} showTutorial={showTutorial} setShowTutorial={setShowTutorial}/>
        if (page === "subsidies") return <Subsidies en={en} onNav={navigate} apps={apps}
                                                    allAppointments={allAppointments} driverId={driverId}
                                                    showToast={showToast} refreshApps={refreshApps}
                                                    preselectedAppId={subsidyAppId} showTutorial={showTutorial}
                                                    setShowTutorial={setShowTutorial}/>
        if (page === "apply") return <Apply en={en} driverId={driverId} driver={driver} showToast={showToast}
                                            refreshApps={refreshApps} onNav={navigate}
                                            preselectedEventId={applyEventId} showTutorial={showTutorial}
                                            setShowTutorial={setShowTutorial}/>
        if (page === "helpcenter") return <HelpCenter en={en} apps={apps} driverId={driverId} showToast={showToast}
                                                      onNav={navigate} preselectedAppId={helpAppId}
                                                      showTutorial={showTutorial}
                                                      setShowTutorial={setShowTutorial}/>
        if (page === "myconcerns") return <MyConcernsPage en={en} concerns={concerns} apps={apps}
                                                          driverId={driverId} showToast={showToast}
                                                          refreshConcerns={refreshConcerns} onNav={navigate}
                                                          showTutorial={showTutorial}
                                                          setShowTutorial={setShowTutorial}/>
        if (page === "notifications") return <Notifications en={en} apps={apps} appointment={appointment}
                                                            driver={driver} openEvents={openEvents}
                                                            onOpenModal={(modal) => setCurrentModal(modal)}/>
        return <Dashboard en={en} onNav={navigate} driver={driver || {name: "Driver"}} apps={apps}
                          appointment={appointment} onUploadDocument={handleUploadDocument} concerns={concerns}
                          driverId={driverId} showToast={showToast} openEvents={openEvents}
                          onOpenModal={(modal) => setCurrentModal(modal)} refreshApps={refreshApps}
                          refreshConcerns={refreshConcerns} showTutorial={showTutorial}
                          setShowTutorial={setShowTutorial}/>
    }

    return (
        <>
            <style>{css}</style>
            <div className={`app ${loggedIn ? 'logged-in-layout' : ''}`}>
                <Toast msg={toast}/>
                <NotifModal notif={currentModal} onClose={closeModal} onAction={handleModalAction}/>

                <div className="topbar">
                    <div className="logo" onClick={() => { if (!handleLogoTap()) setPage(loggedIn ? "dashboard" : "signin") }}>UPLIFT <span>EO 110</span>
                    </div>
                    <div className="topbar-right">

                        {/* Light Bulb Tutorial Button */}
                        <button
                            className="tbtn ghost"
                            style={{fontSize: 16, padding: "2px 6px"}}
                            onClick={() => setShowTutorial(true)}
                            title={en ? "Open Tutorial" : "Buksan ang Tutorial"}
                        >
                            💡
                        </button>

                        <button className="tbtn lang-btn"
                                onClick={() => setLang(l => l === "en" ? "fil" : "en")}>{en ? "Filipino" : "English"}</button>
                        {loggedIn && <button className="tbtn" style={{background: "var(--brick)", color: "#fff"}}
                                             onClick={handleLogout}>{en ? "Sign Out" : "Sign Out"}</button>}
                    </div>
                </div>

                {loggedIn && (
                    <div className="sidebar">
                        {navItems.map(item => (
                            <button key={item.key} className={`sidebar-item ${page === item.key ? "active" : ""}`}
                                    onClick={() => navigate(item.key)}>
                                <span className="sico">{item.ico}</span>
                                <span>{en ? item.en : item.fil}</span>
                            </button>
                        ))}
                        {/*<button className="sidebar-item" onClick={() => setPage("admin")}>*/}
                        {/*    <span className="sico">⚙️</span><span>Admin Desk</span>*/}
                        {/*</button>*/}
                    </div>
                )}

                <div className={loggedIn ? "main-content" : ""}>
                    <div className={loggedIn ? "scroll" : "scroll no-nav"}>
                        <div className={loggedIn ? "page-inner" : ""}>
                            {restoringSession ? (
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100vh"
                                }}>
                                    <div style={{
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        color: "var(--navy)",
                                        fontSize: 14
                                    }}>Loading...
                                    </div>
                                </div>
                            ) : renderPage()}
                        </div>
                    </div>
                </div>

                {loggedIn && (
                    <nav className="bnav">
                        {navItems.map(item => (
                            <button key={item.key} className={`bnav-item ${page === item.key ? "active" : ""}`}
                                    onClick={() => navigate(item.key)}>
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
