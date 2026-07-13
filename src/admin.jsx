import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import { QRScanner } from "./ui"

export function AdminReplyInline({grievance, en, showToast, onDone}) {
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
        <div style={{width: "100%"}}>
        <textarea
            className="fta"
            style={{minHeight: 200, fontSize: 13, marginBottom: 6, width: "100%", resize: "vertical"}}
            placeholder={en ? "Type your reply..." : "I-type ang iyong tugon..."}
            value={reply}
            onChange={e => setReply(e.target.value)}
        />
            <div style={{display: "flex", gap: 6}}>
                <button className="btn sm jade" onClick={sendReply}
                        disabled={saving}>{saving ? "..." : (en ? "Send Reply" : "Ipadala")}</button>
                <button className="btn sm outline"
                        onClick={() => setOpen(false)}>{en ? "Cancel" : "Kanselahin"}</button>
            </div>
        </div>
    ) : (
        <button className="btn sm navy-o" onClick={() => setOpen(true)}>
            ✉️ {grievance.admin_reply ? (en ? "Edit Reply" : "I-edit ang Tugon") : (en ? "Reply" : "Tumugon")}
        </button>
    )
}

export function AdminGrievanceChat({grievance, en, showToast, onBack, onDone}) {
    const [reply, setReply] = useState("")
    const [saving, setSaving] = useState(false)

    const thread = [
        {
            id: `opening-${grievance.id}`,
            message: grievance.message,
            sent_by: "driver",
            created_at: grievance.created_at
        },
        ...(grievance.grievance_messages || [])
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    async function sendReply() {
        if (!reply.trim()) return
        setSaving(true)
        await supabase.from("grievance_messages").insert({
            grievance_id: grievance.id,
            message: reply,
            sent_by: "admin",
        })
        await supabase.from("grievances").update({
            driver_seen_reply: false,
            status: "replied",
        }).eq("id", grievance.id)
        setReply("")
        setSaving(false)
        showToast(en ? "Reply sent." : "Naipadala ang tugon.")
        onDone()
    }

    async function markResolved() {
        await supabase.from("grievances").update({status: "resolved"}).eq("id", grievance.id)
        showToast(en ? "Marked as resolved." : "Naitala bilang nalutas.")
        onDone()
    }

    const programName = grievance.applications?.payout_events?.program_name || (en ? "General Inquiry" : "Pangkalahatang Tanong")

    return (
        <div className="asec">
                <span className="link"
                      onClick={onBack}>← {en ? "Back to Help Requests" : "Bumalik sa mga Hiling ng Tulong"}</span>
            <div className="spacer"/>
            <div className="card" style={{marginBottom: 12}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                    <div>
                        <div style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontWeight: 700,
                            fontSize: 14,
                            color: "var(--navy)"
                        }}>
                            {grievance.drivers?.full_name} · {grievance.drivers?.mobile}
                        </div>
                        <div style={{
                            fontSize: 12,
                            color: "var(--slate)",
                            marginTop: 2
                        }}>📋 {programName} · {grievance.concern_type}</div>
                    </div>
                    {grievance.status !== "resolved" ? (
                        <button className="btn sm jade"
                                onClick={markResolved}>{en ? "Mark Resolved" : "Markahan"}</button>
                    ) : (
                        <span className="pill approved">{en ? "Resolved" : "Nalutas"}</span>
                    )}
                </div>
            </div>

            <div style={{display: "flex", flexDirection: "column", gap: 12, marginBottom: 16}}>
                {thread.map(m => {
                    const isDriver = m.sent_by === "driver"
                    return (
                        <div key={m.id} style={{alignSelf: isDriver ? "flex-start" : "flex-end", maxWidth: "85%"}}>
                            <div style={{
                                background: isDriver ? "var(--cream)" : "var(--navy)",
                                border: isDriver ? "1px solid var(--border)" : "none",
                                color: isDriver ? "var(--navy)" : "#fff",
                                borderRadius: isDriver ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                                padding: "10px 14px", fontSize: 13, lineHeight: 1.6
                            }}>
                                {m.message}
                            </div>
                            <div style={{
                                fontSize: 10,
                                color: "var(--slate)",
                                marginTop: 3,
                                textAlign: isDriver ? "left" : "right"
                            }}>
                                {isDriver ? (en ? "Driver" : "Driver") : (en ? "You (Admin)" : "Ikaw (Admin)")} · {new Date(m.created_at).toLocaleString("en-PH", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                            })}
                            </div>
                        </div>
                    )
                })}
                {thread.length > 0 && thread[thread.length - 1].sent_by === "driver" && (
                    <div style={{fontSize: 12, color: "var(--slate)", fontStyle: "italic"}}>
                        ⏳ {en ? "Awaiting your response..." : "Naghihintay ng tugon mo..."}
                    </div>
                )}
            </div>

            <div style={{display: "flex", gap: 8, alignItems: "flex-end"}}>
                <textarea
                    className="fta"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder={en ? "Type your reply..." : "I-type ang iyong tugon..."}
                    style={{minHeight: 60, flex: 1, marginBottom: 0}}
                />
                <button className="btn sm jade" style={{width: "auto", marginBottom: 0, padding: "12px 18px"}}
                        disabled={saving || !reply.trim()} onClick={sendReply}>
                    {saving ? "..." : (en ? "Send" : "Ipadala")}
                </button>
            </div>
        </div>
    )
}

