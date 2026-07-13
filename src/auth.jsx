import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"
import { PH_CITIES_BY_PROVINCE, PH_PROVINCES_BY_REGION, PH_REGIONS, SECURITY_QUESTIONS, cleanMobile, dlCodeHint, formatCaseNumber, formatLicenseNumber, formatMobileDisplay, formatPlateNumber, licenseNumberPlaceholder, securityQuestionLabel, toProperCase, toProperCaseKeepAcronyms } from "./shared.js"

export function SignIn({ en, onNav, onLogin, showTutorial, setShowTutorial }) {
    const [mobile, setMobile] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Tutorial State
    const [tutStep, setTutStep] = useState(0)

    // Reset step when closed
    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    // Elevate the global language button on Step 0, lock scroll, and auto-scroll to the highlighted step
    useEffect(() => {
        if (showTutorial) {
            document.body.classList.add("lock-scroll")
            if (tutStep === 0) {
                document.body.classList.add("highlight-lang-btn")
            } else {
                document.body.classList.remove("highlight-lang-btn")
            }
            const element = document.getElementById(`tut-step-${tutStep}`)
            if (element) element.scrollIntoView({ behavior: "smooth", block: "center" })
        } else {
            document.body.classList.remove("lock-scroll")
            document.body.classList.remove("highlight-lang-btn")
        }

        return () => {
            document.body.classList.remove("lock-scroll")
            document.body.classList.remove("highlight-lang-btn")
        }
    }, [showTutorial, tutStep])

    const tutSteps = [
        {
            en: "Click this button at the top right if you want to change the interface language between English and Filipino.",
            fil: "I-click ang button na ito sa kanang itaas kung gusto mong palitan ang wika ng interface sa Ingles o Filipino."
        },
        {
            en: "Enter your registered mobile number and your secure password here to access your account.",
            fil: "Ilagay ang iyong rehistradong numero ng telepono at secure na password dito upang ma-access ang iyong account."
        },
        {
            en: "Don't have an account yet? Click here to register and create your UPLIFT profile.",
            fil: "Wala ka pang account? I-click ito para mag-rehistro at gumawa ng iyong UPLIFT profile."
        },
        {
            en: "If you forgot your password or changed your mobile number, use these links to recover your account.",
            fil: "Kung nakalimutan mo ang iyong password o nagpalit ka ng numero, gamitin ang mga link na ito upang mabawi ang iyong account."
        }
    ]

    const getHighlightStyle = (stepIndex, paddingAmt = 0) => {
        if (showTutorial && tutStep === stepIndex) {
            return {
                position: "relative",
                zIndex: 1000,
                boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                pointerEvents: "none", // Prevent accidental clicks during tutorial
                background: "#fff",
                borderRadius: "var(--r)",
                padding: `${paddingAmt}px`,
                margin: `-${paddingAmt}px`, // Offset padding so layout doesn't break
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
                    💡 {en ? "Sign-In Guide" : "Gabay sa Pag-Sign In"} ({tutStep + 1}/{tutSteps.length})
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

            {/* ── TUTORIAL BACKDROP (spotlight effect only — guide text renders inline below each section) ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

            <div id="tut-step-0">
                <GuideBox stepIndex={0} />
            </div>

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

                    {/* Tutorial Step 1: Inputs & Submit */}
                    <div id="tut-step-1" style={getHighlightStyle(1, 10)}>
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
                    </div>
                    <GuideBox stepIndex={1} />
                </form>

                {/* Tutorial Step 2: Sign Up */}
                <div id="tut-step-2" style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14, ...getHighlightStyle(2, 6) }}>
                    {en ? "No account yet?" : "Wala pang account?"} <span className="link" onClick={() => onNav("signup")}>{en ? "Sign up" : "Mag-sign up"}</span>
                </div>
                <GuideBox stepIndex={2} />

                {/* Tutorial Step 3: Account Recovery */}
                <div id="tut-step-3" style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 8, ...getHighlightStyle(3, 6) }}>
                    <span className="link" onClick={() => onNav("forgot")}>{en ? "Forgot password?" : "Nakalimutan ang password?"}</span>
                    {" · "}
                    <span className="link" onClick={() => onNav("changenumber")}>{en ? "Changed your number?" : "Nagpalit ng numero?"}</span>
                </div>
                <GuideBox stepIndex={3} />
            </div>
        </div>
    )
}