export function AdminPanel({ en, showToast }) {
    const [section, setSection] = useState(null)
    const [events, setEvents] = useState([])
    const [pendingApps, setPendingApps] = useState([])
    const [unverifiedDrivers, setUnverifiedDrivers] = useState([])
    const [grievances, setGrievances] = useState([])
    const [openGrievanceId, setOpenGrievanceId] = useState(null)
    const [editingEvent, setEditingEvent] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [savingEdit, setSavingEdit] = useState(false)
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [kpi, setKpi] = useState({ drivers: 0, apps: 0, approved: 0, events: 0 })
    const [eventForm, setEventForm] = useState({
        program_name: "",
        program_agency: "",
        program_amount: "",
        venue: "",
        event_date: "",
        time_start: "",
        time_end: "",
        application_deadline: "",
        announcement_date: "",
        description: "",
        qualified_denominations: []
    })
    const [saving, setSaving] = useState(false)
    const [rejectingId, setRejectingId] = useState(null)
    const [rejectFields, setRejectFields] = useState([])
    const [rejectOther, setRejectOther] = useState(false)
    const [rejectNotes, setRejectNotes] = useState("")
    const [replyingId, setReplyingId] = useState(null)
    const [replyMessage, setReplyMessage] = useState("")
    const [sendingReply, setSendingReply] = useState(false)
    const [approvalMessages, setApprovalMessages] = useState({})
    const [verifyRejectingId, setVerifyRejectingId] = useState(null)
    const [verifyRejectFields, setVerifyRejectFields] = useState([])
    const [verifyNotes, setVerifyNotes] = useState("")
    const [scanning, setScanning] = useState(false)
    const [manualCode, setManualCode] = useState("")
    const [lookupResult, setLookupResult] = useState(null)
    const [lookupError, setLookupError] = useState(null)
    const [releasing, setReleasing] = useState(false)

    const rejectionOptions = ["Last Name", "First Name", "Middle Name", "Extension Name", "Sex", "Date of Birth", "Region", "Province", "City/Municipality", "Barangay", "Mobile Number", "Denomination", "Case Number", "Operator's Name", "Plate Number", "Chassis Number", "Driver's License No.", "E-wallet Type", "E-wallet Number"]

    const todayStr = new Date().toISOString().split("T")[0];

    useEffect(() => {
        loadAll()
        const interval = setInterval(() => {
            loadAll()
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    async function loadAll() {
        const [{data: evts}, {data: apps}, {data: drivers}, {data: approved}, {data: unverified}, {data: griev}] = await Promise.all([
            supabase.from("payout_events").select("*").order("event_date", {ascending: false}),
            supabase.from("applications").select("*, drivers(full_name, license_number), payout_events(program_name, program_agency, venue, event_date, time_start, time_end), application_messages(id, message, created_at)").eq("status", "pending"),
            supabase.from("drivers").select("id"),
            supabase.from("applications").select("id").eq("status", "approved"),
            supabase.from("drivers").select("*").eq("verification_status", "unverified"),
            supabase.from("grievances").select("*, drivers(full_name, mobile), applications(payout_events(program_name, program_agency)), grievance_messages(id, message, sent_by, created_at)").eq("is_draft", false).order("created_at", {ascending: false}),
        ])
        setEvents(evts || [])
        setPendingApps(apps || [])
        setUnverifiedDrivers(unverified || [])
        setGrievances(griev || [])
        setKpi({
            drivers: drivers?.length || 0,
            apps: apps?.length || 0,
            approved: approved?.length || 0,
            events: evts?.length || 0
        })
    }

    function updateForm(field, val) {
        setEventForm(p => ({...p, [field]: val}))
    }

    async function publishEvent(e) {
        e.preventDefault()
        if (!eventForm.program_name || !eventForm.venue || !eventForm.event_date || !eventForm.application_deadline) {
            showToast(en ? "Please fill in all required fields, including the application deadline." : "Punan ang lahat ng required na fields, kasama ang deadline ng aplikasyon.")
            return
        }
        setSaving(true)
        const {error} = await supabase.from("payout_events").insert({
            program_name: eventForm.program_name, program_agency: eventForm.program_agency,
            program_amount: eventForm.program_amount, venue: eventForm.venue, event_date: eventForm.event_date,
            time_start: eventForm.time_start || "08:00:00", time_end: eventForm.time_end || "17:00:00",
            application_deadline: eventForm.application_deadline,
            description: eventForm.description || null,
            qualified_denominations: eventForm.qualified_denominations.length > 0 ? eventForm.qualified_denominations.join(", ") : null,
        })
        setSaving(false)
        if (!error) {
            setEventForm({
                program_name: "",
                program_agency: "",
                program_amount: "",
                venue: "",
                event_date: "",
                time_start: "",
                time_end: "",
                application_deadline: "",
                announcement_date: "",
                description: "",
                qualified_denominations: []
            })
            showToast(en ? "Event published!" : "Na-publish ang event!")
            loadAll()
            setSection("events")
        }
    }

    async function approveApp(app) {
        const refCode = `REF-${Date.now().toString().slice(-8)}`
        const approvalMsg = approvalMessages[app.id] || `Your application for ${app.payout_events?.program_name} has been approved. Please proceed to ${app.payout_events?.venue} on ${app.payout_events?.event_date} between ${app.payout_events?.time_start} and ${app.payout_events?.time_end}. Bring your Driver's License and your reference code.`
        await supabase.from("application_messages").insert({
            application_id: app.id,
            message: approvalMsg,
            sent_by: "admin",
        })
        await supabase.from("applications").update({
            status: "approved",
            admin_message: approvalMsg,
            driver_seen_latest: false,
            updated_at: new Date().toISOString()
        }).eq("id", app.id)
        await supabase.from("appointments").insert({
            application_id: app.id, driver_id: app.driver_id, event_id: app.event_id, reference_code: refCode,
            assigned_date: app.payout_events?.event_date || new Date().toISOString().split("T")[0],
            time_slot: `${app.payout_events?.time_start || "08:00"} – ${app.payout_events?.time_end || "17:00"}`,
            venue: app.payout_events?.venue || "", status: "confirmed",
        })
        showToast(en ? "Approved. Appointment created." : "Naaprubahan. Nagawa ang appointment.")
        loadAll()
        if (refreshApps) refreshApps() // UPDATE DRIVER STATE INSTANTLY
    }

    async function confirmReject(app) {
        if (rejectOther && !rejectNotes.trim()) {
            showToast(en ? "Please explain why in the notes when using \"Other\"." : "Pakipaliwanag sa notes kung bakit kapag gumagamit ng \"Other\".")
            return
        }
        const fields = rejectFields.join(", ")
        const otherLabel = rejectOther ? (en ? "Other (does not meet criteria)" : "Iba pa (hindi kwalipikado)") : ""
        const allLabels = [fields, otherLabel].filter(Boolean).join(", ")
        const combined = rejectNotes.trim() ? `${allLabels}${allLabels ? " — " : ""}${rejectNotes.trim()}` : allLabels
        await supabase.from("applications").update({
            status: "rejected",
            rejection_fields: combined,
            rejection_has_fields: rejectFields.length > 0 && !rejectOther,
            updated_at: new Date().toISOString(),
        }).eq("id", app.id)
        setRejectingId(null);
        setRejectFields([]);
        setRejectOther(false);
        setRejectNotes("")
        showToast(en ? "Application rejected." : "Tinanggihan ang aplikasyon.")
        loadAll()
    }

    async function lookupReferenceCode(rawScan) {
            setLookupError(null);
            setLookupResult(null)
            const parts = rawScan.split("|")
            const refCode = parts.length >= 2 ? parts[1] : rawScan.trim()
            const {data: appt} = await supabase
                .from("appointments")
                .select("*, applications(*, drivers(full_name, license_number, denomination), payout_events(program_name, program_agency, program_amount, venue, event_date))")
                .eq("reference_code", refCode)
                .maybeSingle()

            if (!appt) {
                setLookupError(en ? "No matching reference code found." : "Walang tumugmang reference code.");
                return
            }

            const app = appt.applications
            if (app.status === "claimed") {
                setLookupError(en
                    ? `Already released on ${new Date(app.claimed_at).toLocaleString("en-PH")}.`
                    : `Naibigay na noong ${new Date(app.claimed_at).toLocaleString("en-PH")}.`)
                return
            }
            if (app.status !== "approved") {
                setLookupError(en ? "This application is not in approved status." : "Hindi approved ang aplikasyong ito.")
                return
            }
            setLookupResult({appointment: appt, application: app})
        }

        async function confirmRelease() {
            if (!lookupResult) return
            setReleasing(true)
            const app = lookupResult.application
            await supabase.from("applications").update({
                status: "claimed",
                claimed_at: new Date().toISOString(),
                claimed_by: "admin",
                updated_at: new Date().toISOString(),
            }).eq("id", app.id)
            await supabase.from("application_messages").insert({
                application_id: app.id,
                message: en ? "Subsidy successfully claimed at venue." : "Matagumpay na naibigay ang subsidy sa venue.",
                sent_by: "admin",
            })
            setReleasing(false)
            setLookupResult(null)
            setScanning(false)
            showToast(en ? "Subsidy marked as released." : "Naitala bilang naibigay ang subsidy.")
            loadAll()
        }

        async function sendReply(app) {
            if (!replyMessage.trim()) return
            setSendingReply(true)
            await supabase.from("application_messages").insert({
                application_id: app.id,
                message: replyMessage,
                sent_by: "admin",
            })
            await supabase.from("applications").update({
                admin_message: replyMessage,
                driver_seen_latest: false,
                updated_at: new Date().toISOString(),
            }).eq("id", app.id)
            setSendingReply(false)
            setReplyingId(null)
            setReplyMessage("")
            showToast(en ? "Reply sent to driver." : "Naipadala ang tugon sa driver.")
            loadAll()
            if (refreshApps) refreshApps() // UPDATE DRIVER STATE INSTANTLY
        }

        async function verifyDriver(id, notes) {
            await supabase.from("drivers").update({
                verification_status: "verified",
                verification_notes: notes?.trim() || null
            }).eq("id", id)
            setVerifyNotes("")
            showToast(en ? "Account verified successfully." : "Na-verify ang account.")
            setSelectedDriver(null);
            loadAll()
        }

        async function rejectDriver(driverRow) {
            if (verifyRejectFields.length === 0) {
                showToast(en ? "Please select at least one incorrect field." : "Pumili ng kahit isang maling field.")
                return
            }
            const fields = verifyRejectFields.join(", ")
            const combined = verifyNotes.trim() ? `${fields} — ${verifyNotes.trim()}` : fields
            await supabase.from("drivers").update({
                verification_status: "rejected",
                verification_notes: combined
            }).eq("id", driverRow.id)
            showToast(en ? "Account rejected." : "Tinanggihan ang account.")
            setVerifyRejectFields([]);
            setVerifyNotes("");
            setSelectedDriver(null);
            loadAll()
        }

        async function saveEdit(e) {
            e.preventDefault()
            setSavingEdit(true)
            const {error} = await supabase.from("payout_events").update({
                program_name: editForm.program_name,
                program_agency: editForm.program_agency,
                program_amount: editForm.program_amount,
                venue: editForm.venue,
                event_date: editForm.event_date,
                time_start: editForm.time_start,
                time_end: editForm.time_end,
                application_deadline: editForm.application_deadline,
                description: editForm.description || null,
                qualified_denominations: editForm.qualified_denominations || null,
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
            const {data} = await supabase
                .from("applications")
                .select("*, drivers(full_name, last_name, first_name, middle_name, mobile, license_number, plate_number, denomination, operator_name, ewallet_type, ewallet_number)")
                .eq("event_id", ev.id)
            if (!data || data.length === 0) {
                showToast(en ? "No applicants yet." : "Wala pang nag-apply.");
                return
            }
            const headers = ["Full Name", "Last Name", "First Name", "Middle Name", "Mobile", "License No", "Plate No", "Denomination", "Operator", "E-wallet Type", "E-wallet No", "Status", "Applied At"]
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
            const blob = new Blob([csv], {type: "text/csv"})
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
        { ico: "📷", lbl: en ? "Verify & Release" : "I-verify at Ibigay", key: "claims" },
    ]

        return (
            <div>
                <div className="ph"><h1>Admin Panel Desk</h1><p>UPLIFT Subsidy Core Suite</p></div>
                <div className="pad">
                    <div className="admin-grid">
                        {tiles.map(t => (
                            <div key={t.key} className={`atile ${section === t.key ? "active-tile" : ""}`}
                                 onClick={() => setSection(t.key)}>
                                <div className="atile-ico">{t.ico}</div>
                                <div className="atile-lbl">{t.lbl}</div>
                            </div>
                        ))}
                    </div>

                    {section === "create" && (
                        <div className="asec">
                            <div
                                className="asec-title">📅 {en ? "Create New Payout Event" : "Gumawa ng Bagong Payout Event"}</div>
                            <form onSubmit={publishEvent}>
                                <div className="fg">
                                    <label className="fl">{en ? "Program Name *" : "Pangalan ng Programa *"}</label>
                                    <input className="fi" value={eventForm.program_name}
                                           onChange={e => updateForm("program_name", e.target.value)}/>
                                </div>
                                <div className="fg">
                                    <label className="fl">Amount</label>
                                    <input className="fi" value={eventForm.program_amount} onChange={e => updateForm("program_amount", e.target.value.replace(/[^0-9.]/g, ''))} />
                                </div>
                                <div className="fg"><label className="fl">Venue *</label><input className="fi"
                                                                                                value={eventForm.venue}
                                                                                                onChange={e => updateForm("venue", e.target.value)}/>
                                </div>
                                <div className="fg">
                                    <label
                                        className="fl">{en ? "Qualified Denominations" : "Kwalipikadong Denominasyon"}</label>
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 4,
                                        marginBottom: 4
                                    }}>
                                        {["MPUJ", "TPUJ", "MUVE", "TUVE", "MPUB", "PUB", "Mini-Bus", "School Transport", "Taxi"].map(d => (
                                            <label key={d} style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                fontSize: 12,
                                                cursor: "pointer",
                                                color: "var(--navy)"
                                            }}>
                                                <input type="checkbox"
                                                       checked={eventForm.qualified_denominations.includes(d)}
                                                       onChange={e => {
                                                           setEventForm(p => ({
                                                               ...p,
                                                               qualified_denominations: e.target.checked ? [...p.qualified_denominations, d] : p.qualified_denominations.filter(x => x !== d)
                                                           }))
                                                       }}/>
                                                {d}
                                            </label>
                                        ))}
                                    </div>
                                    <div
                                        className="fh">{en ? "Leave all unchecked to allow any denomination to apply." : "Iwanang walang tsek para payagan ang lahat ng denominasyon na mag-apply."}</div>
                                </div>
                                <div className="two-col">
                                    <div className="fg"><label
                                        className="fl">{en ? "Payout Date *" : "Petsa ng Payout *"}</label><input
                                        className="fi" type="date" value={eventForm.event_date}
                                        min={todayStr}
                                        onChange={e => updateForm("event_date", e.target.value)}/></div>
                                </div>
                                <div className="fg">
                                    <label
                                        className="fl">{en ? "Application Deadline (Date and Time) *" : "Deadline ng Aplikasyon (Petsa at Oras) *"}</label>
                                    <input className="fi" type="datetime-local" value={eventForm.application_deadline}
                                           onChange={e => updateForm("application_deadline", e.target.value)}/>
                                    <div
                                        className="fh">{en ? "Drivers can no longer apply for this subsidy after this date and time." : "Hindi na makakapag-apply ang mga driver pagkatapos ng petsa at oras na ito."}</div>
                                </div>
                                <div className="fg">
                                    <label
                                        className="fl">{en ? "Description / Instructions for Drivers" : "Paglalarawan / Mga Tagubilin para sa mga Driver"}</label>
                                    <textarea className="fta"
                                              placeholder={en ? "e.g. Bring original Driver's License and OR/CR. Wear proper attire." : "hal. Magdala ng orihinal na Driver's License at OR/CR. Magsuot ng tamang damit."}
                                              value={eventForm.description}
                                              onChange={e => updateForm("description", e.target.value)}
                                              style={{minHeight: 80}}/>
                                    <div
                                        className="fh">{en ? "This will be shown to drivers when they view or apply for this subsidy." : "Makikita ito ng mga driver kapag tiningnan o nag-apply sa subsidy na ito."}</div>
                                </div>
                                <button className="btn gold" type="submit"
                                        disabled={saving}>{saving ? "..." : "Publish Event"}</button>
                            </form>
                        </div>
                    )}

                    {section === "events" && (
                        <div className="asec">
                            <div className="asec-title">🗂️ All Events</div>
                            {events.length === 0 ? (
                                <div className="empty">
                                    <div>{en ? "No events yet." : "Wala pang event."}</div>
                                </div>
                            ) : events.map(ev => (
                                <div key={ev.id} style={{padding: "10px 0", borderBottom: "1px solid var(--border)"}}>
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start"
                                    }}>
                                        <div style={{flex: 1}}>
                                            <div className="arow-name">{ev.program_name}</div>
                                            <div className="arow-detail">{ev.program_agency} ·
                                                ₱{ev.program_amount}</div>
                                            <div className="arow-detail">📅 {ev.event_date} · 📍 {ev.venue}</div>
                                            <div className="arow-detail">🕐 {ev.time_start} – {ev.time_end}</div>
                                            {ev.application_deadline && (
                                                <div className="arow-detail" style={{color: "var(--brick)"}}>
                                                    ⚠️ {en ? "Deadline:" : "Deadline:"} {new Date(ev.application_deadline).toLocaleString("en-PH", {
                                                    month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                                                })}
                                                </div>
                                            )}
                                            {ev.description && (
                                                <div className="arow-detail" style={{
                                                    fontStyle: "italic",
                                                    color: "var(--slate)"
                                                }}>📋 {ev.description}</div>
                                            )}

                                        </div>
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                            marginLeft: 10,
                                            flexShrink: 0
                                        }}>
                                            <button className="btn sm navy-o"
                                                    onClick={() => downloadExcel(ev)}>⬇ {en ? "Export" : "I-export"}</button>
                                            <button className="btn sm outline" onClick={() => {
                                                setEditingEvent(ev);
                                                setEditForm({...ev})
                                            }}>✏️ {en ? "Edit" : "I-edit"}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {editingEvent && (
                                <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
                                    <div className="modal-card"
                                         style={{maxWidth: 500, maxHeight: "85vh", overflowY: "auto"}}
                                         onClick={e => e.stopPropagation()}>
                                        <div className="modal-title">✏️ {en ? "Edit Event" : "I-edit ang Event"}</div>
                                        <form onSubmit={saveEdit}>
                                            <div className="fg"><label
                                                className="fl">{en ? "Program Name" : "Pangalan ng Program"}</label><input
                                                className="fi" value={editForm.program_name || ""}
                                                onChange={e => setEditForm(p => ({
                                                    ...p,
                                                    program_name: e.target.value
                                                }))}/></div>

                                            <div className="fg"><label className="fl">{en ? "Amount" : "Halaga"}</label><input
                                                className="fi" value={editForm.program_amount || ""}
                                                onChange={e => setEditForm(p => ({
                                                    ...p,
                                                    program_amount: e.target.value.replace(/[^0-9.]/g, '')
                                                }))}/></div>
                                            <div className="fg"><label
                                                className="fl">{en ? "Venue" : "Venue"}</label><input className="fi"
                                                                                                      value={editForm.venue || ""}
                                                                                                      onChange={e => setEditForm(p => ({
                                                                                                          ...p,
                                                                                                          venue: e.target.value
                                                                                                      }))}/></div>
                                            <div className="fg">
                                                <label
                                                    className="fl">{en ? "Qualified Denominations" : "Kwalipikadong Denominasyon"}</label>
                                                <div style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "1fr 1fr",
                                                    gap: 4,
                                                    marginBottom: 4
                                                }}>
                                                    {["MPUJ", "TPUJ", "MUVE", "TUVE", "MPUB", "PUB", "Mini-Bus", "School Transport", "Taxi"].map(d => {
                                                        const selected = (editForm.qualified_denominations || "").split(",").map(s => s.trim()).filter(Boolean)
                                                        return (
                                                            <label key={d} style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 5,
                                                                fontSize: 12,
                                                                cursor: "pointer",
                                                                color: "var(--navy)"
                                                            }}>
                                                                <input type="checkbox" checked={selected.includes(d)}
                                                                       onChange={e => {
                                                                           const next = e.target.checked ? [...selected, d] : selected.filter(x => x !== d)
                                                                           setEditForm(p => ({
                                                                               ...p,
                                                                               qualified_denominations: next.join(", ")
                                                                           }))
                                                                       }}/>
                                                                {d}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                                <div
                                                    className="fh">{en ? "Leave all unchecked to allow any denomination to apply." : "Iwanang walang tsek para payagan ang lahat ng denominasyon na mag-apply."}</div>
                                            </div>
                                            <div className="fg"><label
                                                className="fl">{en ? "Payout Date" : "Petsa ng Payout"}</label><input
                                                className="fi" type="date" value={editForm.event_date || ""}
                                                min={todayStr}
                                                onChange={e => setEditForm(p => ({...p, event_date: e.target.value}))}/>
                                            </div>
                                            <div className="two-col">
                                                <div className="fg"><label
                                                    className="fl">{en ? "Time Start" : "Oras ng Simula"}</label><input
                                                    className="fi" type="time" value={editForm.time_start || ""}
                                                    onChange={e => setEditForm(p => ({
                                                        ...p,
                                                        time_start: e.target.value
                                                    }))}/></div>
                                                <div className="fg"><label
                                                    className="fl">{en ? "Time End" : "Oras ng Katapusan"}</label><input
                                                    className="fi" type="time" value={editForm.time_end || ""}
                                                    onChange={e => setEditForm(p => ({
                                                        ...p,
                                                        time_end: e.target.value
                                                    }))}/></div>
                                            </div>
                                            <div className="fg"><label
                                                className="fl">{en ? "Application Deadline" : "Deadline ng Aplikasyon"}</label><input
                                                className="fi" type="datetime-local"
                                                value={editForm.application_deadline ? editForm.application_deadline.slice(0, 16) : ""}
                                                onChange={e => setEditForm(p => ({
                                                    ...p,
                                                    application_deadline: e.target.value
                                                }))}/></div>
                                            <div className="fg"><label
                                                className="fl">{en ? "Description / Instructions" : "Paglalarawan / Mga Tagubilin"}</label><textarea
                                                className="fta" value={editForm.description || ""}
                                                onChange={e => setEditForm(p => ({...p, description: e.target.value}))}
                                                style={{minHeight: 80}}/></div>
                                            <div style={{display: "flex", gap: 8, marginTop: 8}}>
                                                <button className="btn gold" type="submit"
                                                        disabled={savingEdit}>{savingEdit ? "..." : (en ? "Save Changes" : "I-save ang mga Pagbabago")}</button>
                                                <button className="btn outline" type="button" onClick={() => {
                                                    setEditingEvent(null);
                                                    setEditForm({})
                                                }}>{en ? "Cancel" : "Kanselahin"}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {section === "apps" && (
                        <div className="asec">
                            <div
                                className="asec-title">📋 {en ? "Pending Applications" : "Mga Nakabinbing Aplikasyon"}</div>
                            {pendingApps.length === 0 ? (
                                <div className="empty">
                                    <div>{en ? "No pending applications." : "Walang nakabinbing aplikasyon."}</div>
                                </div>
                            ) : pendingApps.map(a => (
                                <div key={a.id} style={{
                                    paddingBottom: 12,
                                    borderBottom: "1px solid var(--border)",
                                    marginBottom: 8
                                }}>
                                    <div className="arow" style={{cursor: "default", border: "none", padding: 0}}>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div className="arow-name">{a.drivers?.full_name}</div>
                                            <div className="arow-detail">{a.drivers?.license_number}</div>
                                            <div
                                                className="arow-detail">{a.payout_events?.program_name} · {a.payout_events?.venue}</div>
                                            <div
                                                className="arow-detail">{new Date(a.applied_at).toLocaleDateString()}</div>
                                            {a.admin_message && (
                                                <div style={{fontSize: 11, color: "var(--jade)", marginTop: 4}}>
                                                    ✓ {en ? "Reply sent" : "Naipadala ang tugon"}
                                                </div>
                                            )}
                                        </div>
                                        <div className="btn-row" style={{flexDirection: "column", gap: 4}}>
                                            <button className="btn sm jade"
                                                    onClick={() => setReplyingId(`approve_${a.id}`)}>✓ {en ? "Approve" : "Aprubahan"}</button>
                                            <button className="btn sm navy-o" onClick={() => {
                                                setReplyingId(replyingId === a.id ? null : a.id);
                                                setReplyMessage("")
                                            }}>✉️ {en ? "Reply" : "Tumugon"}</button>
                                            <button className="btn sm brick-o" onClick={() => {
                                                setRejectingId(a.id);
                                                setRejectFields([])
                                            }}>✕ {en ? "Reject" : "Tanggihan"}</button>
                                        </div>
                                    </div>

                                    {/* Reply panel */}
                                    {replyingId === a.id && (
                                        <div style={{
                                            background: "var(--jade-bg)",
                                            border: "1px solid var(--jade)",
                                            borderRadius: "var(--r-sm)",
                                            padding: 12,
                                            marginTop: 8
                                        }}>
                                            <div style={{
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                fontWeight: 700,
                                                fontSize: 13,
                                                marginBottom: 8,
                                                color: "var(--jade)"
                                            }}>
                                                ✉️ {en ? "Send a message to the driver:" : "Magpadala ng mensahe sa driver:"}
                                            </div>
                                            <div style={{display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8}}>
                                                <button className="btn sm outline"
                                                        onClick={() => setReplyMessage(`Your application for ${a.payout_events?.program_name} has been received and is now under review. Please expect a result within 3–5 business days.`)}>
                                                    📋 {en ? "Under Review" : "Under Review"}
                                                </button>
                                                <button className="btn sm outline"
                                                        onClick={() => setReplyMessage(`Your application for ${a.payout_events?.program_name} requires additional information before it can be processed. Please update your details and resubmit.`)}>
                                                    ⚠️ {en ? "Needs Correction" : "Needs Correction"}
                                                </button>
                                            </div>
                                            <textarea
                                                className="fta"
                                                style={{minHeight: 80, fontSize: 12, marginBottom: 8}}
                                                placeholder={en ? "Type your message to the driver..." : "I-type ang mensahe para sa driver..."}
                                                value={replyMessage}
                                                onChange={e => setReplyMessage(e.target.value)}
                                            />
                                            <div style={{display: "flex", gap: 8}}>
                                                <button className="btn sm jade" onClick={() => sendReply(a)}
                                                        disabled={sendingReply}>
                                                    {sendingReply ? "..." : (en ? "Send Reply" : "Ipadala")}
                                                </button>
                                                <button className="btn sm outline" onClick={() => {
                                                    setReplyingId(null);
                                                    setReplyMessage("")
                                                }}>
                                                    {en ? "Cancel" : "Kanselahin"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Approval message panel */}
                                    {replyingId === `approve_${a.id}` && (
                                        <div style={{
                                            background: "var(--jade-bg)",
                                            border: "1px solid var(--jade)",
                                            borderRadius: "var(--r-sm)",
                                            padding: 12,
                                            marginTop: 8
                                        }}>
                                            <div style={{
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                fontWeight: 700,
                                                fontSize: 13,
                                                marginBottom: 8,
                                                color: "var(--jade)"
                                            }}>
                                                ✅ {en ? "Approval message for driver:" : "Mensahe ng pag-apruba para sa driver:"}
                                            </div>
                                            <textarea
                                                className="fta"
                                                style={{minHeight: 80, fontSize: 12, marginBottom: 8}}
                                                value={approvalMessages[a.id] !== undefined ? approvalMessages[a.id] : `Your application for ${a.payout_events?.program_name} has been approved. Please proceed to ${a.payout_events?.venue} on ${a.payout_events?.event_date} between ${a.payout_events?.time_start} and ${a.payout_events?.time_end}. Bring your Driver's License and reference code.`}
                                                onChange={e => setApprovalMessages(p => ({
                                                    ...p,
                                                    [a.id]: e.target.value
                                                }))}
                                            />
                                            <div style={{display: "flex", gap: 8}}>
                                                <button className="btn sm jade" onClick={() => {
                                                    approveApp(a);
                                                    setReplyingId(null)
                                                }}>
                                                    ✓ {en ? "Confirm Approval" : "Kumpirmahin"}
                                                </button>
                                                <button className="btn sm outline" onClick={() => setReplyingId(null)}>
                                                    {en ? "Cancel" : "Kanselahin"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Rejection checklist */}
                                    {rejectingId === a.id && (
                                        <div style={{
                                            marginTop: 8,
                                            background: "var(--brick-bg)",
                                            border: "1px solid var(--brick)",
                                            borderRadius: "var(--r-sm)",
                                            padding: 12
                                        }}>
                                            <div style={{
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                fontWeight: 700,
                                                fontSize: 13,
                                                marginBottom: 8,
                                                color: "var(--brick)"
                                            }}>
                                                {en ? "Select incorrect fields:" : "Piliin ang mga maling field:"}
                                            </div>
                                            <div style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 4,
                                                marginBottom: 10
                                            }}>
                                                {rejectionOptions.map(opt => (
                                                    <label key={opt} style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 5,
                                                        fontSize: 12,
                                                        cursor: "pointer",
                                                        color: "var(--navy)"
                                                    }}>
                                                        <input type="checkbox" checked={rejectFields.includes(opt)}
                                                               onChange={e => {
                                                                   setRejectFields(prev => e.target.checked ? [...prev, opt] : prev.filter(f => f !== opt))
                                                               }}/>
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                            <label style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                fontSize: 12,
                                                cursor: "pointer",
                                                color: "var(--navy)",
                                                fontWeight: 700,
                                                marginBottom: 10,
                                                borderTop: "1px solid var(--brick)",
                                                paddingTop: 8
                                            }}>
                                                <input type="checkbox" checked={rejectOther}
                                                       onChange={e => setRejectOther(e.target.checked)}/>
                                                {en ? "Other (e.g. does not meet eligibility criteria — explain in notes)" : "Iba pa (hal. hindi kwalipikado — ipaliwanag sa notes)"}
                                            </label>
                                            {rejectOther && (
                                                <div style={{
                                                    fontSize: 11,
                                                    color: "var(--brick)",
                                                    marginBottom: 8,
                                                    fontStyle: "italic"
                                                }}>
                                                    ⚠️ {en ? "Checking \"Other\" means the driver will NOT be allowed to reapply for this subsidy." : "Ang pag-check ng \"Other\" ay nangangahulugang HINDI na papayagang mag-reapply ang driver para sa subsidy na ito."}
                                                </div>
                                            )}
                                            <div className="fg" style={{marginBottom: 8}}>
                                                <label className="fl"
                                                       style={{fontSize: 11}}>{en ? "Additional notes for driver (optional)" : "Karagdagang tala para sa driver (opsyonal)"}</label>
                                                <textarea className="fta" style={{minHeight: 60, fontSize: 12}}
                                                          placeholder={en ? "Add specific notes..." : "Magdagdag ng tala..."}
                                                          value={rejectNotes}
                                                          onChange={e => setRejectNotes(e.target.value)}/>
                                            </div>
                                            <div style={{display: "flex", gap: 8}}>
                                                <button className="btn sm brick-o"
                                                        onClick={() => confirmReject(a)}>{en ? "Confirm Reject" : "Kumpirmahin"}</button>
                                                <button className="btn sm outline" onClick={() => {
                                                    setRejectingId(null);
                                                    setRejectFields([]);
                                                    setRejectOther(false);
                                                    setRejectNotes("")
                                                }}>{en ? "Cancel" : "Kanselahin"}</button>
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
                                    <div key={d.id}
                                         className={`arow ${selectedDriver?.id === d.id ? "selected-item" : ""}`}
                                         onClick={() => setSelectedDriver(d)}>
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
                                            <div style={{fontWeight: 700, fontSize: 13, marginBottom: 6}}>📋 Declared
                                                Registration Metadata
                                            </div>
                                            <table className="data-specs-table">
                                                <tbody>
                                                <tr>
                                                    <td className="lbl-header">Last Name</td>
                                                    <td className="val-content">{selectedDriver.last_name}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">First Name</td>
                                                    <td className="val-content">{selectedDriver.first_name}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Middle Name</td>
                                                    <td className="val-content">{selectedDriver.middle_name}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Extension Name</td>
                                                    <td className="val-content">{selectedDriver.extension_name}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Sex</td>
                                                    <td className="val-content">{selectedDriver.sex}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Date of Birth</td>
                                                    <td className="val-content">{selectedDriver.birth_month} {selectedDriver.birth_day}, {selectedDriver.birth_year} (Age: {selectedDriver.age})</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Region</td>
                                                    <td className="val-content">{selectedDriver.region}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Province</td>
                                                    <td className="val-content">{selectedDriver.province}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">City / Municipality</td>
                                                    <td className="val-content">{selectedDriver.city}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Barangay</td>
                                                    <td className="val-content">{selectedDriver.barangay}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Mobile</td>
                                                    <td className="val-content">{selectedDriver.mobile}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Denomination</td>
                                                    <td className="val-content">{selectedDriver.denomination}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Case Number</td>
                                                    <td className="val-content">{selectedDriver.case_number}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Operator's Name</td>
                                                    <td className="val-content">{selectedDriver.operator_name}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Plate Number</td>
                                                    <td className="val-content">{selectedDriver.plate_number}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Chassis Number</td>
                                                    <td className="val-content">{selectedDriver.chassis_number}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">Driver's License No.</td>
                                                    <td className="val-content">{selectedDriver.license_number}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">E-wallet Type</td>
                                                    <td className="val-content">{selectedDriver.ewallet_type}</td>
                                                </tr>
                                                <tr>
                                                    <td className="lbl-header">E-wallet Number</td>
                                                    <td className="val-content">{selectedDriver.ewallet_number}</td>
                                                </tr>
                                                </tbody>
                                            </table>

                                            <div style={{
                                                marginTop: 12,
                                                padding: 10,
                                                background: "rgba(0,0,0,0.02)",
                                                borderRadius: 8
                                            }}>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: 12,
                                                    marginBottom: 4,
                                                    color: "var(--brick)"
                                                }}>Flag Discrepancy Reasons
                                                </div>
                                                <div style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "1fr 1fr",
                                                    gap: 4,
                                                    marginBottom: 10
                                                }}>
                                                    {rejectionOptions.map(opt => (
                                                        <label key={opt} style={{
                                                            fontSize: 11,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 4
                                                        }}>
                                                            <input type="checkbox"
                                                                   checked={verifyRejectFields.includes(opt)}
                                                                   onChange={e => setVerifyRejectFields(p => e.target.checked ? [...p, opt] : p.filter(x => x !== opt))}/>
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="fg" style={{marginBottom: 8, marginTop: 8}}>
                                                    <label className="fl"
                                                           style={{fontSize: 11}}>{en ? "Notes for driver (optional)" : "Tala para sa driver (opsyonal)"}</label>
                                                    <textarea className="fta" style={{minHeight: 60, fontSize: 12}}
                                                              placeholder={en ? "Add any notes visible to the driver..." : "Magdagdag ng tala na makikita ng driver..."}
                                                              value={verifyNotes}
                                                              onChange={e => setVerifyNotes(e.target.value)}/>
                                                </div>
                                                <div style={{display: "flex", gap: 6}}>
                                                    <button className="btn sm jade" style={{flex: 1}}
                                                            onClick={() => verifyDriver(selectedDriver.id, verifyNotes)}>✓ {en ? "Verify" : "I-verify"}</button>
                                                    <button className="btn sm brick-o" style={{flex: 1}}
                                                            onClick={() => rejectDriver(selectedDriver)}>✕ {en ? "Reject" : "Itanggi"}</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{fontWeight: 700, fontSize: 13, marginBottom: 8}}>🖼️ Submitted
                                                Documents
                                            </div>
                                            {selectedDriver.document_urls ? (
                                                selectedDriver.document_urls.split(",").map((url, i) => (
                                                    <div key={i} style={{marginBottom: 10}}>
                                                        <div style={{
                                                            fontSize: 11,
                                                            color: "var(--slate)",
                                                            marginBottom: 4
                                                        }}>
                                                            {en ? `Document ${i + 1}` : `Dokumento ${i + 1}`} —
                                                            <a href={url} target="_blank" rel="noreferrer"
                                                               style={{color: "var(--gold-dk)", marginLeft: 4}}>
                                                                {en ? "Open full size" : "Buksan nang buo"}
                                                            </a>
                                                        </div>
                                                        {url.endsWith(".pdf") ? (
                                                            <div style={{
                                                                background: "var(--cream)",
                                                                border: "1px solid var(--border)",
                                                                borderRadius: 8,
                                                                padding: 12,
                                                                textAlign: "center",
                                                                fontSize: 12,
                                                                color: "var(--slate)"
                                                            }}>
                                                                📄 PDF — <a href={url} target="_blank" rel="noreferrer"
                                                                           style={{color: "var(--gold-dk)"}}>{en ? "Click to view" : "I-click para tingnan"}</a>
                                                            </div>
                                                        ) : (
                                                            <a href={url} target="_blank" rel="noreferrer">
                                                                <img src={url} alt={`Document ${i + 1}`} style={{
                                                                    width: "100%",
                                                                    borderRadius: 8,
                                                                    border: "1px solid var(--border)"
                                                                }}/>
                                                            </a>
                                                        )}
                                                    </div>
                                                ))
                                            ) : selectedDriver.license_url ? (
                                                <a href={selectedDriver.license_url} target="_blank" rel="noreferrer">
                                                    <img src={selectedDriver.license_url} alt="License" style={{
                                                        width: "100%",
                                                        borderRadius: 8,
                                                        border: "1px solid var(--border)"
                                                    }}/>
                                                </a>
                                            ) : (
                                                <div style={{
                                                    fontSize: 12,
                                                    color: "var(--slate)",
                                                    padding: 12,
                                                    background: "var(--cream)",
                                                    borderRadius: 8
                                                }}>
                                                    {en ? "No documents submitted yet." : "Wala pang naisumiteng dokumento."}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : "Select driver item row block from layout list."}
                            </div>
                        </div>
                    )}

                    {section === "claims" && (
                        <div>
                            <button className="btn outline" style={{ marginBottom: 16 }} onClick={() => showToast(en ? "Camera scanning coming soon." : "Malapit nang magamit ang pag-scan.")}>
                                📷 {en ? "Scan QR Code" : "I-scan ang QR Code"}
                            </button>

                            {!lookupResult ? (
                                <>
                                    <input className="fi" placeholder={en ? "Enter reference code (e.g. REF-12345678)" : "I-type ang reference code"}
                                           value={manualCode} onChange={e => setManualCode(e.target.value)} />
                                    <button className="btn gold" style={{ marginTop: 10 }} onClick={() => lookupReferenceCode(manualCode)}>
                                        {en ? "Look Up" : "Hanapin"}
                                    </button>
                                    {lookupError && <div style={{ color: "var(--brick)", marginTop: 10 }}>{lookupError}</div>}
                                </>
                            ) : (
                                <div className="card" style={{ padding: 16 }}>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>{lookupResult.application.drivers?.full_name}</div>
                                    <div style={{ fontSize: 13, color: "var(--slate)" }}>{lookupResult.application.drivers?.license_number}</div>
                                    <div style={{ marginTop: 8 }}>{lookupResult.application.payout_events?.program_name} — ₱{lookupResult.application.payout_events?.program_amount}</div>
                                    <div style={{ fontSize: 12, color: "var(--slate)" }}>{lookupResult.appointment.venue}, {lookupResult.appointment.assigned_date}</div>
                                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                                        <button className="btn jade" disabled={releasing} onClick={confirmRelease}>
                                            {releasing ? "..." : (en ? "✅ Confirm & Release Subsidy" : "✅ Kumpirmahin at Ibigay")}
                                        </button>
                                        <button className="btn outline" onClick={() => setLookupResult(null)}>{en ? "Cancel" : "Kanselahin"}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {section === "grievances" && (() => {
                        const openGrievance = openGrievanceId ? grievances.find(g => g.id === openGrievanceId) : null
                        if (openGrievance) {
                            return (
                                <AdminGrievanceChat
                                    grievance={openGrievance}
                                    en={en}
                                    showToast={showToast}
                                    onBack={() => setOpenGrievanceId(null)}
                                    onDone={() => {
                                        loadAll()
                                        if (refreshConcerns) refreshConcerns()
                                    }}
                                />
                            )
                        }
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

                        const renderRow = (g) => (
                            <div key={g.id} className="arow" style={{cursor: "pointer", alignItems: "flex-start"}}
                                 onClick={() => setOpenGrievanceId(g.id)}>
                                <div style={{flex: 1}}>
                                    <div className="arow-name">{g.drivers?.full_name} · {g.drivers?.mobile}</div>
                                    <div className="arow-detail">{g.concern_type}</div>
                                    <div className="arow-detail"
                                         style={{marginTop: 4, color: "var(--navy)"}}>{g.message}</div>
                                    <div className="arow-detail">{new Date(g.created_at).toLocaleString()}</div>
                                </div>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    gap: 6,
                                    flexShrink: 0,
                                    marginLeft: 10
                                }}>
                                    {(g.grievance_messages || []).some(m => m.sent_by === "admin") && (
                                        <span style={{
                                            fontSize: 10,
                                            color: "var(--jade)"
                                        }}>✓ {en ? "Replied" : "Nasagot"}</span>
                                    )}
                                    {g.status === "resolved" &&
                                        <span className="pill approved">{en ? "Resolved" : "Nalutas"}</span>}
                                    <span style={{
                                        fontSize: 11,
                                        color: "var(--slate)"
                                    }}>{en ? "View & Reply" : "Tingnan"} ›</span>
                                </div>
                            </div>
                        )

                        return (
                            <div className="asec">
                                <div className="asec-title">💬 {en ? "Help Requests" : "Mga Hiling ng Tulong"}</div>
                                {grievances.length === 0 ? (
                                    <div className="empty">
                                        <div>{en ? "No help requests yet." : "Wala pang hiling ng tulong."}</div>
                                    </div>
                                ) : (
                                    <>
                                        {groupNames.map(name => (
                                            <div key={name} style={{marginBottom: 14}}>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: 13,
                                                    color: "var(--navy)",
                                                    marginBottom: 6
                                                }}>{name}</div>
                                                {grouped[name].map(renderRow)}
                                            </div>
                                        ))}
                                        {general.length > 0 && (
                                            <div>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: 13,
                                                    color: "var(--navy)",
                                                    marginBottom: 6
                                                }}>{en ? "General Inquiries" : "Pangkalahatang Tanong"}</div>
                                                {general.map(renderRow)}
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