export function ChangeNumber({ en, onNav, showTutorial, setShowTutorial }) {
    const [step, setStep] = useState(1)
    const [oldMobile, setOldMobile] = useState("")
    const [password, setPassword] = useState("")
    const [securityQuestion, setSecurityQuestion] = useState("")
    const [securityQuestion2, setSecurityQuestion2] = useState("")
    const [securityAnswer, setSecurityAnswer] = useState("")
    const [securityAnswer2, setSecurityAnswer2] = useState("")
    const [newMobile, setNewMobile] = useState("")
    const [confirmMobile, setConfirmMobile] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // Tutorial State
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

    // Keep the tutorial in sync with whichever step the driver is actually on
    useEffect(() => {
        if (showTutorial) setTutStep(step - 1)
    }, [step, showTutorial])

    // Close the tutorial automatically once the number change succeeds
    useEffect(() => {
        if (success) setShowTutorial(false)
    }, [success])

    const tutSteps = [
        {
            en: "This is the 4-step process to change your registered mobile number. Enter your current mobile number and password here to start verifying your identity.",
            fil: "Ito ang 4-hakbang na proseso para palitan ang rehistradong numero. Ilagay ang iyong kasalukuyang numero at password dito para simulan ang pag-verify."
        },
        {
            en: "Your identity has been verified. Now answer your first security question.",
            fil: "Na-verify na ang iyong pagkakakilanlan. Sagutin ngayon ang iyong unang security question."
        },
        {
            en: "One more question to go. Answer your second security question.",
            fil: "Isa pang tanong na lang. Sagutin ang iyong pangalawang security question."
        },
        {
            en: "Almost done! Enter and confirm your new mobile number, then submit to complete the change.",
            fil: "Halos tapos na! Ilagay at kumpirmahin ang iyong bagong numero, pagkatapos isumite para makumpleto ang pagbabago."
        }
    ]

    const getHighlightStyle = (stepIndex) => {
        if (showTutorial && tutStep === stepIndex) {
            return {
                position: "relative",
                zIndex: 1000,
                boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                background: "#fff",
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
                margin: "10px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)"
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
                    💡 {en ? "Change Number Guide" : "Gabay sa Pagpapalit ng Numero"} ({tutStep + 1}/{tutSteps.length})
                </div>
                <div style={{ fontSize: 13, color: "#fff", marginBottom: 14, lineHeight: 1.6 }}>
                    {en ? tutSteps[tutStep].en : tutSteps[tutStep].fil}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn outline sm" style={{ margin: 0, background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} onClick={() => setShowTutorial(false)}>
                        {en ? "Skip Tutorial" : "Laktawan ang Tutorial"}
                    </button>
                </div>
            </div>
        )
    }

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
        if (!data.security_question || !data.security_question_2) {
            setError(en ? "This account doesn't have both security questions set up. Please contact support." : "Kulang ang security questions ng account na ito. Makipag-ugnayan sa suporta.")
            return
        }
        setSecurityQuestion(data.security_question)
        setSecurityQuestion2(data.security_question_2)
        setStep(2)
    }

    async function handleVerifyFirstAnswer(e) {
        e.preventDefault()
        if (!securityAnswer) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("security_answer").eq("mobile", oldMobile).single()
        setLoading(false)
        if (data?.security_answer !== securityAnswer.trim().toLowerCase()) {
            setError(en ? "Incorrect answer. Please try again." : "Maling sagot. Subukan muli.")
            return
        }
        setStep(3)
    }

    async function handleVerifySecondAnswer(e) {
        e.preventDefault()
        if (!securityAnswer2) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("security_answer_2").eq("mobile", oldMobile).single()
        setLoading(false)
        if (data?.security_answer_2 !== securityAnswer2.trim().toLowerCase()) {
            setError(en ? "Incorrect answer. Please try again." : "Maling sagot. Subukan muli.")
            return
        }
        setStep(4)
    }

    async function handleConfirmNewNumber(e) {
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
        setLoading(true)
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
            {/* ── TUTORIAL BACKDROP ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

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
                    {en ? "Verify your account and both security questions first to make a change." : "I-verify muna ang iyong account at ang dalawang security question para gumawa ng pagbabago."}
                </p>

                <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
                    {[1,2,3,4].map(n => (
                        <div key={n} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: "50%", margin: "0 auto 4px",
                                background: step >= n ? "var(--navy)" : "var(--border)",
                                color: step >= n ? "#fff" : "var(--slate)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700
                            }}>{n}</div>
                            <div style={{ fontSize: 9, color: "var(--slate)" }}>
                                {n === 1 ? (en ? "Old number + password" : "Lumang numero + password") : n === 2 ? (en ? "Question 1" : "Tanong 1") : n === 3 ? (en ? "Question 2" : "Tanong 2") : (en ? "New number" : "Bagong numero")}
                            </div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert amber">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleVerifyAccount}>
                        <div id="tut-step-0" style={getHighlightStyle(0)}>
                            <div className="fg">
                                <label className="fl">{en ? "Current Mobile Number" : "Kasalukuyang Numero ng Telepono"}</label>
                                <input className="fi" placeholder="09XX XXX XXXX" value={oldMobile} onChange={e => setOldMobile(e.target.value)} />
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Password" : "Password"}</label>
                                <input className="fi" type="password" placeholder={en ? "Enter your password" : "Ilagay ang iyong password"} value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Account" : "I-verify ang Account")}</button>
                        </div>
                        <GuideBox stepIndex={0} />
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyFirstAnswer}>
                        <div id="tut-step-1" style={getHighlightStyle(1)}>
                            <div className="alert jade">✓ {en ? `Account verified: ${oldMobile}` : `Na-verify ang account: ${oldMobile}`}</div>
                            <div className="fg">
                                <label className="fl">{securityQuestionLabel(securityQuestion, en)}</label>
                                <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} />
                                <div className="fh">{en ? "Not case-sensitive." : "Hindi case-sensitive."}</div>
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Answer" : "I-verify ang Sagot")}</button>
                            <button type="button" className="btn outline" onClick={() => setStep(1)}>{en ? "Back" : "Bumalik"}</button>
                        </div>
                        <GuideBox stepIndex={1} />
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleVerifySecondAnswer}>
                        <div id="tut-step-2" style={getHighlightStyle(2)}>
                            <div className="alert jade">✓ {en ? "First question correct." : "Tama ang unang tanong."}</div>
                            <div className="fg">
                                <label className="fl">{securityQuestionLabel(securityQuestion2, en)}</label>
                                <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer2} onChange={e => setSecurityAnswer2(e.target.value)} />
                                <div className="fh">{en ? "Not case-sensitive." : "Hindi case-sensitive."}</div>
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Answer" : "I-verify ang Sagot")}</button>
                            <button type="button" className="btn outline" onClick={() => setStep(2)}>{en ? "Back" : "Bumalik"}</button>
                        </div>
                        <GuideBox stepIndex={2} />
                    </form>
                )}

                {step === 4 && (
                    <form onSubmit={handleConfirmNewNumber}>
                        <div id="tut-step-3" style={getHighlightStyle(3)}>
                            <div className="alert jade">✓ {en ? "Identity confirmed. Enter your new number." : "Nakumpirma ang pagkakakilanlan. Ilagay ang bagong numero."}</div>
                            <div className="fg">
                                <label className="fl">{en ? "New Mobile Number" : "Bagong Numero ng Telepono"}</label>
                                <input className="fi" placeholder="09XX XXX XXXX" value={newMobile} onChange={e => setNewMobile(e.target.value)} />
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Confirm New Mobile Number" : "Kumpirmahin ang Bagong Numero"}</label>
                                <input className="fi" placeholder="09XX XXX XXXX" value={confirmMobile} onChange={e => setConfirmMobile(e.target.value)} />
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Confirm Change" : "Kumpirmahin ang Pagpapalit")}</button>
                            <button type="button" className="btn outline" onClick={() => setStep(3)}>{en ? "Back" : "Bumalik"}</button>
                        </div>
                        <GuideBox stepIndex={3} />
                    </form>
                )}

                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    <span className="link" onClick={() => onNav("signin")}>← {en ? "Back to Sign In" : "Bumalik sa Sign In"}</span>
                </div>
            </div>
        </div>
    )
}

export function ForgotPassword({ en, onNav, showTutorial, setShowTutorial }) {
    const [step, setStep] = useState(1)
    const [mobile, setMobile] = useState("")
    const [securityQuestion, setSecurityQuestion] = useState("")
    const [securityQuestion2, setSecurityQuestion2] = useState("")
    const [securityAnswer, setSecurityAnswer] = useState("")
    const [securityAnswer2, setSecurityAnswer2] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // Tutorial State
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

    // Keep the tutorial in sync with whichever step the driver is actually on
    useEffect(() => {
        if (showTutorial) setTutStep(step - 1)
    }, [step, showTutorial])

    // Close the tutorial automatically once the password reset succeeds
    useEffect(() => {
        if (success) setShowTutorial(false)
    }, [success])

    const tutSteps = [
        {
            en: "This is the 4-step process to recover your account. Enter the mobile number registered to your account to begin.",
            fil: "Ito ang 4-hakbang na proseso para mabawi ang iyong account. Ilagay ang numerong nakarehistro sa iyong account para magsimula."
        },
        {
            en: "Your account has been found. Now answer your first security question.",
            fil: "Nahanap na ang iyong account. Sagutin ngayon ang iyong unang security question."
        },
        {
            en: "One more question to go. Answer your second security question.",
            fil: "Isa pang tanong na lang. Sagutin ang iyong pangalawang security question."
        },
        {
            en: "Almost done! Set your new password, confirm it, then submit to complete the reset.",
            fil: "Halos tapos na! Itakda ang bagong password, kumpirmahin ito, pagkatapos isumite para makumpleto ang pag-reset."
        }
    ]

    const getHighlightStyle = (stepIndex) => {
        if (showTutorial && tutStep === stepIndex) {
            return {
                position: "relative",
                zIndex: 1000,
                boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                background: "#fff",
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
                margin: "10px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)"
            }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>
                    💡 {en ? "Forgot Password Guide" : "Gabay sa Nakalimutang Password"} ({tutStep + 1}/{tutSteps.length})
                </div>
                <div style={{ fontSize: 13, color: "#fff", marginBottom: 14, lineHeight: 1.6 }}>
                    {en ? tutSteps[tutStep].en : tutSteps[tutStep].fil}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button className="btn outline sm" style={{ margin: 0, background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }} onClick={() => setShowTutorial(false)}>
                        {en ? "Skip Tutorial" : "Laktawan ang Tutorial"}
                    </button>
                </div>
            </div>
        )
    }

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
        if (!data.security_question || !data.security_question_2) {
            setError(en ? "This account doesn't have both security questions set up. Please contact support." : "Kulang ang security questions ng account na ito. Makipag-ugnayan sa suporta.")
            return
        }
        setSecurityQuestion(data.security_question)
        setSecurityQuestion2(data.security_question_2)
        setStep(2)
    }

    async function handleVerifyFirstAnswer(e) {
        e.preventDefault()
        if (!securityAnswer) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("security_answer").eq("mobile", mobile).single()
        setLoading(false)
        if (data?.security_answer !== securityAnswer.trim().toLowerCase()) {
            setError(en ? "Incorrect answer. Please try again." : "Maling sagot. Subukan muli.")
            return
        }
        setStep(3)
    }

    async function handleVerifySecondAnswer(e) {
        e.preventDefault()
        if (!securityAnswer2) return
        setLoading(true)
        setError("")
        const { data } = await supabase.from("drivers").select("security_answer_2").eq("mobile", mobile).single()
        setLoading(false)
        if (data?.security_answer_2 !== securityAnswer2.trim().toLowerCase()) {
            setError(en ? "Incorrect answer. Please try again." : "Maling sagot. Subukan muli.")
            return
        }
        setStep(4)
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
            {/* ── TUTORIAL BACKDROP ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

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
                    {en ? "Enter your number, answer both security questions, then set a new password." : "Ilagay ang iyong numero, sagutin ang dalawang security question, pagkatapos ay magtakda ng bagong password."}
                </p>

                <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
                    {[1,2,3,4].map(n => (
                        <div key={n} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: "50%", margin: "0 auto 4px",
                                background: step >= n ? "var(--navy)" : "var(--border)",
                                color: step >= n ? "#fff" : "var(--slate)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700
                            }}>{n}</div>
                            <div style={{ fontSize: 9, color: "var(--slate)" }}>
                                {n === 1 ? (en ? "Mobile number" : "Numero") : n === 2 ? (en ? "Question 1" : "Tanong 1") : n === 3 ? (en ? "Question 2" : "Tanong 2") : (en ? "New password" : "Bagong password")}
                            </div>
                        </div>
                    ))}
                </div>

                {error && <div className="alert amber">{error}</div>}

                {step === 1 && (
                    <form onSubmit={handleFindAccount}>
                        <div id="tut-step-0" style={getHighlightStyle(0)}>
                            <div className="fg">
                                <label className="fl">{en ? "Mobile Number" : "Numero ng Telepono"}</label>
                                <input className="fi" placeholder="09XX XXX XXXX" value={mobile} onChange={e => setMobile(e.target.value)} />
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Continue" : "Magpatuloy")}</button>
                        </div>
                        <GuideBox stepIndex={0} />
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyFirstAnswer}>
                        <div id="tut-step-1" style={getHighlightStyle(1)}>
                            <div className="alert jade">✓ {en ? `Account found for ${mobile}` : `Nahanap ang account para sa ${mobile}`}</div>
                            <div className="fg">
                                <label className="fl">{securityQuestionLabel(securityQuestion, en)}</label>
                                <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} />
                                <div className="fh">{en ? "Not case-sensitive." : "Hindi case-sensitive."}</div>
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Answer" : "I-verify ang Sagot")}</button>
                            <button type="button" className="btn outline" onClick={() => setStep(1)}>{en ? "Back" : "Bumalik"}</button>
                        </div>
                        <GuideBox stepIndex={1} />
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleVerifySecondAnswer}>
                        <div id="tut-step-2" style={getHighlightStyle(2)}>
                            <div className="alert jade">✓ {en ? "First question correct." : "Tama ang unang tanong."}</div>
                            <div className="fg">
                                <label className="fl">{securityQuestionLabel(securityQuestion2, en)}</label>
                                <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer2} onChange={e => setSecurityAnswer2(e.target.value)} />
                                <div className="fh">{en ? "Not case-sensitive." : "Hindi case-sensitive."}</div>
                            </div>
                            <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Answer" : "I-verify ang Sagot")}</button>
                            <button type="button" className="btn outline" onClick={() => setStep(2)}>{en ? "Back" : "Bumalik"}</button>
                        </div>
                        <GuideBox stepIndex={2} />
                    </form>
                )}

                {step === 4 && (
                    <form onSubmit={handleResetPassword}>
                        <div id="tut-step-3" style={getHighlightStyle(3)}>
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
                            <button type="button" className="btn outline" onClick={() => setStep(3)}>{en ? "Back" : "Bumalik"}</button>
                        </div>
                        <GuideBox stepIndex={3} />
                    </form>
                )}

                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    <span className="link" onClick={() => onNav("signin")}>← {en ? "Back to Sign In" : "Bumalik sa Sign In"}</span>
                </div>
            </div>
        </div>
    )
}

export function SignUp({ en, onNav, onLogin, showTutorial, setShowTutorial }) {
    const [step, setStep] = useState(1)
    const [otp, setOtp] = useState("")
    const [noMiddle, setNoMiddle] = useState(false)
    const [noExtension, setNoExtension] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [consented, setConsented] = useState(false)
    const [fieldErrors, setFieldErrors] = useState({})
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const fieldRefs = useRef({})

    // Tutorial State
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

    // The tutorial only covers Step 1 (the form) — close it automatically once OTP verification starts
    useEffect(() => {
        if (step !== 1 && showTutorial) setShowTutorial(false)
    }, [step, showTutorial])

    const tutSteps = [
        {
            en: "Fill in your Personal Information exactly as it appears on your Driver's License. If you have no middle or extension name, check the box instead of leaving it blank.",
            fil: "Punan ang iyong Personal na Impormasyon nang eksaktong tugma sa iyong Driver's License. Kung wala kang middle o extension name, i-check ang box sa halip na iwanang blangko."
        },
        {
            en: "Your Address helps agencies confirm you're within the coverage area for a subsidy.",
            fil: "Ang iyong Tirahan ay tumutulong sa mga ahensya na kumpirmahin kung nasa saklaw ka ng subsidy."
        },
        {
            en: "Your Vehicle and Franchise details must match your official documents exactly — mismatches are one of the most common reasons applications get rejected.",
            fil: "Dapat eksaktong tugma ang iyong Sasakyan at Pransisa sa opisyal na dokumento — isa ito sa pinakakaraniwang dahilan ng pagkatanggi."
        },
        {
            en: "Create a strong Password, then choose two Security Questions only you would know the answer to — these help you recover your account if needed.",
            fil: "Gumawa ng matibay na Password, pagkatapos ay pumili ng dalawang Security Question na ikaw lang ang nakakaalam ng sagot — makakatulong ito sa pagbawi ng account."
        },
        {
            en: "Read the Terms and Conditions, check the consent box, then tap Continue to move on to phone verification.",
            fil: "Basahin ang Mga Tuntunin at Kundisyon, i-check ang consent box, pagkatapos i-tap ang Magpatuloy para sa phone verification."
        }
    ]

    const getHighlightStyle = (stepIndex) => {
        if (showTutorial && tutStep === stepIndex) {
            return {
                position: "relative",
                zIndex: 1000,
                boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                background: "#fff",
                borderRadius: "var(--r)",
                padding: 10,
                margin: -10,
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
                    💡 {en ? "Sign-Up Guide" : "Gabay sa Pag-Sign Up"} ({tutStep + 1}/{tutSteps.length})
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
    function clearFieldError(field) { setFieldErrors(p => { if (!p[field]) return p; const n = { ...p }; delete n[field]; return n }) }

    function onBlurProperCase(field) { set(field, toProperCase(form[field])) }
    function onBlurProperCaseKeepAcronyms(field) { set(field, toProperCaseKeepAcronyms(form[field])) }

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
        return null
    }

    function validateAll() {
        const errs = {}
        const req = (field, msg) => { if (!form[field] || !form[field].toString().trim()) errs[field] = msg || (en ? "This field is required." : "Kailangan ang field na ito.") }

        req("last_name")
        req("first_name")
        if (!noMiddle && !form.middle_name.trim()) errs.middle_name = en ? "Required, or check \"I have no middle name.\"" : "Kailangan, o i-check ang \"Wala akong gitnang pangalan.\""
        if (!noExtension && !form.extension_name.trim()) errs.extension_name = en ? "Required, or check \"I have no extension name.\"" : "Kailangan, o i-check ang \"Wala akong extension name.\""
        req("sex")
        if (!form.birth_month) errs.birth_month = en ? "Required." : "Kailangan."
        if (!form.birth_day) errs.birth_day = en ? "Required." : "Kailangan."
        if (!form.birth_year || form.birth_year.length !== 4) errs.birth_year = en ? "Enter a valid 4-digit year." : "Ilagay ang tamang 4-digit na taon."
        req("region")
        req("province")
        req("city")
        req("barangay")
        req("denomination")

        if (!form.case_number.trim()) errs.case_number = en ? "Required." : "Kailangan."
        else if (!/^\d{4}-\d{4}$/.test(form.case_number.trim())) errs.case_number = en ? "Wrong format. Use YYYY-XXXX (e.g. 2020-1234)." : "Maling format. Gamitin ang YYYY-XXXX (hal. 2020-1234)."

        req("operator_name")
        req("cooperative_name")

        if (!form.plate_number.trim()) errs.plate_number = en ? "Required." : "Kailangan."
        else if (!/^[A-Z]{2,3} \d{3,4}$/.test(form.plate_number.trim())) errs.plate_number = en ? "Wrong format. Use ABC 1234." : "Maling format. Gamitin ang ABC 1234."

        req("chassis_number")

        if (!form.license_number.trim()) errs.license_number = en ? "Required." : "Kailangan."
        else if (!/^[A-Z0-9]{3}-[A-Z0-9]{2}-[A-Z0-9]{6}$/.test(form.license_number.trim())) errs.license_number = en ? "Wrong format. Use C01-XX-XXXXXX." : "Maling format. Gamitin ang C01-XX-XXXXXX."

        const cleanedMobile = cleanMobile(form.mobile)
        if (cleanedMobile.length !== 11 || !cleanedMobile.startsWith("09")) errs.mobile = en ? "Enter a valid 11-digit mobile number (09XX XXX XXXX)." : "Ilagay ang tamang 11-digit na numero (09XX XXX XXXX)."

        const pwError = validatePassword()
        if (pwError) errs.password = pwError
        if (form.password !== form.confirm_password) errs.confirm_password = en ? "Passwords do not match." : "Hindi magkatugma ang mga password."

        if (!form.security_question) errs.security_question = en ? "Please choose a security question." : "Pumili ng security question."
        if (!form.security_answer.trim()) errs.security_answer = en ? "Please answer this question." : "Sagutin ang tanong na ito."
        if (!form.security_question_2) errs.security_question_2 = en ? "Please choose a second security question." : "Pumili ng pangalawang security question."
        if (!form.security_answer_2.trim()) errs.security_answer_2 = en ? "Please answer this question." : "Sagutin ang tanong na ito."
        if (form.security_question && form.security_question === form.security_question_2) {
            errs.security_question_2 = en ? "Choose a different question from Question 1." : "Pumili ng ibang tanong kaysa sa Tanong 1."
        }

        return errs
    }

    function scrollToFirstError(errs) {
        const order = ["last_name","first_name","middle_name","extension_name","sex","birth_month","birth_day","birth_year",
            "region","province","city","barangay","denomination","case_number","operator_name","cooperative_name",
            "plate_number","chassis_number","license_number","mobile","password","confirm_password","security_question","security_answer",
            "security_question_2","security_answer_2"]
        const first = order.find(f => errs[f])
        if (first && fieldRefs.current[first]) {
            fieldRefs.current[first].scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }

    function handleValidateAndSendOtp(e) {
        e.preventDefault()
        if (!consented) { setError(en ? "Please accept the Terms and Conditions." : "Kailangan munang tanggapin ang Terms and Conditions."); return }

        const errs = validateAll()
        setFieldErrors(errs)
        if (Object.keys(errs).length > 0) {
            setError(en ? "Please fix the highlighted fields below." : "Ayusin ang mga naka-highlight na field sa ibaba.")
            scrollToFirstError(errs)
            return
        }

        setError("")
        setStep(2)
        setResendSeconds(180)
    }

    const [resendSeconds, setResendSeconds] = useState(180)
    useEffect(() => {
        if (step !== 2 || resendSeconds <= 0) return
        const t = setTimeout(() => setResendSeconds(s => s - 1), 1000)
        return () => clearTimeout(t)
    }, [step, resendSeconds])

    function handleResendOtp() {
        if (resendSeconds > 0) return
        setResendSeconds(180)
        setError("")
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
            mobile: cleanMobile(form.mobile),
            birth_month: form.birth_month, birth_day: form.birth_day, birth_year: form.birth_year, age: form.age,
            sex: form.sex, denomination: form.denomination, case_number: form.case_number,
            operator_name: form.operator_name, cooperative_name: form.cooperative_name,
            plate_number: form.plate_number,
            chassis_number: form.chassis_number, license_number: form.license_number,
            ewallet_type: form.ewallet_type || null, ewallet_number: form.ewallet_number || null,
            password: form.password,
            philsys_number: cleanMobile(form.mobile),
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
        onLogin(cleanMobile(form.mobile))
    }

    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const days = Array.from({length:31}, (_,i) => String(i+1))
    const denominations = ["MPUJ","TPUJ","MUVE","TUVE","MPUB","PUB","Mini-Bus","School Transport","Taxi"]

    const errStyle = (name) => fieldErrors[name] ? { border: "1.5px solid var(--brick)", background: "var(--brick-bg)" } : undefined
    const ErrMsg = ({ name }) => fieldErrors[name] ? <div style={{ color: "var(--brick)", fontSize: 11, marginTop: 4, fontWeight: 600 }}>⚠️ {fieldErrors[name]}</div> : null

    // Region/Province/City are plain text inputs for now — cascading PH geo dropdowns are a separate follow-up task.
    const provinceOptions = form.region ? (PH_PROVINCES_BY_REGION[form.region] || []) : []
    const cityOptions = form.province ? (PH_CITIES_BY_PROVINCE[form.province] || []) : []

    const mmss = `${Math.floor(resendSeconds / 60)}:${String(resendSeconds % 60).padStart(2, "0")}`

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
                        <div className="alert amber">📱 {en ? `OTP sent to ${formatMobileDisplay(form.mobile)}` : `Napadala ang OTP sa ${formatMobileDisplay(form.mobile)}`}</div>
                        <div className="fg">
                            <label className="fl">One-Time PIN</label>
                            <input className="fi" placeholder="_ _ _ _ _ _" value={otp} onChange={e => setOtp(e.target.value)} style={{ fontSize: 22, letterSpacing: 8, textAlign: "center" }} />
                        </div>
                        <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginBottom: 14 }}>
                            {resendSeconds > 0 ? (
                                <span>{en ? "Resend OTP in" : "Maaaring mag-resend sa"} <strong style={{ color: "var(--navy)" }}>{mmss}</strong></span>
                            ) : (
                                <span className="link" onClick={handleResendOtp}>{en ? "Resend OTP" : "Ipadala Muli ang OTP"}</span>
                            )}
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
            {/* ── TUTORIAL BACKDROP ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

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
                <form onSubmit={handleValidateAndSendOtp}>

                    <div id="tut-step-0" style={getHighlightStyle(0)}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 4 }}>
                            {en ? "Personal Information" : "Personal na Impormasyon"}
                        </div>

                        <div className="fg" ref={el => fieldRefs.current.last_name = el}>
                            <label className="fl">{en ? "Last Name *" : "Apelyido *"}</label>
                            <input className="fi" style={errStyle("last_name")} placeholder="e.g. Santos" value={form.last_name}
                                   onChange={e => { set("last_name", e.target.value); clearFieldError("last_name") }}
                                   onBlur={() => onBlurProperCase("last_name")} />
                            <ErrMsg name="last_name" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.first_name = el}>
                            <label className="fl">{en ? "First Name *" : "Pangalan *"}</label>
                            <input className="fi" style={errStyle("first_name")} placeholder="e.g. Juan" value={form.first_name}
                                   onChange={e => { set("first_name", e.target.value); clearFieldError("first_name") }}
                                   onBlur={() => onBlurProperCase("first_name")} />
                            <ErrMsg name="first_name" />
                        </div>

                        <div className="fg" ref={el => fieldRefs.current.middle_name = el}>
                            <label className="fl">{en ? "Middle Name *" : "Gitnang Pangalan *"}</label>
                            <input className="fi" placeholder="e.g. Dela Cruz" value={noMiddle ? "" : form.middle_name}
                                   onChange={e => { set("middle_name", e.target.value); clearFieldError("middle_name") }}
                                   onBlur={() => onBlurProperCase("middle_name")}
                                   disabled={noMiddle} style={{ ...errStyle("middle_name"), opacity: noMiddle ? 0.4 : 1 }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <input type="checkbox" id="nomiddle" checked={noMiddle} onChange={e => { setNoMiddle(e.target.checked); clearFieldError("middle_name") }} style={{ cursor: "pointer" }} />
                                <label htmlFor="nomiddle" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>{en ? "I have no middle name" : "Wala akong gitnang pangalan"}</label>
                            </div>
                            <ErrMsg name="middle_name" />
                        </div>

                        <div className="fg" ref={el => fieldRefs.current.extension_name = el}>
                            <label className="fl">{en ? "Extension Name *" : "Extension Name *"} <span style={{fontWeight:400,color:"var(--slate)"}}>(Jr, Sr, III)</span></label>
                            <input className="fi" placeholder="e.g. Jr" value={noExtension ? "" : form.extension_name}
                                   onChange={e => { set("extension_name", e.target.value); clearFieldError("extension_name") }}
                                   onBlur={() => onBlurProperCase("extension_name")}
                                   disabled={noExtension} style={{ ...errStyle("extension_name"), opacity: noExtension ? 0.4 : 1 }} />
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <input type="checkbox" id="noext" checked={noExtension} onChange={e => { setNoExtension(e.target.checked); clearFieldError("extension_name") }} style={{ cursor: "pointer" }} />
                                <label htmlFor="noext" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>{en ? "I have no extension name" : "Wala akong extension name"}</label>
                            </div>
                            <ErrMsg name="extension_name" />
                        </div>

                        <div className="fg" ref={el => fieldRefs.current.sex = el}>
                            <label className="fl">{en ? "Sex *" : "Kasarian *"}</label>
                            <select className="fsel" style={errStyle("sex")} value={form.sex} onChange={e => { set("sex", e.target.value); clearFieldError("sex") }}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Others</option>
                            </select>
                            <ErrMsg name="sex" />
                        </div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                            {en ? "Date of Birth *" : "Petsa ng Kapanganakan *"}
                        </div>
                        <div className="two-col">
                            <div className="fg" ref={el => fieldRefs.current.birth_month = el}>
                                <label className="fl">{en ? "Month" : "Buwan"}</label>
                                <select className="fsel" style={errStyle("birth_month")} value={form.birth_month} onChange={e => { set("birth_month", e.target.value); clearFieldError("birth_month") }}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    {months.map(m => <option key={m}>{m}</option>)}
                                </select>
                                <ErrMsg name="birth_month" />
                            </div>
                            <div className="fg" ref={el => fieldRefs.current.birth_day = el}>
                                <label className="fl">{en ? "Day" : "Araw"}</label>
                                <select className="fsel" style={errStyle("birth_day")} value={form.birth_day} onChange={e => { set("birth_day", e.target.value); clearFieldError("birth_day") }}>
                                    <option value="">{en ? "Select..." : "Pumili..."}</option>
                                    {days.map(d => <option key={d}>{d}</option>)}
                                </select>
                                <ErrMsg name="birth_day" />
                            </div>
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.birth_year = el}>
                            <label className="fl">{en ? "Year (YYYY)" : "Taon (YYYY)"}</label>
                            <input className="fi" style={errStyle("birth_year")} placeholder="e.g. 1985" value={form.birth_year} onChange={e => { set("birth_year", e.target.value); calcAge(e.target.value); clearFieldError("birth_year") }} maxLength={4} />
                            <ErrMsg name="birth_year" />
                        </div>
                    </div>
                    <GuideBox stepIndex={0} />

                    <div id="tut-step-1" style={getHighlightStyle(1)}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                            {en ? "Address *" : "Tirahan *"}
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.region = el}>
                            <label className="fl">Region *</label>
                            <select className="fsel" style={errStyle("region")} value={form.region} onChange={e => {
                                set("region", e.target.value); set("province", ""); set("city", ""); clearFieldError("region")
                            }}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {PH_REGIONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                            <ErrMsg name="region" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.province = el}>
                            <label className="fl">Province *</label>
                            <select className="fsel" style={errStyle("province")} value={form.province} disabled={!form.region} onChange={e => {
                                set("province", e.target.value); set("city", ""); clearFieldError("province")
                            }}>
                                <option value="">{form.region ? (en ? "Select..." : "Pumili...") : (en ? "Select a region first" : "Pumili muna ng rehiyon")}</option>
                                {provinceOptions.map(p => <option key={p}>{p}</option>)}
                            </select>
                            <ErrMsg name="province" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.city = el}>
                            <label className="fl">{en ? "City / Municipality *" : "Lungsod / Munisipyo *"}</label>
                            <select className="fsel" style={errStyle("city")} value={form.city} disabled={!form.province} onChange={e => {
                                set("city", e.target.value); clearFieldError("city")
                            }}>
                                <option value="">{form.province ? (en ? "Select..." : "Pumili...") : (en ? "Select a province first" : "Pumili muna ng probinsya")}</option>
                                {cityOptions.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <ErrMsg name="city" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.barangay = el}>
                            <label className="fl">Barangay *</label>
                            <input className="fi" style={errStyle("barangay")} placeholder="e.g. Brgy. Poblacion" value={form.barangay}
                                   onChange={e => { set("barangay", e.target.value); clearFieldError("barangay") }}
                                   onBlur={() => onBlurProperCase("barangay")} />
                            <ErrMsg name="barangay" />
                        </div>
                    </div>
                    <GuideBox stepIndex={1} />

                    <div id="tut-step-2" style={getHighlightStyle(2)}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                            {en ? "Vehicle and Franchise" : "Sasakyan at Pransisa"}
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.denomination = el}>
                            <label className="fl">{en ? "Denomination (Vehicle Type) *" : "Uri ng Sasakyan *"}</label>
                            <select className="fsel" style={errStyle("denomination")} value={form.denomination} onChange={e => { set("denomination", e.target.value); clearFieldError("denomination") }}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {denominations.map(d => <option key={d}>{d}</option>)}
                            </select>
                            <ErrMsg name="denomination" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.case_number = el}>
                            <label className="fl">{en ? "Case Number *" : "Case Number *"} <span style={{fontWeight:400,color:"var(--slate)"}}>e.g. 2020-XXXX</span></label>
                            <input className="fi" style={errStyle("case_number")} placeholder="2020-XXXX" value={form.case_number} onChange={e => { set("case_number", formatCaseNumber(e.target.value)); clearFieldError("case_number") }} />
                            <ErrMsg name="case_number" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.operator_name = el}>
                            <label className="fl">{en ? "Operator's Name *" : "Pangalan ng Operator *"}</label>
                            <input className="fi" style={errStyle("operator_name")} placeholder={en ? "Transport entity or individual name" : "Pangalan ng transport entity o indibidwal"} value={form.operator_name}
                                   onChange={e => { set("operator_name", e.target.value); clearFieldError("operator_name") }}
                                   onBlur={() => onBlurProperCaseKeepAcronyms("operator_name")} />
                            <ErrMsg name="operator_name" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.cooperative_name = el}>
                            <label className="fl">{en ? "Cooperative Name *" : "Pangalan ng Kooperatiba *"}</label>
                            <input className="fi" style={errStyle("cooperative_name")} placeholder={en ? "e.g. Quezon City TODA Inc." : "hal. Quezon City TODA Inc."} value={form.cooperative_name}
                                   onChange={e => { set("cooperative_name", e.target.value); clearFieldError("cooperative_name") }}
                                   onBlur={() => onBlurProperCaseKeepAcronyms("cooperative_name")} />
                            <ErrMsg name="cooperative_name" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.plate_number = el}>
                            <label className="fl">{en ? "Plate Number *" : "Plate Number *"}</label>
                            <input className="fi" style={errStyle("plate_number")} placeholder="e.g. ABC 1234" value={form.plate_number}
                                   onChange={e => { set("plate_number", formatPlateNumber(e.target.value)); clearFieldError("plate_number") }} />
                            <ErrMsg name="plate_number" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.chassis_number = el}>
                            <label className="fl">{en ? "Chassis Number *" : "Chassis Number *"}</label>
                            <input className="fi" style={errStyle("chassis_number")} placeholder="e.g. XXXXXXXXXX" value={form.chassis_number} onChange={e => { set("chassis_number", e.target.value); clearFieldError("chassis_number") }} />
                            <ErrMsg name="chassis_number" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.license_number = el}>
                            <label className="fl">{en ? "Driver's License Number *" : "Numero ng Driver's License *"}</label>
                            <input className="fi" style={errStyle("license_number")} placeholder={licenseNumberPlaceholder(form.denomination)} value={form.license_number}
                                   onChange={e => { set("license_number", formatLicenseNumber(e.target.value)); clearFieldError("license_number") }} />
                            <div className="fh">{en ? `Format: ${licenseNumberPlaceholder(form.denomination)}.` : `Format: ${licenseNumberPlaceholder(form.denomination)}.`} {form.denomination && dlCodeHint(form.denomination, en)}</div>
                            <ErrMsg name="license_number" />
                        </div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                            {en ? "Contact" : "Kontak"}
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.mobile = el}>
                            <label className="fl">{en ? "Mobile Number *" : "Numero ng Telepono *"}</label>
                            <input className="fi" style={errStyle("mobile")} placeholder="09XX XXX XXXX" value={formatMobileDisplay(form.mobile)}
                                   onChange={e => { set("mobile", formatMobileDisplay(e.target.value)); clearFieldError("mobile") }} />
                            <ErrMsg name="mobile" />
                        </div>
                    </div>
                    <GuideBox stepIndex={2} />

                    <div id="tut-step-3" style={getHighlightStyle(3)}>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 10, marginTop: 16 }}>
                            {en ? "Account Security" : "Seguridad ng Account"}
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.password = el}>
                            <label className="fl">{en ? "Password *" : "Password *"}</label>
                            <div style={{ position: "relative" }}>
                                <input className="fi" style={{ ...errStyle("password"), paddingRight: 56 }} type={showPassword ? "text" : "password"} placeholder={en ? "Create a password" : "Gumawa ng password"} value={form.password} onChange={e => { set("password", e.target.value); clearFieldError("password") }} />
                                <span onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--navy)", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>
                                {showPassword ? (en ? "Hide" : "Itago") : (en ? "Show" : "Ipakita")}
                            </span>
                            </div>
                            <div className="fh">{en ? "At least 8 characters, with a number and a special character (e.g. ! @ # $ % ^ & * ( ) , . ? \" : { } | < > _ - + =). Cannot be your name or birth year." : "Hindi bababa sa 8 karakter, may numero at special character (hal. ! @ # $ % ^ & * ( ) , . ? \" : { } | < > _ - + =). Hindi puwedeng pangalan o taon ng kapanganakan."}</div>
                            <ErrMsg name="password" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.confirm_password = el}>
                            <label className="fl">{en ? "Confirm Password *" : "Kumpirmahin ang Password *"}</label>
                            <div style={{ position: "relative" }}>
                                <input className="fi" style={{ ...errStyle("confirm_password"), paddingRight: 56 }} type={showConfirmPassword ? "text" : "password"} placeholder={en ? "Re-enter your password" : "Ulitin ang password"} value={form.confirm_password} onChange={e => { set("confirm_password", e.target.value); clearFieldError("confirm_password") }} />
                                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--navy)", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>
                                {showConfirmPassword ? (en ? "Hide" : "Itago") : (en ? "Show" : "Ipakita")}
                            </span>
                            </div>
                            <ErrMsg name="confirm_password" />
                        </div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6, marginTop: 16 }}>
                            {en ? "Account Recovery *" : "Pagbawi ng Account *"}
                        </div>
                        <p style={{ fontSize: 11, color: "var(--slate)", marginBottom: 10 }}>
                            {en ? "Choose questions only you would know the answer to. In case SMS OTP doesn't arrive, these help you recover your account." : "Pumili ng mga tanong na ikaw lang ang nakakaalam ng sagot. Sakaling hindi dumating ang SMS OTP, makakatulong ang mga ito para mabawi ang account."}
                        </p>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>
                            {en ? "Question 1 of 2" : "Tanong 1 ng 2"}
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.security_question = el}>
                            <label className="fl">{en ? "Choose a Security Question *" : "Pumili ng Security Question *"}</label>
                            <select className="fsel" style={errStyle("security_question")} value={form.security_question} onChange={e => { set("security_question", e.target.value); clearFieldError("security_question") }}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {SECURITY_QUESTIONS.map(q => <option key={q.key} value={q.key}>{en ? q.en : q.fil}</option>)}
                            </select>
                            <ErrMsg name="security_question" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.security_answer = el}>
                            <label className="fl">{en ? "Your Answer *" : "Sagot Mo *"}</label>
                            <input className="fi" style={errStyle("security_answer")} placeholder={en ? "Type your answer" : "I-type ang sagot"} value={form.security_answer} onChange={e => { set("security_answer", e.target.value); clearFieldError("security_answer") }} />
                            <div className="fh">{en ? "Remember this exactly. Not case-sensitive." : "Tandaan ito nang eksakto. Hindi case-sensitive."}</div>
                            <ErrMsg name="security_answer" />
                        </div>

                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 12, color: "var(--slate)", marginBottom: 8, marginTop: 12 }}>
                            {en ? "Question 2 of 2" : "Tanong 2 ng 2"}
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.security_question_2 = el}>
                            <label className="fl">{en ? "Choose a Second Security Question *" : "Pumili ng Pangalawang Security Question *"}</label>
                            <select className="fsel" style={errStyle("security_question_2")} value={form.security_question_2} onChange={e => { set("security_question_2", e.target.value); clearFieldError("security_question_2") }}>
                                <option value="">{en ? "Select..." : "Pumili..."}</option>
                                {SECURITY_QUESTIONS.filter(q => q.key !== form.security_question).map(q => <option key={q.key} value={q.key}>{en ? q.en : q.fil}</option>)}
                            </select>
                            <ErrMsg name="security_question_2" />
                        </div>
                        <div className="fg" ref={el => fieldRefs.current.security_answer_2 = el}>
                            <label className="fl">{en ? "Your Answer *" : "Sagot Mo *"}</label>
                            <input className="fi" style={errStyle("security_answer_2")} placeholder={en ? "Type your answer" : "I-type ang sagot"} value={form.security_answer_2} onChange={e => { set("security_answer_2", e.target.value); clearFieldError("security_answer_2") }} />
                            <div className="fh">{en ? "Remember this exactly. Not case-sensitive." : "Tandaan ito nang eksakto. Hindi case-sensitive."}</div>
                            <ErrMsg name="security_answer_2" />
                        </div>
                    </div>
                    <GuideBox stepIndex={3} />

                    <div id="tut-step-4" style={getHighlightStyle(4)}>
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

                        {error && <div className="alert amber">{error}</div>}
                        <button className="btn gold" type="submit" disabled={loading}>{en ? "Continue to Verification" : "Magpatuloy sa Verification"}</button>
                    </div>
                    <GuideBox stepIndex={4} />
                </form>
                <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
                    {en ? "Already have an account?" : "Mayroon nang account?"} <span className="link" onClick={() => onNav("signin")}>{en ? "Sign in" : "Mag-sign in"}</span>
                </div>
            </div>
        </div>
    )
}
