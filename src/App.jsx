import { useState, useEffect, useRef, Fragment } from "react"
import { supabase } from "./supabase"
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode/+esm"

const SECURITY_QUESTIONS = [
    { key: "mothers_maiden_name", en: "What is your mother's maiden name?", fil: "Ano ang pangalan ng inyong ina bago mag-asawa?" },
    { key: "first_vehicle_plate", en: "What was the plate number of your first vehicle?", fil: "Ano ang plate number ng iyong unang sasakyan?" },
    { key: "childhood_friend", en: "What is the name of your childhood best friend?", fil: "Ano ang pangalan ng iyong matalik na kaibigan noong bata ka pa?" },
    { key: "barangay_nickname", en: "What is your barangay's old name or nickname?", fil: "Ano ang lumang pangalan o palayaw ng iyong barangay?" },
    { key: "first_employer", en: "What was your first employer or operator's name?", fil: "Ano ang pangalan ng iyong unang amo o operator?" },
    { key: "first_pet_name", en: "What was the name of your first pet?", fil: "Ano ang pangalan ng iyong unang alagang hayop?" },
    { key: "parents_meeting_city", en: "In what city or town did your parents first meet?", fil: "Saang lungsod o bayan unang nagkakilala ang iyong mga magulang?" },
    { key: "first_phone_model", en: "What was the brand/model of your very first mobile phone?", fil: "Ano ang brand/model ng iyong unang cellphone?" },
    { key: "childhood_street", en: "What street did you grow up on (not your current address)?", fil: "Saang kalye ka lumaki (hindi ang kasalukuyan mong tirahan)?" },
    { key: "elementary_teacher", en: "What was the name of your favorite elementary school teacher?", fil: "Sino ang pangalan ng paborito mong guro noong elementarya?" },
]

function securityQuestionLabel(key, en) {
    if (!key) return ""
    const normalized = String(key).trim().toLowerCase()
    const found = SECURITY_QUESTIONS.find(q => q.key.toLowerCase() === normalized)
    if (found) return en ? found.en : found.fil
    return key
}

// ─── Shared input formatters ─────────────────────────────────────────────
function toProperCase(str) {
    if (!str) return str
    return str.trim().toLowerCase().replace(/\b\p{L}/gu, ch => ch.toUpperCase())
}

// Like toProperCase, but preserves short all-caps words (TODA, JODA, MODA, etc.) as acronyms
// instead of forcing them to Title Case — common in Philippine transport org names.
function toProperCaseKeepAcronyms(str) {
    if (!str) return str
    return str.trim().split(/(\s+)/).map(word => {
        if (/^\s+$/.test(word)) return word
        const letters = word.replace(/[^A-Za-z]/g, "")
        const isAcronym = letters.length >= 2 && letters.length <= 6 && word === word.toUpperCase() && /[A-Z]/.test(word)
        if (isAcronym) return word
        return word.toLowerCase().replace(/\b\p{L}/gu, ch => ch.toUpperCase())
    }).join("")
}

function formatMobileDisplay(v) {
    const clean = (v || "").replace(/[^0-9]/g, "").slice(0, 11)
    const p1 = clean.slice(0, 4), p2 = clean.slice(4, 7), p3 = clean.slice(7, 11)
    return [p1, p2, p3].filter(Boolean).join(" ")
}
function cleanMobile(v) { return (v || "").replace(/[^0-9]/g, "") }

function formatPlateNumber(v) {
    const clean = (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
    const letters = clean.replace(/[0-9]/g, "").slice(0, 3)
    const numbers = clean.replace(/[A-Z]/g, "").slice(0, 4)
    return numbers ? `${letters} ${numbers}` : letters
}

function formatLicenseNumber(v) {
    const clean = (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11)
    const seg1 = clean.slice(0, 3), seg2 = clean.slice(3, 5), seg3 = clean.slice(5, 11)
    return [seg1, seg2, seg3].filter(Boolean).join("-")
}

function formatCaseNumber(v) {
    const clean = (v || "").replace(/[^0-9]/g, "").slice(0, 8)
    const seg1 = clean.slice(0, 4), seg2 = clean.slice(4, 8)
    return [seg1, seg2].filter(Boolean).join("-")
}

// Real-world LTO DL Code guidance per PUV denomination — informational only, not a hard validation gate.
const DENOMINATION_DL_CODE_HINT = {
    "MPUJ": { en: "Should show DL Code B1 (9+ passenger seats, up to 5,000kg GVW).", fil: "Dapat may DL Code B1 (9+ upuan, hanggang 5,000kg GVW)." },
    "TPUJ": { en: "Should show DL Code B1 (9+ passenger seats, up to 5,000kg GVW).", fil: "Dapat may DL Code B1 (9+ upuan, hanggang 5,000kg GVW)." },
    "MUVE": { en: "Should show DL Code B1 (9+ passenger seats, up to 5,000kg GVW).", fil: "Dapat may DL Code B1 (9+ upuan, hanggang 5,000kg GVW)." },
    "TUVE": { en: "Should show DL Code B1 (9+ passenger seats, up to 5,000kg GVW).", fil: "Dapat may DL Code B1 (9+ upuan, hanggang 5,000kg GVW)." },
    "MPUB": { en: "Should show DL Code D (buses, over 5,000kg GVW, 9+ passenger seats).", fil: "Dapat may DL Code D (bus, higit sa 5,000kg GVW, 9+ upuan)." },
    "PUB": { en: "Should show DL Code D (buses, over 5,000kg GVW, 9+ passenger seats).", fil: "Dapat may DL Code D (bus, higit sa 5,000kg GVW, 9+ upuan)." },
    "Mini-Bus": { en: "Should show DL Code B1 or D, depending on your unit's gross vehicle weight.", fil: "Dapat may DL Code B1 o D, depende sa gross vehicle weight ng iyong sasakyan." },
    "School Transport": { en: "Should show DL Code B1 or D, depending on your unit's gross vehicle weight.", fil: "Dapat may DL Code B1 o D, depende sa gross vehicle weight ng iyong sasakyan." },
    "Taxi": { en: "Should show DL Code B (up to 8 passenger seats) or B1 for larger units.", fil: "Dapat may DL Code B (hanggang 8 upuan) o B1 para sa mas malaking sasakyan." },
}
function dlCodeHint(denomination, en) {
    const found = DENOMINATION_DL_CODE_HINT[denomination]
    if (!found) return en ? "Format: C01-XX-XXXXXX" : "Format: C01-XX-XXXXXX"
    return en ? found.en : found.fil
}

const DENOMINATION_DL_CODE_SHORT = {
    "MPUJ": "B1", "TPUJ": "B1", "MUVE": "B1", "TUVE": "B1",
    "MPUB": "D", "PUB": "D",
    "Mini-Bus": "B1 or D", "School Transport": "B1 or D",
    "Taxi": "B or B1",
}
function licenseNumberPlaceholder(denomination) {
    const code = DENOMINATION_DL_CODE_SHORT[denomination]
    const letter = code ? code[0] : "C"
    return `${letter}01-XX-XXXXXX`
}

// ─── PH Geography — sourced from official PSGC data (17 regions, 82 provinces, 1,634 cities/municipalities) ───
const PH_REGIONS = [
    "NCR", "CAR", "Region I – Ilocos Region", "Region II – Cagayan Valley", "Region III – Central Luzon", "Region IV-A – CALABARZON", "MIMAROPA", "Region V – Bicol Region", "Region VI – Western Visayas", "Region VII – Central Visayas", "Region VIII – Eastern Visayas", "Region IX – Zamboanga Peninsula", "Region X – Northern Mindanao", "Region XI – Davao Region", "Region XII – SOCCSKSARGEN", "Region XIII – Caraga", "BARMM",
]

const PH_PROVINCES_BY_REGION = {
    "NCR": ["Metro Manila"],
    "Region I – Ilocos Region": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
    "Region II – Cagayan Valley": ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"],
    "Region III – Central Luzon": ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"],
    "Region IV-A – CALABARZON": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
    "MIMAROPA": ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"],
    "Region V – Bicol Region": ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"],
    "Region VI – Western Visayas": ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"],
    "Region VII – Central Visayas": ["Bohol", "Cebu", "Negros Oriental", "Siquijor"],
    "Region VIII – Eastern Visayas": ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"],
    "Region IX – Zamboanga Peninsula": ["Zamboanga Sibugay", "Zamboanga del Norte", "Zamboanga del Sur"],
    "Region X – Northern Mindanao": ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"],
    "Region XI – Davao Region": ["Davao Occidental", "Davao Oriental", "Davao de Oro", "Davao del Norte", "Davao del Sur"],
    "Region XII – SOCCSKSARGEN": ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"],
    "CAR": ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"],
    "BARMM": ["Basilan", "Lanao del Sur", "Maguindanao", "Sulu", "Tawi-Tawi"],
    "Region XIII – Caraga": ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"],
}

const PH_CITIES_BY_PROVINCE = {
    "Ilocos Norte": ["Adams", "Bacarra", "Badoc", "Bangui", "Banna", "Burgos", "Carasi", "City of Batac", "City of Laoag", "Currimao", "Dingras", "Dumalneg", "Marcos", "Nueva Era", "Pagudpud", "Paoay", "Pasuquin", "Piddig", "Pinili", "San Nicolas", "Sarrat", "Solsona", "Vintar"],
    "Ilocos Sur": ["Alilem", "Banayoyo", "Bantay", "Burgos", "Cabugao", "Caoayan", "Cervantes", "City of Candon", "City of Vigan", "Galimuyod", "Gregorio del Pilar", "Lidlidda", "Magsingal", "Nagbukel", "Narvacan", "Quirino", "Salcedo", "San Emilio", "San Esteban", "San Ildefonso", "San Juan", "San Vicente", "Santa", "Santa Catalina", "Santa Cruz", "Santa Lucia", "Santa Maria", "Santiago", "Santo Domingo", "Sigay", "Sinait", "Sugpon", "Suyo", "Tagudin"],
    "La Union": ["Agoo", "Aringay", "Bacnotan", "Bagulin", "Balaoan", "Bangar", "Bauang", "Burgos", "Caba", "City of San Fernando", "Luna", "Naguilian", "Pugo", "Rosario", "San Gabriel", "San Juan", "Santo Tomas", "Santol", "Sudipen", "Tubao"],
    "Pangasinan": ["Agno", "Aguilar", "Alcala", "Anda", "Asingan", "Balungao", "Bani", "Basista", "Bautista", "Bayambang", "Binalonan", "Binmaley", "Bolinao", "Bugallon", "Burgos", "Calasiao", "City of Alaminos", "City of Dagupan", "City of San Carlos", "City of Urdaneta", "Dasol", "Infanta", "Labrador", "Laoac", "Lingayen", "Mabini", "Malasiqui", "Manaoag", "Mangaldan", "Mangatarem", "Mapandan", "Natividad", "Pozorrubio", "Rosales", "San Fabian", "San Jacinto", "San Manuel", "San Nicolas", "San Quintin", "Santa Barbara", "Santa Maria", "Santo Tomas", "Sison", "Sual", "Tayug", "Umingan", "Urbiztondo", "Villasis"],
    "Batanes": ["Basco", "Itbayat", "Ivana", "Mahatao", "Sabtang", "Uyugan"],
    "Cagayan": ["Abulug", "Alcala", "Allacapan", "Amulung", "Aparri", "Baggao", "Ballesteros", "Buguey", "Calayan", "Camalaniugan", "Claveria", "Enrile", "Gattaran", "Gonzaga", "Iguig", "Lal-Lo", "Lasam", "Pamplona", "Peñablanca", "Piat", "Rizal", "Sanchez-Mira", "Santa Ana", "Santa Praxedes", "Santa Teresita", "Santo Niño", "Solana", "Tuao", "Tuguegarao City"],
    "Isabela": ["Alicia", "Angadanan", "Aurora", "Benito Soliven", "Burgos", "Cabagan", "Cabatuan", "City of Cauayan", "City of Ilagan", "City of Santiago", "Cordon", "Delfin Albano", "Dinapigue", "Divilacan", "Echague", "Gamu", "Jones", "Luna", "Maconacon", "Mallig", "Naguilian", "Palanan", "Quezon", "Quirino", "Ramon", "Reina Mercedes", "Roxas", "San Agustin", "San Guillermo", "San Isidro", "San Manuel", "San Mariano", "San Mateo", "San Pablo", "Santa Maria", "Santo Tomas", "Tumauini"],
    "Nueva Vizcaya": ["Alfonso Castaneda", "Ambaguio", "Aritao", "Bagabag", "Bambang", "Bayombong", "Diadi", "Dupax del Norte", "Dupax del Sur", "Kasibu", "Kayapa", "Quezon", "Santa Fe", "Solano", "Villaverde"],
    "Quirino": ["Aglipay", "Cabarroguis", "Diffun", "Maddela", "Nagtipunan", "Saguday"],
    "Bataan": ["Abucay", "Bagac", "City of Balanga", "Dinalupihan", "Hermosa", "Limay", "Mariveles", "Morong", "Orani", "Orion", "Pilar", "Samal"],
    "Bulacan": ["Angat", "Balagtas", "Baliuag", "Bocaue", "Bulacan", "Bustos", "Calumpit", "City of Malolos", "City of Meycauayan", "City of San Jose Del Monte", "Doña Remedios Trinidad", "Guiguinto", "Hagonoy", "Marilao", "Norzagaray", "Obando", "Pandi", "Paombong", "Plaridel", "Pulilan", "San Ildefonso", "San Miguel", "San Rafael", "Santa Maria"],
    "Nueva Ecija": ["Aliaga", "Bongabon", "Cabiao", "Carranglan", "City of Cabanatuan", "City of Gapan", "City of Palayan", "Cuyapo", "Gabaldon", "General Mamerto Natividad", "General Tinio", "Guimba", "Jaen", "Laur", "Licab", "Llanera", "Lupao", "Nampicuan", "Pantabangan", "Peñaranda", "Quezon", "Rizal", "San Antonio", "San Isidro", "San Jose City", "San Leonardo", "Santa Rosa", "Santo Domingo", "Science City of Muñoz", "Talavera", "Talugtug", "Zaragoza"],
    "Pampanga": ["Apalit", "Arayat", "Bacolor", "Candaba", "City of Angeles", "City of San Fernando", "Floridablanca", "Guagua", "Lubao", "Mabalacat City", "Macabebe", "Magalang", "Masantol", "Mexico", "Minalin", "Porac", "San Luis", "San Simon", "Santa Ana", "Santa Rita", "Santo Tomas", "Sasmuan"],
    "Tarlac": ["Anao", "Bamban", "Camiling", "Capas", "City of Tarlac", "Concepcion", "Gerona", "La Paz", "Mayantoc", "Moncada", "Paniqui", "Pura", "Ramos", "San Clemente", "San Jose", "San Manuel", "Santa Ignacia", "Victoria"],
    "Zambales": ["Botolan", "Cabangan", "Candelaria", "Castillejos", "City of Olongapo", "Iba", "Masinloc", "Palauig", "San Antonio", "San Felipe", "San Marcelino", "San Narciso", "Santa Cruz", "Subic"],
    "Aurora": ["Baler", "Casiguran", "Dilasag", "Dinalungan", "Dingalan", "Dipaculao", "Maria Aurora", "San Luis"],
    "Batangas": ["Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", "City of Lipa", "City of Sto. Tomas", "City of Tanauan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Taal", "Talisay", "Taysan", "Tingloy", "Tuy"],
    "Cavite": ["Alfonso", "Amadeo", "Carmona", "City of Bacoor", "City of Cavite", "City of Dasmariñas", "City of General Trias", "City of Imus", "City of Tagaytay", "City of Trece Martires", "Gen. Mariano Alvarez", "General Emilio Aguinaldo", "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta", "Rosario", "Silang", "Tanza", "Ternate"],
    "Laguna": ["Alaminos", "Bay", "Calauan", "Cavinti", "City of Biñan", "City of Cabuyao", "City of Calamba", "City of San Pablo", "City of San Pedro", "City of Santa Rosa", "Famy", "Kalayaan", "Liliw", "Los Baños", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "Santa Cruz", "Santa Maria", "Siniloan", "Victoria"],
    "Quezon": ["Agdangan", "Alabat", "Atimonan", "Buenavista", "Burdeos", "Calauag", "Candelaria", "Catanauan", "City of Lucena", "City of Tayabas", "Dolores", "General Luna", "General Nakar", "Guinayangan", "Gumaca", "Infanta", "Jomalig", "Lopez", "Lucban", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao", "Panukulan", "Patnanungan", "Perez", "Pitogo", "Plaridel", "Polillo", "Quezon", "Real", "Sampaloc", "San Andres", "San Antonio", "San Francisco", "San Narciso", "Sariaya", "Tagkawayan", "Tiaong", "Unisan"],
    "Rizal": ["Angono", "Baras", "Binangonan", "Cainta", "Cardona", "City of Antipolo", "Jala-Jala", "Morong", "Pililla", "Rodriguez", "San Mateo", "Tanay", "Taytay", "Teresa"],
    "Marinduque": ["Boac", "Buenavista", "Gasan", "Mogpog", "Santa Cruz", "Torrijos"],
    "Occidental Mindoro": ["Abra De Ilog", "Calintaan", "Looc", "Lubang", "Magsaysay", "Mamburao", "Paluan", "Rizal", "Sablayan", "San Jose", "Santa Cruz"],
    "Oriental Mindoro": ["Baco", "Bansud", "Bongabong", "Bulalacao", "City of Calapan", "Gloria", "Mansalay", "Naujan", "Pinamalayan", "Pola", "Puerto Galera", "Roxas", "San Teodoro", "Socorro", "Victoria"],
    "Palawan": ["Aborlan", "Agutaya", "Araceli", "Balabac", "Bataraza", "Brooke'S Point", "Busuanga", "Cagayancillo", "City of Puerto Princesa", "Coron", "Culion", "Cuyo", "Dumaran", "El Nido", "Kalayaan", "Linapacan", "Magsaysay", "Narra", "Quezon", "Rizal", "Roxas", "San Vicente", "Sofronio Española", "Taytay"],
    "Romblon": ["Alcantara", "Banton", "Cajidiocan", "Calatrava", "Concepcion", "Corcuera", "Ferrol", "Looc", "Magdiwang", "Odiongan", "Romblon", "San Agustin", "San Andres", "San Fernando", "San Jose", "Santa Fe", "Santa Maria"],
    "Albay": ["Bacacay", "Camalig", "City of Legazpi", "City of Ligao", "City of Tabaco", "Daraga", "Guinobatan", "Jovellar", "Libon", "Malilipot", "Malinao", "Manito", "Oas", "Pio Duran", "Polangui", "Rapu-Rapu", "Santo Domingo", "Tiwi"],
    "Camarines Norte": ["Basud", "Capalonga", "Daet", "Jose Panganiban", "Labo", "Mercedes", "Paracale", "San Lorenzo Ruiz", "San Vicente", "Santa Elena", "Talisay", "Vinzons"],
    "Camarines Sur": ["Baao", "Balatan", "Bato", "Bombon", "Buhi", "Bula", "Cabusao", "Calabanga", "Camaligan", "Canaman", "Caramoan", "City of Iriga", "City of Naga", "Del Gallego", "Gainza", "Garchitorena", "Goa", "Lagonoy", "Libmanan", "Lupi", "Magarao", "Milaor", "Minalabac", "Nabua", "Ocampo", "Pamplona", "Pasacao", "Pili", "Presentacion", "Ragay", "Sagñay", "San Fernando", "San Jose", "Sipocot", "Siruma", "Tigaon", "Tinambac"],
    "Catanduanes": ["Bagamanoc", "Baras", "Bato", "Caramoran", "Gigmoto", "Pandan", "Panganiban", "San Andres", "San Miguel", "Viga", "Virac"],
    "Masbate": ["Aroroy", "Baleno", "Balud", "Batuan", "Cataingan", "Cawayan", "City of Masbate", "Claveria", "Dimasalang", "Esperanza", "Mandaon", "Milagros", "Mobo", "Monreal", "Palanas", "Pio V. Corpuz", "Placer", "San Fernando", "San Jacinto", "San Pascual", "Uson"],
    "Sorsogon": ["Barcelona", "Bulan", "Bulusan", "Casiguran", "Castilla", "City of Sorsogon", "Donsol", "Gubat", "Irosin", "Juban", "Magallanes", "Matnog", "Pilar", "Prieto Diaz", "Santa Magdalena"],
    "Aklan": ["Altavas", "Balete", "Banga", "Batan", "Buruanga", "Ibajay", "Kalibo", "Lezo", "Libacao", "Madalag", "Makato", "Malay", "Malinao", "Nabas", "New Washington", "Numancia", "Tangalan"],
    "Antique": ["Anini-Y", "Barbaza", "Belison", "Bugasong", "Caluya", "Culasi", "Hamtic", "Laua-An", "Libertad", "Pandan", "Patnongon", "San Jose", "San Remigio", "Sebaste", "Sibalom", "Tibiao", "Tobias Fornier", "Valderrama"],
    "Capiz": ["City of Roxas", "Cuartero", "Dao", "Dumalag", "Dumarao", "Ivisan", "Jamindan", "Ma-Ayon", "Mambusao", "Panay", "Panitan", "Pilar", "Pontevedra", "President Roxas", "Sapi-An", "Sigma", "Tapaz"],
    "Iloilo": ["Ajuy", "Alimodian", "Anilao", "Badiangan", "Balasan", "Banate", "Barotac Nuevo", "Barotac Viejo", "Batad", "Bingawan", "Cabatuan", "Calinog", "Carles", "City of Iloilo", "City of Passi", "Concepcion", "Dingle", "Dueñas", "Dumangas", "Estancia", "Guimbal", "Igbaras", "Janiuay", "Lambunao", "Leganes", "Lemery", "Leon", "Maasin", "Miagao", "Mina", "New Lucena", "Oton", "Pavia", "Pototan", "San Dionisio", "San Enrique", "San Joaquin", "San Miguel", "San Rafael", "Santa Barbara", "Sara", "Tigbauan", "Tubungan", "Zarraga"],
    "Negros Occidental": ["Binalbagan", "Calatrava", "Candoni", "Cauayan", "City of Bacolod", "City of Bago", "City of Cadiz", "City of Escalante", "City of Himamaylan", "City of Kabankalan", "City of La Carlota", "City of Sagay", "City of San Carlos", "City of Silay", "City of Sipalay", "City of Talisay", "City of Victorias", "Enrique B. Magalona", "Hinigaran", "Hinoba-an", "Ilog", "Isabela", "La Castellana", "Manapla", "Moises Padilla", "Murcia", "Pontevedra", "Pulupandan", "Salvador Benedicto", "San Enrique", "Toboso", "Valladolid"],
    "Guimaras": ["Buenavista", "Jordan", "Nueva Valencia", "San Lorenzo", "Sibunag"],
    "Bohol": ["Alburquerque", "Alicia", "Anda", "Antequera", "Baclayon", "Balilihan", "Batuan", "Bien Unido", "Bilar", "Buenavista", "Calape", "Candijay", "Carmen", "Catigbian", "City of Tagbilaran", "Clarin", "Corella", "Cortes", "Dagohoy", "Danao", "Dauis", "Dimiao", "Duero", "Garcia Hernandez", "Getafe", "Guindulman", "Inabanga", "Jagna", "Lila", "Loay", "Loboc", "Loon", "Mabini", "Maribojoc", "Panglao", "Pilar", "Pres. Carlos P. Garcia", "Sagbayan", "San Isidro", "San Miguel", "Sevilla", "Sierra Bullones", "Sikatuna", "Talibon", "Trinidad", "Tubigon", "Ubay", "Valencia"],
    "Cebu": ["Alcantara", "Alcoy", "Alegria", "Aloguinsan", "Argao", "Asturias", "Badian", "Balamban", "Bantayan", "Barili", "Boljoon", "Borbon", "Carmen", "Catmon", "City of Bogo", "City of Carcar", "City of Cebu", "City of Lapu-Lapu", "City of Mandaue", "City of Naga", "City of Talisay", "City of Toledo", "Compostela", "Consolacion", "Cordova", "Daanbantayan", "Dalaguete", "Danao City", "Dumanjug", "Ginatilan", "Liloan", "Madridejos", "Malabuyoc", "Medellin", "Minglanilla", "Moalboal", "Oslob", "Pilar", "Pinamungajan", "Poro", "Ronda", "Samboan", "San Fernando", "San Francisco", "San Remigio", "Santa Fe", "Santander", "Sibonga", "Sogod", "Tabogon", "Tabuelan", "Tuburan", "Tudela"],
    "Negros Oriental": ["Amlan", "Ayungon", "Bacong", "Basay", "Bindoy", "City of Bais", "City of Bayawan", "City of Canlaon", "City of Dumaguete", "City of Guihulngan", "City of Tanjay", "Dauin", "Jimalalud", "La Libertad", "Mabinay", "Manjuyod", "Pamplona", "San Jose", "Santa Catalina", "Siaton", "Sibulan", "Tayasan", "Valencia", "Vallehermoso", "Zamboanguita"],
    "Siquijor": ["Enrique Villanueva", "Larena", "Lazi", "Maria", "San Juan", "Siquijor"],
    "Eastern Samar": ["Arteche", "Balangiga", "Balangkayan", "Can-Avid", "City of Borongan", "Dolores", "General Macarthur", "Giporlos", "Guiuan", "Hernani", "Jipapad", "Lawaan", "Llorente", "Maslog", "Maydolong", "Mercedes", "Oras", "Quinapondan", "Salcedo", "San Julian", "San Policarpo", "Sulat", "Taft"],
    "Leyte": ["Abuyog", "Alangalang", "Albuera", "Babatngon", "Barugo", "Bato", "Burauen", "Calubian", "Capoocan", "Carigara", "City of Baybay", "City of Tacloban", "Dagami", "Dulag", "Hilongos", "Hindang", "Inopacan", "Isabel", "Jaro", "Javier", "Julita", "Kananga", "La Paz", "Leyte", "Macarthur", "Mahaplag", "Matag-Ob", "Matalom", "Mayorga", "Merida", "Ormoc City", "Palo", "Palompon", "Pastrana", "San Isidro", "San Miguel", "Santa Fe", "Tabango", "Tabontabon", "Tanauan", "Tolosa", "Tunga", "Villaba"],
    "Northern Samar": ["Allen", "Biri", "Bobon", "Capul", "Catarman", "Catubig", "Gamay", "Laoang", "Lapinig", "Las Navas", "Lavezares", "Lope De Vega", "Mapanas", "Mondragon", "Palapag", "Pambujan", "Rosario", "San Antonio", "San Isidro", "San Jose", "San Roque", "San Vicente", "Silvino Lobos", "Victoria"],
    "Samar": ["Almagro", "Basey", "Calbiga", "City of Calbayog", "City of Catbalogan", "Daram", "Gandara", "Hinabangan", "Jiabong", "Marabut", "Matuguinao", "Motiong", "Pagsanghan", "Paranas", "Pinabacdao", "San Jorge", "San Jose De Buan", "San Sebastian", "Santa Margarita", "Santa Rita", "Santo Niño", "Tagapul-An", "Talalora", "Tarangnan", "Villareal", "Zumarraga"],
    "Southern Leyte": ["Anahawan", "Bontoc", "City of Maasin", "Hinunangan", "Hinundayan", "Libagon", "Liloan", "Limasawa", "Macrohon", "Malitbog", "Padre Burgos", "Pintuyan", "Saint Bernard", "San Francisco", "San Juan", "San Ricardo", "Silago", "Sogod", "Tomas Oppus"],
    "Biliran": ["Almeria", "Biliran", "Cabucgayan", "Caibiran", "Culaba", "Kawayan", "Maripipi", "Naval"],
    "Zamboanga del Norte": ["Bacungan", "Baliguian", "City of Dapitan", "City of Dipolog", "Godod", "Gutalac", "Jose Dalman", "Kalawit", "Katipunan", "La Libertad", "Labason", "Liloy", "Manukan", "Mutia", "Piñan", "Polanco", "Pres. Manuel A. Roxas", "Rizal", "Salug", "Sergio Osmeña Sr.", "Siayan", "Sibuco", "Sibutad", "Sindangan", "Siocon", "Sirawai", "Tampilisan"],
    "Zamboanga del Sur": ["Aurora", "Bayog", "City of Pagadian", "City of Zamboanga", "Dimataling", "Dinas", "Dumalinao", "Dumingag", "Guipos", "Josefina", "Kumalarang", "Labangan", "Lakewood", "Lapuyan", "Mahayag", "Margosatubig", "Midsalip", "Molave", "Pitogo", "Ramon Magsaysay", "San Miguel", "San Pablo", "Sominot", "Tabina", "Tambulig", "Tigbao", "Tukuran", "Vincenzo A. Sagun"],
    "Zamboanga Sibugay": ["Alicia", "Buug", "City of Isabela", "Diplahan", "Imelda", "Ipil", "Kabasalan", "Mabuhay", "Malangas", "Naga", "Olutanga", "Payao", "Roseller Lim", "Siay", "Talusan", "Titay", "Tungawan"],
    "Bukidnon": ["Baungon", "Cabanglasan", "City of Malaybalay", "City of Valencia", "Damulog", "Dangcagan", "Don Carlos", "Impasug-ong", "Kadingilan", "Kalilangan", "Kibawe", "Kitaotao", "Lantapan", "Libona", "Malitbog", "Manolo Fortich", "Maramag", "Pangantucan", "Quezon", "San Fernando", "Sumilao", "Talakag"],
    "Camiguin": ["Catarman", "Guinsiliban", "Mahinog", "Mambajao", "Sagay"],
    "Lanao del Norte": ["Bacolod", "Baloi", "Baroy", "City of Iligan", "Kapatagan", "Kauswagan", "Kolambugan", "Lala", "Linamon", "Magsaysay", "Maigo", "Matungao", "Munai", "Nunungan", "Pantao Ragat", "Pantar", "Poona Piagapo", "Salvador", "Sapad", "Sultan Naga Dimaporo", "Tagoloan", "Tangcal", "Tubod"],
    "Misamis Occidental": ["Aloran", "Baliangao", "Bonifacio", "Calamba", "City of Oroquieta", "City of Ozamiz", "City of Tangub", "Clarin", "Concepcion", "Don Victoriano Chiongbian", "Jimenez", "Lopez Jaena", "Panaon", "Plaridel", "Sapang Dalaga", "Sinacaban", "Tudela"],
    "Misamis Oriental": ["Alubijid", "Balingasag", "Balingoan", "Binuangan", "City of Cagayan De Oro", "City of El Salvador", "City of Gingoog", "Claveria", "Gitagum", "Initao", "Jasaan", "Kinoguitan", "Lagonglong", "Laguindingan", "Libertad", "Lugait", "Magsaysay", "Manticao", "Medina", "Naawan", "Opol", "Salay", "Sugbongcogon", "Tagoloan", "Talisayan", "Villanueva"],
    "Davao del Norte": ["Asuncion", "Braulio E. Dujali", "Carmen", "City of Panabo", "City of Tagum", "Island Garden City of Samal", "Kapalong", "New Corella", "San Isidro", "Santo Tomas", "Talaingod"],
    "Davao del Sur": ["Bansalan", "City of Davao", "City of Digos", "Hagonoy", "Kiblawan", "Magsaysay", "Malalag", "Matanao", "Padada", "Santa Cruz", "Sulop"],
    "Davao Oriental": ["Baganga", "Banaybanay", "Boston", "Caraga", "Cateel", "City of Mati", "Governor Generoso", "Lupon", "Manay", "San Isidro", "Tarragona"],
    "Davao de Oro": ["Compostela", "Laak", "Mabini", "Maco", "Maragusan", "Mawab", "Monkayo", "Montevista", "Nabunturan", "New Bataan", "Pantukan"],
    "Davao Occidental": ["Don Marcelino", "Jose Abad Santos", "Malita", "Santa Maria", "Sarangani"],
    "Cotabato": ["Alamada", "Aleosan", "Antipas", "Arakan", "Banisilan", "Carmen", "City of Kidapawan", "Kabacan", "Libungan", "M'Lang", "Magpet", "Makilala", "Matalam", "Midsayap", "Pigkawayan", "Pikit", "President Roxas", "Tulunan"],
    "South Cotabato": ["Banga", "City of General Santos", "City of Koronadal", "Lake Sebu", "Norala", "Polomolok", "Santo Niño", "Surallah", "T'Boli", "Tampakan", "Tantangan", "Tupi"],
    "Sultan Kudarat": ["Bagumbayan", "City of Tacurong", "Columbio", "Esperanza", "Isulan", "Kalamansig", "Lambayong", "Lebak", "Lutayan", "Palimbang", "President Quirino", "Sen. Ninoy Aquino"],
    "Sarangani": ["Alabel", "Cotabato City", "Glan", "Kiamba", "Maasim", "Maitum", "Malapatan", "Malungon"],
    "Metro Manila": ["Caloocan City", "Las Piñas City", "Makati City", "Malabon City", "Mandaluyong City", "Manila", "Marikina City", "Muntinlupa City", "Navotas City", "Parañaque City", "Pasay City", "Pasig City", "Pateros", "Quezon City", "San Juan City", "Taguig City", "Valenzuela City"],
    "Abra": ["Bangued", "Boliney", "Bucay", "Bucloc", "Daguioman", "Danglas", "Dolores", "La Paz", "Lacub", "Lagangilang", "Lagayan", "Langiden", "Licuan-Baay", "Luba", "Malibcong", "Manabo", "Peñarrubia", "Pidigan", "Pilar", "Sallapadan", "San Isidro", "San Juan", "San Quintin", "Tayum", "Tineg", "Tubo", "Villaviciosa"],
    "Benguet": ["Atok", "Bakun", "Bokod", "Buguias", "City of Baguio", "Itogon", "Kabayan", "Kapangan", "Kibungan", "La Trinidad", "Mankayan", "Sablan", "Tuba", "Tublay"],
    "Ifugao": ["Aguinaldo", "Alfonso Lista", "Asipulo", "Banaue", "Hingyon", "Hungduan", "Kiangan", "Lagawe", "Lamut", "Mayoyao", "Tinoc"],
    "Kalinga": ["Balbalan", "City of Tabuk", "Lubuagan", "Pasil", "Pinukpuk", "Rizal", "Tanudan", "Tinglayan"],
    "Mountain Province": ["Barlig", "Bauko", "Besao", "Bontoc", "Natonin", "Paracelis", "Sabangan", "Sadanga", "Sagada", "Tadian"],
    "Apayao": ["Calanasan", "Conner", "Flora", "Kabugao", "Luna", "Pudtol", "Santa Marcela"],
    "Basilan": ["Akbar", "Al-Barka", "City of Lamitan", "Hadji Mohammad Ajul", "Hadji Muhtamad", "Lantawan", "Maluso", "Sumisip", "Tabuan-Lasa", "Tipo-Tipo", "Tuburan", "Ungkaya Pukan"],
    "Lanao del Sur": ["Amai Manabilang", "Bacolod-Kalawi", "Balabagan", "Balindong", "Bayang", "Binidayan", "Buadiposo-Buntong", "Bubong", "Butig", "Calanogas", "City of Marawi", "Ditsaan-Ramain", "Ganassi", "Kapai", "Kapatagan", "Lumba-Bayabao", "Lumbaca-Unayan", "Lumbatan", "Lumbayanague", "Madalum", "Madamba", "Maguing", "Malabang", "Marantao", "Marogong", "Masiu", "Mulondo", "Pagayawan", "Piagapo", "Picong", "Poona Bayabao", "Pualas", "Saguiaran", "Sultan Dumalondong", "Tagoloan Ii", "Tamparan", "Taraka", "Tubaran", "Tugaya", "Wao"],
    "Maguindanao": ["Ampatuan", "Barira", "Buldon", "Buluan", "Datu Abdullah Sangki", "Datu Anggal Midtimbang", "Datu Blah T. Sinsuat", "Datu Hoffer Ampatuan", "Datu Odin Sinsuat", "Datu Paglas", "Datu Piang", "Datu Salibo", "Datu Saudi-Ampatuan", "Datu Unsay", "Gen. S.K. Pendatun", "Guindulungan", "Kabuntalan", "Mamasapano", "Mangudadatu", "Matanog", "Northern Kabuntalan", "Pagagawan", "Pagalungan", "Paglat", "Pandag", "Parang", "Rajah Buayan", "Shariff Aguak", "Shariff Saydona Mustapha", "South Upi", "Sultan Kudarat", "Sultan Mastura", "Sultan Sa Barongis", "Talayan", "Talitay", "Upi"],
    "Sulu": ["Hadji Panglima Tahil", "Indanan", "Jolo", "Kalingalan Caluang", "Lugus", "Luuk", "Maimbung", "Old Panamao", "Omar", "Pandami", "Panglima Estino", "Pangutaran", "Parang", "Pata", "Patikul", "Siasi", "Talipao", "Tapul", "Tongkil"],
    "Tawi-Tawi": ["Bongao (Capital)", "Languyan", "Mapun", "Panglima Sugala", "Sapa-Sapa", "Sibutu", "Simunul", "Sitangkai", "South Ubian", "Tandubas", "Turtle Islands"],
    "Agusan del Norte": ["Buenavista", "Carmen", "City of Butuan", "City of Cabadbaran", "Jabonga", "Kitcharao", "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Santiago", "Tubay"],
    "Agusan del Sur": ["Bunawan", "City of Bayugan", "Esperanza", "La Paz", "Loreto", "Prosperidad", "Rosario", "San Francisco", "San Luis", "Santa Josefa", "Sibagat", "Talacogon", "Trento", "Veruela"],
    "Surigao del Norte": ["Alegria", "Bacuag", "Burgos", "City of Surigao", "Claver", "Dapa", "Del Carmen", "General Luna", "Gigaquit", "Mainit", "Malimono", "Pilar", "Placer", "San Benito", "San Francisco", "San Isidro", "Santa Monica", "Sison", "Socorro", "Tagana-An", "Tubod"],
    "Surigao del Sur": ["Barobo", "Bayabas", "Cagwait", "Cantilan", "Carmen", "Carrascal", "City of Bislig", "City of Tandag", "Cortes", "Hinatuan", "Lanuza", "Lianga", "Lingig", "Madrid", "Marihatag", "San Agustin", "San Miguel", "Tagbina", "Tago"],
    "Dinagat Islands": ["Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "San Jose", "Tubajon"],
}

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

.admin-float-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--navy);
  color: #fff;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-float-btn:hover { background: #253d6b; }

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

/* Tutorial Highlight Styles */
body.highlight-lang-btn .topbar {
  z-index: 1001;
}
body.highlight-lang-btn .lang-btn {
  position: relative;
  box-shadow: 0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5);
  pointer-events: none;
  border-radius: 20px;
}

/* Lock all scrollable containers during tutorial */
body.lock-scroll,
body.lock-scroll .app,
body.lock-scroll .main-content,
body.lock-scroll .scroll,
body.lock-scroll .scroll.no-nav {
  overflow: hidden !important;
  touch-action: none;
}

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
        under_review: { label: en ? "• Under Review" : "• Sinusuri", cls: "pending" },
        has_response: { label: en ? "• Response Received" : "• May Tugon", cls: "response" },
        response_received: { label: en ? "• New Response!" : "• Bagong Tugon!", cls: "response" },
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
function SignIn({ en, onNav, onLogin, showTutorial, setShowTutorial }) {
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
            <div style={{
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

function ChangeNumber({ en, onNav, showTutorial, setShowTutorial }) {
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
            <div style={{
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


function ForgotPassword({ en, onNav, showTutorial, setShowTutorial }) {
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
            <div style={{
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

// Previous password function we keep just in case as basis, Security question 1 will change to security question 2 if the former was answered incorrectly
// function ForgotPassword({ en, onNav }) {
//     const [step, setStep] = useState(1)
//     const [mobile, setMobile] = useState("")
//     const [securityQuestion, setSecurityQuestion] = useState("")
//     const [securityAnswer, setSecurityAnswer] = useState("")
//     const [newPassword, setNewPassword] = useState("")
//     const [confirmPassword, setConfirmPassword] = useState("")
//     const [loading, setLoading] = useState(false)
//     const [error, setError] = useState("")
//     const [success, setSuccess] = useState(false)
//     const [usedSecondQuestion, setUsedSecondQuestion] = useState(false)
//
//     async function handleFindAccount(e) {
//         e.preventDefault()
//         if (!mobile) return
//         setLoading(true)
//         setError("")
//         const { data } = await supabase.from("drivers").select("id, security_question, security_question_2").eq("mobile", mobile).single()
//         setLoading(false)
//         if (!data) {
//             setError(en ? "Mobile number not found." : "Hindi nahanap ang numero.")
//             return
//         }
//         if (!data.security_question) {
//             setError(en ? "No security question set up for this account. Please contact support." : "Walang security question sa account na ito.")
//             return
//         }
//         setSecurityQuestion(data.security_question)
//         setStep(2)
//     }
//
//     async function handleVerifyAnswer(e) {
//         e.preventDefault()
//         if (!securityAnswer) return
//         setLoading(true)
//         setError("")
//         const { data } = await supabase.from("drivers").select("security_answer, security_question_2, security_answer_2").eq("mobile", mobile).single()
//         setLoading(false)
//         const correct = usedSecondQuestion
//             ? data?.security_answer_2 === securityAnswer.trim().toLowerCase()
//             : data?.security_answer === securityAnswer.trim().toLowerCase()
//         if (!correct) {
//             if (!usedSecondQuestion && data?.security_question_2) {
//                 setError(en ? "Incorrect answer. Try your second security question instead?" : "Maling sagot. Subukan ang pangalawang security question?")
//                 setTimeout(() => {
//                     setError("")
//                     setSecurityQuestion(data.security_question_2)
//                     setSecurityAnswer("")
//                     setUsedSecondQuestion(true)
//                 }, 2000)
//             } else {
//                 setError(en ? "Incorrect answer. Please contact support." : "Maling sagot. Makipag-ugnayan sa suporta.")
//             }
//             return
//         }
//         setStep(3)
//     }
//
//     function validateNewPassword() {
//         if (newPassword.length < 8) return en ? "Password must be at least 8 characters." : "Dapat hindi bababa sa 8 karakter ang password."
//         if (!/[0-9]/.test(newPassword)) return en ? "Password must contain at least one number." : "Dapat may kasamang numero ang password."
//         if (!/[!@#$%^&*(),.?":{}|<>_\-+=]/.test(newPassword)) return en ? "Password must contain at least one special character." : "Dapat may kasamang special character ang password."
//         if (newPassword !== confirmPassword) return en ? "Passwords do not match." : "Hindi magkatugma ang mga password."
//         return null
//     }
//
//     async function handleResetPassword(e) {
//         e.preventDefault()
//         const pwError = validateNewPassword()
//         if (pwError) { setError(pwError); return }
//         setLoading(true)
//         setError("")
//         const { error } = await supabase.from("drivers").update({ password: newPassword }).eq("mobile", mobile)
//         setLoading(false)
//         if (error) {
//             setError(en ? "Something went wrong. Please try again." : "May nangyaring mali. Subukan muli.")
//             return
//         }
//         setSuccess(true)
//     }
//
//     if (success) return (
//         <div className="pad" style={{ paddingTop: 40 }}>
//             <div style={{ textAlign: "center", marginBottom: 24 }}>
//                 <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
//                     UP<span style={{ color: "var(--gold)" }}>LIFT</span>
//                 </div>
//             </div>
//             <div className="card" style={{ padding: 24, textAlign: "center" }}>
//                 <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
//                 <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
//                     {en ? "Password reset successful." : "Matagumpay na na-reset ang password."}
//                 </div>
//                 <p style={{ fontSize: 13, color: "var(--slate)", marginBottom: 16 }}>
//                     {en ? "You can now sign in with your new password." : "Maaari ka nang mag-sign in gamit ang bagong password."}
//                 </p>
//                 <button className="btn gold" onClick={() => onNav("signin")}>{en ? "Go to Sign In" : "Pumunta sa Sign In"}</button>
//             </div>
//         </div>
//     )
//
//     return (
//         <div className="pad" style={{ paddingTop: 28 }}>
//             <div style={{ textAlign: "center", marginBottom: 24 }}>
//                 <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>
//                     UP<span style={{ color: "var(--gold)" }}>LIFT</span>
//                 </div>I
//             </div>
//             <div className="card" style={{ padding: 20 }}>
//                 <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
//                     {en ? "Forgot Password" : "Nakalimutan ang Password"}
//                 </h2>
//                 <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 16 }}>
//                     {en ? "Enter your number, verify your identity, then set a new password." : "Ilagay ang iyong numero, i-verify ang pagkakakilanlan, pagkatapos ay magtakda ng bagong password."}
//                 </p>
//
//                 <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
//                     {[1,2,3].map(n => (
//                         <div key={n} style={{ flex: 1, textAlign: "center" }}>
//                             <div style={{
//                                 width: 28, height: 28, borderRadius: "50%", margin: "0 auto 4px",
//                                 background: step >= n ? "var(--navy)" : "var(--border)",
//                                 color: step >= n ? "#fff" : "var(--slate)",
//                                 display: "flex", alignItems: "center", justifyContent: "center",
//                                 fontSize: 12, fontWeight: 700
//                             }}>{n}</div>
//                             <div style={{ fontSize: 10, color: "var(--slate)" }}>
//                                 {n === 1 ? (en ? "Mobile number" : "Numero") : n === 2 ? (en ? "Confirm identity" : "Kumpirmahin") : (en ? "New password" : "Bagong password")}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//
//                 {error && <div className="alert amber">{error}</div>}
//
//                 {step === 1 && (
//                     <form onSubmit={handleFindAccount}>
//                         <div className="fg">
//                             <label className="fl">{en ? "Mobile Number" : "Numero ng Telepono"}</label>
//                             <input className="fi" placeholder="09XX XXX XXXX" value={mobile} onChange={e => setMobile(e.target.value)} />
//                         </div>
//                         <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Continue" : "Magpatuloy")}</button>
//                     </form>
//                 )}
//
//                 {step === 2 && (
//                     <form onSubmit={handleVerifyAnswer}>
//                         <div className="alert jade">✓ {en ? `Account found for ${mobile}` : `Nahanap ang account para sa ${mobile}`}</div>
//                         <div className="fg">
//                             <label className="fl">{securityQuestion}</label>
//                             <input className="fi" placeholder={en ? "Your answer" : "Sagot mo"} value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} />
//                             <div className="fh">{en ? "Not case-sensitive." : "Hindi case-sensitive."}</div>
//                         </div>
//                         <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Verify Identity" : "I-verify ang Pagkakakilanlan")}</button>
//                         <button type="button" className="btn outline" onClick={() => setStep(1)}>{en ? "Back" : "Bumalik"}</button>
//                     </form>
//                 )}
//
//                 {step === 3 && (
//                     <form onSubmit={handleResetPassword}>
//                         <div className="alert jade">✓ {en ? "Identity confirmed. Set your new password." : "Nakumpirma ang pagkakakilanlan. Itakda ang bagong password."}</div>
//                         <div className="fg">
//                             <label className="fl">{en ? "New Password" : "Bagong Password"}</label>
//                             <input className="fi" type="password" placeholder={en ? "Enter new password" : "Ilagay ang bagong password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
//                             <div className="fh">{en ? "At least 8 characters, with a number and a special character." : "Hindi bababa sa 8 karakter, may numero at special character."}</div>
//                         </div>
//                         <div className="fg">
//                             <label className="fl">{en ? "Confirm New Password" : "Kumpirmahin ang Bagong Password"}</label>
//                             <input className="fi" type="password" placeholder={en ? "Re-enter new password" : "Ulitin ang bagong password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
//                         </div>
//                         <button className="btn gold" type="submit" disabled={loading}>{loading ? "..." : (en ? "Reset Password" : "I-reset ang Password")}</button>
//                         <button type="button" className="btn outline" onClick={() => setStep(2)}>{en ? "Back" : "Bumalik"}</button>
//                     </form>
//                 )}
//
//                 <div style={{ textAlign: "center", fontSize: 12, color: "var(--slate)", marginTop: 14 }}>
//                     <span className="link" onClick={() => onNav("signin")}>← {en ? "Back to Sign In" : "Bumalik sa Sign In"}</span>
//                 </div>
//             </div>
//         </div>
//     )
// }

// ─── SIGN UP ──────────────────────────────────────────────────────────────────
function SignUp({ en, onNav, onLogin, showTutorial, setShowTutorial }) {
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
            <div style={{
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

function ConcernsInline({ en, concerns, apps, driverId, showToast, refreshConcerns, showTutorial, tutStep, getHighlightStyle, GuideBox }) {
    const [openThreadId, setOpenThreadId] = useState(null)
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
    const [draftMessages, setDraftMessages] = useState({})
    const [draftTimers, setDraftTimers] = useState({})
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

    const [followUpText, setFollowUpText] = useState("")
    const [sendingFollowUp, setSendingFollowUp] = useState(false)

    async function sendFollowUp(concern) {
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

    function handleDraftChange(concernId, value) {
        setDraftMessages(p => ({ ...p, [concernId]: value }))
        if (draftTimers[concernId]) clearTimeout(draftTimers[concernId])
        const timer = setTimeout(async () => {
            if (!value.trim()) {
                await supabase.from("grievances").delete().eq("id", concernId)
                setOpenThreadId(null)
                await refreshConcerns()
                return
            }
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

    // ── Chat-thread screen for a single concern ──
    const openThread = openThreadId ? concerns.find(c => c.id === openThreadId) : null
    if (openThread) {
        const isDraft = openThread.is_draft || openThread.status === "draft"
        const programName = openThread.applications?.payout_events?.program_name || (en ? "General Concern" : "Pangkalahatang Alalahanin")
        const thread = getThreadMessages(openThread)
        return (
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span className="link" onClick={() => { setOpenThreadId(null); setFollowUpText("") }}>← {en ? "Back to My Concerns" : "Bumalik sa Aking mga Alalahanin"}</span>
                </div>
                <div className="card" style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--navy)" }}>
                        📋 {programName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <div style={{ fontSize: 12, color: "var(--slate)" }}>{openThread.concern_type}</div>
                        {openThread.is_grievance && (
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
                            value={draftMessages[openThread.id] ?? openThread.draft_message ?? ""}
                            onChange={e => handleDraftChange(openThread.id, e.target.value)}
                            placeholder={en ? "Your concern..." : "Ang iyong alalahanin..."}
                            style={{ minHeight: 90, marginBottom: 8 }}
                        />
                        <div style={{ fontSize: 11, color: "var(--slate)", marginBottom: 8 }}>
                            💾 {en ? "Auto-saving as you type..." : "Awtomatikong nini-save habang nagta-type..."}
                        </div>
                        <button className="btn navy" style={{ marginBottom: 0 }} onClick={() => submitConcern(openThread)}>
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
                        <button className="btn navy sm" style={{ width: "auto", marginBottom: 0, padding: "12px 18px" }} disabled={sendingFollowUp || !followUpText.trim()} onClick={() => sendFollowUp(openThread)}>
                            {sendingFollowUp ? "..." : (en ? "Send" : "Ipadala")}
                        </button>
                    </div>
                )}
            </div>
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
                            setOpenThreadId(c.id)
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

function MyConcernsPage({ en, concerns, apps, driverId, showToast, refreshConcerns, onNav, showTutorial, setShowTutorial }) {
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
            <div style={{
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
                    <ConcernsInline en={en} concerns={concerns} apps={apps} driverId={driverId} showToast={showToast} refreshConcerns={refreshConcerns} showTutorial={showTutorial} tutStep={tutStep} getHighlightStyle={getHighlightStyle} GuideBox={GuideBox} />
                </div>
                <GuideBox stepIndex={1} />
            </div>
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

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ en, onNav, driver, apps, appointment, onUploadDocument, concerns, driverId, showToast, refreshConcerns, openEvents, onOpenModal, showTutorial, setShowTutorial }) {
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
        const interval = setInterval(() => {
            if (refreshApps) refreshApps()
        }, 15000)
        return () => clearInterval(interval)
    }, [])

    // Reset tutorial step when it's closed
    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    // 1. Force-lock all scrollable containers
    useEffect(() => {
        if (showTutorial) {
            document.body.classList.add('lock-scroll');
        } else {
            document.body.classList.remove('lock-scroll');
        }
        return () => document.body.classList.remove('lock-scroll');
    }, [showTutorial]);

    // 2. Smooth auto-scroll to the highlighted step
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
            fil: "Ito ang iyong Welcome Area. Ipinapakita dito ang iyong pangalan, mga aktibong subsidy, at kung verified na ang iyong account.",
            position: { top: '300px', left: '25%', transform: 'translateX(-50%)' }
        },
        {
            en: "This is your Notifications panel. Important updates about your applications, deadlines, and messages from the agency will appear here.",
            fil: "Ito ang panel ng mga Abiso. Dito lalabas ang mga mahahalagang update sa iyong mga aplikasyon, deadline, at mensahe mula sa ahensya.",
            position: { top: '300px', left: '75%', transform: 'translateX(-50%)' }
        },
        {
            en: "Click here to browse all available payout events and submit a new subsidy application.",
            fil: "I-click ito upang tingnan ang lahat ng available na payout event at mag-submit ng bagong aplikasyon para sa subsidy.",
            position: { top: '450px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Here you can track the status of the subsidies you've applied for, whether they are pending, approved, or rejected.",
            fil: "Dito mo masusubaybayan ang status ng mga inapplyan mong subsidy, kung ito ay nakabinbin, naaprubahan, o tinanggihan.",
            position: { bottom: '250px', left: '50%', transform: 'translateX(-50%)' }
        },
        {
            en: "Need assistance or want to update your details? Use these buttons to visit the Help Center or edit your profile.",
            fil: "Kailangan ng tulong o nais i-update ang iyong detalye? Gamitin ang mga button na ito para pumunta sa Help Center o i-edit ang iyong profile.",
            position: { bottom: '280px', left: '50%', transform: 'translateX(-50%)' }
        }
    ]

    const getHighlightStyle = (stepIndex, bgType) => {
        if (showTutorial && tutStep === stepIndex) {
            return {
                position: "relative",
                zIndex: 1000,
                boxShadow: "0 0 0 4px var(--gold), 0 8px 32px rgba(0,0,0,0.5)",
                pointerEvents: "none", // Prevent clicks while in tutorial
                background: bgType === 'navy' ? "var(--navy)" : (bgType === 'white' ? "#fff" : "var(--cream)"),
                borderRadius: "var(--r)",
                transition: "all 0.3s ease"
            }
        }
        return { transition: "all 0.3s ease" }
    }

    // Inline GuideBox Component - Now Absolute Positioned!
    function GuideBox({ stepIndex }) {
        if (!showTutorial || tutStep !== stepIndex) return null
        return (
            <div style={{
                position: "absolute",
                top: "calc(100% + 12px)", // Automatically hangs just below the element
                left: 0,
                width: "100%", // Match width of highlighted box
                zIndex: 1000,
                background: "var(--navy)",
                borderRadius: "var(--r)",
                padding: "16px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                pointerEvents: "auto", // Allows clicking inside the box
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
            {/* ── TUTORIAL BACKDROP (Spotlight Only) ── */}
            {showTutorial && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(3px)',
                    zIndex: 999
                }} />
            )}

            {/* ── Greeting + Notifications side by side ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "0 0 0 0" }}>

                {/* Left box — greeting (Tutorial Step 1) */}
                <div id="tut-step-0" className="dh" style={{ borderRadius: "var(--r)", padding: "24px 20px", ...getHighlightStyle(0, 'navy') }}>
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
                    {/* The tutorial box will float under this content when active */}
                    <GuideBox stepIndex={0} />
                </div>

                {/* Right box — notifications (Tutorial Step 2) */}
                <div id="tut-step-1" className="dh" style={{ borderRadius: "var(--r)", padding: "16px 14px", ...getHighlightStyle(1, 'navy') }}>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        🔔 {en ? "Notifications" : "Mga Abiso"}
                    </div>
                    <div style={{ overflowY: "auto", maxHeight: 160 }}>
                        <NotifFeed en={en} apps={apps} appointment={appointment} driver={driver} openEvents={openEvents} onOpenModal={handleModalOpen} compact={true} />
                    </div>
                    <GuideBox stepIndex={1} />
                </div>
            </div>

            <div className="pad">
                {/* ── Apply for Subsidy — TOP (Tutorial Step 3) ── */}
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

                {/* ── My Subsidies (Tutorial Step 4) ── */}
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
                        const pillStatus = a.status === "approved" ? "approved"
                            : a.status === "rejected" ? "rejected"
                                : hasNewMessage ? "response_received"
                                    : hasAnyMessage ? "has_response"
                                        : "under_review"
                        return (
                            <div
                                className="card"
                                key={a.id}
                                style={{ cursor: "pointer", pointerEvents: "auto" }}
                                onClick={async () => {
                                    if (showTutorial) return; // Prevent clicking during tutorial

                                    // Mark as read if there's a new message badge
                                    if (hasNewMessage) {
                                        await supabase.from("applications").update({ driver_seen_latest: true }).eq("id", a.id);
                                        if (refreshApps) refreshApps();
                                    }

                                    // Navigate to Subsidies AND pass the specific application ID
                                    onNav("subsidies", a.id);
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
                                        {a.status === "approved" && (
                                            <span style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "var(--slate)" }}>
                                👆 {en ? "View instructions" : "Tingnan ang tagubilin"}
                            </span>
                                        )}
                                        {a.status === "rejected" && (
                                            <span style={{ background: "var(--brick-bg)", border: "1px solid var(--brick)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "var(--brick)" }}>
                                👆 {en ? "Click to know why" : "I-click para malaman"}
                            </span>
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

                {/* ── Help + Profile two-column row (Tutorial Step 5) ── */}
                <div id="tut-step-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: showTutorial && tutStep === 4 ? 12 : 0, ...getHighlightStyle(4, 'cream') }}>
                    <div className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center", pointerEvents: "auto" }} onClick={() => onNav("myconcerns")}>
                        <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--gold-dk)", marginBottom: 4 }}>{en ? "Need Help?" : "Kailangan ng Tulong?"}</div>
                        <div style={{ fontSize: 12, color: "var(--slate)" }}>{en ? "Concerns, Grievances and FAQ" : "Mga Alalahanin, Reklamo at FAQ"}</div>
                        {concerns.filter(c => c.grievance_messages?.some(m => m.sent_by === "admin") && !c.driver_seen_reply).length > 0 && (
                            <div style={{ marginTop: 8, background: "var(--jade-bg)", color: "var(--jade)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                🔔 {concerns.filter(c => c.grievance_messages?.some(m => m.sent_by === "admin") && !c.driver_seen_reply).length} {en ? "new response(s)" : "bagong tugon"}
                            </div>
                        )}
                    </div>
                    <div className="card" style={{ padding: 16, cursor: "pointer", textAlign: "center", pointerEvents: "auto" }} onClick={() => onNav("editprofile")}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>👤</div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>{en ? "My Profile" : "Aking Profile"}</div>
                        <div style={{ fontSize: 12, color: "var(--slate)" }}>{en ? "Edit your information" : "I-edit ang impormasyon"}</div>
                    </div>
                    <GuideBox stepIndex={4} />
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

function ApprovedDetails({ a, en }) {
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

// function ApprovedDetails({ a, en, appointment }) {
//     const [qr, setQr] = useState(false)
//     const appt = appointment ? appointment : null
//     const latestMsg = a.application_messages?.length > 0
//         ? [...a.application_messages].sort((x, y) => new Date(y.created_at) - new Date(x.created_at))[0]
//         : null
//
//     return (
//         <div>
//             {/* Admin approval message */}
//             {latestMsg && (
//                 <div style={{ background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "var(--navy)", lineHeight: 1.7 }}>
//                     <div style={{ fontSize: 11, color: "var(--jade)", fontWeight: 700, marginBottom: 6 }}>
//                         🏛️ {en ? "Instructions from Agency" : "Mga Tagubilin mula sa Ahensya"}
//                     </div>
//                     {latestMsg.message}
//                 </div>
//             )}
//
//             {/* Appointment details */}
//             {appt && (
//                 <div className="appt-card" style={{ marginBottom: 12 }}>
//                     <div className="appt-label">ACTIVE APPOINTMENT</div>
//                     <div className="appt-prog">{appt.payout_events?.program_name}</div>
//                     <div className="appt-row">
//                         <span className="appt-ico">📅</span>
//                         <div className="appt-txt">
//                             {appt.assigned_date || appt.payout_events?.event_date}
//                             <small>{appt.time_slot || `${appt.payout_events?.time_start} – ${appt.payout_events?.time_end}`}</small>
//                         </div>
//                     </div>
//                     <div className="appt-row">
//                         <span className="appt-ico">📍</span>
//                         <div className="appt-txt">{appt.venue || appt.payout_events?.venue}
//                         </div>
//                     </div>
//                     <div className="appt-ref">{en ? "Ref:" : "Ref:"} <strong>{appt.reference_code}</strong></div>
//                 </div>
//             )}
//
//             {/* QR Code */}
//             {appt && (
//                 <>
//                     <button className="btn gold" onClick={() => setQr(!qr)} style={{ marginBottom: 8 }}>
//                         {qr ? (en ? "Hide QR Code" : "Itago ang QR") : (en ? "Show QR Code" : "Ipakita ang QR")}
//                     </button>
//                     {qr && (
//                         <div className="card" style={{ textAlign: "center", padding: 16, marginBottom: 8 }}>
//                             <QRDisplay value={`UPLIFT|${appt.reference_code}|${appt.assigned_date}|${appt.venue}`} />
//                             <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 8 }}>
//                                 {en ? "Show this QR code to the officer at the venue." : "Ipakita ang QR code na ito sa opisyal sa venue."}
//                             </div>
//                             <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
//                                 {appt.reference_code}
//                             </div>
//                         </div>
//                     )}
//                 </>
//             )}
//
//             {/* Previous messages */}
//             {a.application_messages?.length > 1 && (
//                 <div style={{ marginTop: 8 }}>
//                     <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 11, color: "var(--slate)", marginBottom: 6 }}>
//                         {en ? "Previous messages:" : "Mga nakaraang mensahe:"}
//                     </div>
//                     {[...a.application_messages]
//                         .sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
//                         .slice(1)
//                         .map((msg, i) => (
//                             <div key={msg.id || i} style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px", marginBottom: 6, fontSize: 12, color: "var(--slate)" }}>
//                                 <div style={{ fontSize: 10, color: "var(--slate)", marginBottom: 2 }}>
//                                     {new Date(msg.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
//                                 </div>
//                                 {msg.message}
//                             </div>
//                         ))}
//                 </div>
//             )}
//         </div>
//     )
// }

function AppointmentDetail({ en, app, allAppointments, driverId, showToast, refreshApps, onNav, onBack }) {
    const [qr, setQr] = useState(false)
    const appt = allAppointments?.find(ap => ap.event_id === app?.event_id) || null

    const hasAnyMessage = app?.application_messages?.length > 0
    const status = app?.status === "approved" ? "approved"
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

// ─── SUBSIDIES ────────────────────────────────────────────────────────────────
// function Subsidies({ en, onNav, apps, appointment, allAppointments, driverId, showToast, refreshApps }) {
//     const [grievanceId, setGrievanceId] = useState(null)
//     const [grievanceForm, setGrievanceForm] = useState({ type: "", message: "" })
//
//     async function submitGrievance(appId) {
//         if (!grievanceForm.message) return
//         await supabase.from("grievances").insert({
//             driver_id: driverId,
//             application_id: appId,
//             concern_type: grievanceForm.type || "Other",
//             message: grievanceForm.message,
//         })
//         setGrievanceId(null)
//         setGrievanceForm({ type: "", message: "" })
//         showToast(en ? "Grievance submitted." : "Naisumite ang reklamo.")
//     }
//
//     const [expandedAppId, setExpandedAppId] = useState(null)
//     const [detailApp, setDetailApp] = useState(null)
//     useEffect(() => {
//         const interval = setInterval(() => {
//             refreshApps()
//         }, 10000)
//         return () => clearInterval(interval)
//     }, [])
//     const [qr, setQr] = useState(false)
//
//     function computeStatus(a) {
//         const hasNewMessage = a.application_messages?.length > 0 && !a.driver_seen_latest
//         const hasAnyMessage = a.application_messages?.length > 0
//         return a.status === "approved" ? "approved"
//             : a.status === "rejected" ? "rejected"
//                 : hasNewMessage ? "response_received"
//                     : hasAnyMessage ? "has_response"
//                         : "under_review"
//     }
//
//     const [selectedApp, setSelectedApp] = useState(null)
//     useEffect(() => {
//         if (!selectedApp && apps.length > 0) {
//             const withAppt = apps.find(a => allAppointments.some(ap => ap.event_id === a.event_id))
//             setSelectedApp(withAppt || apps[0])
//         }
//         if (selectedApp && !apps.find(a => a.id === selectedApp.id)) {
//             setSelectedApp(apps[0] || null)
//         }
//     }, [apps, allAppointments])
//     const selectedAppt = selectedApp ? allAppointments.find(ap => ap.event_id === selectedApp.event_id) : null
//     const selectedStatus = selectedApp ? computeStatus(selectedApp) : null
//     const [showReschedule, setShowReschedule] = useState(false)
//     const [loadingReschedule, setLoadingReschedule] = useState(false)
//     const [rescheduleOptions, setRescheduleOptions] = useState([])
//     const [selectedReschedule, setSelectedReschedule] = useState(null)
//     const [submittingReschedule, setSubmittingReschedule] = useState(false)
//
//     async function openReschedule(appt) {
//         setShowReschedule(true)
//         setLoadingReschedule(true)
//         setSelectedReschedule(null)
//         const { data } = await supabase
//             .from("payout_events")
//             .select("*")
//             .eq("program_name", appt.payout_events?.program_name)
//             .gte("event_date", new Date().toISOString().split("T")[0])
//             .neq("id", appt.event_id)
//             .order("event_date", { ascending: true })
//         setRescheduleOptions(data || [])
//         setLoadingReschedule(false)
//     }
//
//     async function confirmReschedule() {
//         if (!selectedReschedule || !appointment) return
//         setSubmittingReschedule(true)
//         await supabase.from("appointments").update({
//             event_id: selectedReschedule.id,
//             assigned_date: selectedReschedule.event_date,
//             time_slot: `${selectedReschedule.time_start} – ${selectedReschedule.time_end}`,
//             venue: selectedReschedule.venue,
//         }).eq("id", appointment.id)
//         await supabase.from("applications").update({
//             event_id: selectedReschedule.id,
//         }).eq("driver_id", driverId).eq("event_id", appointment.event_id)
//         setSubmittingReschedule(false)
//         setShowReschedule(false)
//         setSelectedReschedule(null)
//         showToast(en ? "Appointment rescheduled successfully." : "Matagumpay na na-reschedule ang appointment.")
//         await refreshApps()
//     }
//
//     if (detailApp) {
//         return <AppointmentDetail en={en} app={detailApp} appointment={appointment} allAppointments={allAppointments} onBack={() => setDetailApp(null)} />
//     }
//     return (
//         <div>
//             <div className="ph">
//                 <h1>{en ? "My Subsidies" : "Ang Aking mga Subsidy"}</h1>
//                 <p>{en ? "Status of all your applications and appointments" : "Katayuan ng lahat ng iyong mga aplikasyon at appointment"}</p>
//             </div>
//             <div className="pad">
//                 {selectedApp && (
//                     <>
//                         <div className="srow"><h2>{en ? "My Appointment" : "Ang Aking Appointment"}</h2></div>
//                         <div className="appt-card">
//                             <div className="appt-label">ACTIVE APPOINTMENT</div>
//                             <div className="appt-prog">{selectedApp.payout_events?.program_name}</div>
//                             <div style={{ marginBottom: 10 }}><Pill status={selectedStatus} en={en} /></div>
//                             {selectedAppt ? (
//                                 <>
//                                     <div className="appt-row"><span className="appt-ico">📅</span><div className="appt-txt">{selectedAppt.assigned_date}<small>{selectedAppt.time_slot}</small></div></div>
//                                     <div className="appt-row"><span className="appt-ico">📍</span><div className="appt-txt">{selectedAppt.venue}<small>{en ? "Bring Driver's License + this reference" : "Dalhin ang Driver's License + reference na ito"}</small></div></div>
//                                     <div className="appt-ref">{en ? "Ref:" : "Ref:"} <strong>{selectedAppt.reference_code}</strong></div>
//                                 </>
//                             ) : (
//                                 <div className="appt-row"><span className="appt-ico">📅</span><div className="appt-txt">{selectedApp.payout_events?.event_date}<small>{selectedApp.payout_events?.time_start} – {selectedApp.payout_events?.time_end}</small></div></div>
//                             )}
//                         </div>
//                         {selectedAppt && qr && (
//                             <div className="card" style={{ textAlign: "center", padding: 16 }}>
//                                 <QRDisplay value={`UPLIFT|${selectedAppt.reference_code}|${selectedAppt.assigned_date}|${selectedAppt.venue}`} />
//                                 <div style={{ fontSize: 12, color: "var(--slate)", marginTop: 8 }}>
//                                     {en ? "Show this QR code to the officer at the venue." : "Ipakita ang QR code na ito sa opisyal sa venue."}
//                                 </div>
//                                 <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginTop: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
//                                     {selectedAppt.reference_code}
//                                 </div>
//                             </div>
//                         )}
//                         {selectedAppt && (
//                             <button className="btn gold" onClick={() => setQr(!qr)}>{qr ? (en ? "Hide QR Code" : "Itago ang QR") : (en ? "Show QR Code" : "Ipakita ang QR")}</button>
//                         )}
//                         {selectedAppt && !showReschedule ? (
//                             <button className="btn outline" onClick={() => openReschedule(selectedAppt)}>{en ? "Reschedule My Appointment" : "I-reschedule ang Appointment"}</button>
//                         ) : selectedAppt && (
//                             <div className="card" style={{ marginTop: 4 }}>
//                                 <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
//                                     🔄 {en ? "Choose a New Schedule" : "Pumili ng Bagong Iskedyul"}
//                                 </div>
//                                 {loadingReschedule ? (
//                                     <div className="empty"><div>{en ? "Loading available dates..." : "Naglo-load ng mga available na petsa..."}</div></div>
//                                 ) : rescheduleOptions.length === 0 ? (
//                                     <div style={{ fontSize: 12, color: "var(--slate)", padding: 8 }}>
//                                         {en ? "No other open schedules available for this program. Please come during walk-in hours with your Driver's License." : "Walang ibang bukas na iskedyul para sa programang ito. Pumunta sa walk-in hours na may dala na Driver's License."}
//                                     </div>
//                                 ) : (
//                                     <>
//                                         <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 10 }}>
//                                             {en ? "Select a new date and venue:" : "Pumili ng bagong petsa at venue:"}
//                                         </p>
//                                         {rescheduleOptions.map(opt => (
//                                             <div
//                                                 key={opt.id}
//                                                 onClick={() => setSelectedReschedule(opt)}
//                                                 style={{
//                                                     border: selectedReschedule?.id === opt.id ? "2px solid var(--gold)" : "1px solid var(--border)",
//                                                     borderRadius: "var(--r-sm)", padding: 10, marginBottom: 8, cursor: "pointer",
//                                                     background: selectedReschedule?.id === opt.id ? "var(--amber-bg)" : "#fff"
//                                                 }}
//                                             >
//                                                 <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>📅 {opt.event_date} · 🕐 {opt.time_start} – {opt.time_end}</div>
//                                                 <div style={{ fontSize: 11, color: "var(--slate)", marginTop: 2 }}>📍 {opt.venue}</div>
//                                             </div>
//                                         ))}
//                                         <button className="btn gold" disabled={!selectedReschedule || submittingReschedule} onClick={confirmReschedule}>
//                                             {submittingReschedule ? "..." : (en ? "Confirm New Schedule" : "Kumpirmahin ang Bagong Iskedyul")}
//                                         </button>
//                                     </>
//                                 )}
//                                 <button className="btn outline" style={{ marginTop: 8 }} onClick={() => { setShowReschedule(false); setSelectedReschedule(null) }}>
//                                     {en ? "Cancel" : "Kanselahin"}
//                                 </button>
//                             </div>
//                         )}
//                         {selectedStatus === "approved" && (
//                             <button className="btn" style={{ background: "var(--jade)", color: "#fff" }} onClick={() => setDetailApp(selectedApp)}>
//                                 ✅ {en ? "View Instructions" : "Tingnan ang Tagubilin"}
//                             </button>
//                         )}
//                         {selectedStatus === "rejected" && (
//                             <button className="btn" style={{ background: "var(--brick)", color: "#fff" }} onClick={() => setExpandedAppId(selectedApp.id)}>
//                                 ❌ {en ? "Find Out Why" : "Alamin Kung Bakit"}
//                             </button>
//                         )}
//                         <button className="btn outline" onClick={() => onNav("helpcenter", selectedApp.id)}>
//                             💬 {en ? "Need Help?" : "Kailangan ng Tulong?"}
//                         </button>
//                         <div className="spacer" />
//                     </>
//                 )}
//                 <div className="srow"><h2>{en ? "My Applications" : "Aking mga Aplikasyon"}</h2></div>
//                 {apps.length === 0 ? (
//                     <div className="empty">
//                         <div className="empty-ico">📋</div>
//                         <div>{en ? "No applications yet." : "Wala pang aplikasyon."}</div>
//                         <button className="btn gold" style={{ marginTop: 12 }} onClick={() => onNav("apply")}>{en ? "Browse Available Subsidies" : "Tingnan ang Mga Available na Subsidy"}</button>
//                     </div>
//                 ) : apps.map(a => {
//                     const hasNewMessage = a.application_messages?.length > 0 && !a.driver_seen_latest
//                     const hasAnyMessage = a.application_messages?.length > 0
//                     const pillStatus = a.status === "approved" ? "approved"
//                         : a.status === "rejected" ? "rejected"
//                             : hasNewMessage ? "response_received"
//                                 : hasAnyMessage ? "has_response"
//                                     : "under_review"
//                     return (
//                         <div key={a.id}>
//                             <div className="card" style={selectedApp?.id === a.id ? { border: "1.5px solid var(--gold)" } : undefined}>
//                                 <div className="card-top">
//                                     <div className="card-name">{a.payout_events?.program_name || "Subsidy"}</div>
//                                     <div className="card-amount">{a.payout_events?.program_amount || ""}</div>
//                                 </div>
//                                 <div className="card-agency">{a.payout_events?.program_agency || ""}</div>
//                                 <div style={{ fontSize: 12, color: "var(--slate)", marginBottom: 8 }}>
//                                     📍 {a.payout_events?.venue} · 📅 {a.payout_events?.event_date}
//                                 </div>
//                                 <div
//                                     className="card-footer"
//                                     style={{ cursor: "pointer", flexWrap: "wrap", gap: 8 }}
//                                     onClick={async () => {
//                                         setSelectedApp(a)
//                                         const isExpanding = expandedAppId !== a.id
//                                         setExpandedAppId(isExpanding ? a.id : null)
//                                         if (isExpanding && hasNewMessage) {
//                                             await supabase.from("applications").update({ driver_seen_latest: true }).eq("id", a.id)
//                                             await refreshApps()
//                                         }
//                                     }}
//                                 >
//                                     <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
//                                         <Pill status={pillStatus} en={en} />
//                                         {hasNewMessage && (
//                                             <span style={{ background: "var(--gold)", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>!</span>
//                                         )}
//                                         {a.status === "approved" && (
//                                             <span
//                                                 style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "var(--slate)", cursor: "pointer" }}
//                                                 onClick={e => { e.stopPropagation(); setDetailApp(a) }}
//                                             >
//                                                 👆 {en ? "View instructions" : "Tingnan ang tagubilin"}
//                                             </span>
//                                         )}
//                                         {a.status === "rejected" && (
//                                             <span style={{ background: "var(--brick-bg)", border: "1px solid var(--brick)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "var(--brick)", cursor: "pointer" }}>
//                                                 {expandedAppId === a.id ? "▲" : en ? "👆 Click to know why" : "👆 I-click para malaman"}
//                                             </span>
//                                         )}
//                                         {a.status === "pending" && !hasAnyMessage && (
//                                             <span style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "var(--slate)" }}>
//                                                 {expandedAppId === a.id ? "▲" : en ? "👆 View updates" : "👆 Tingnan ang updates"}
//                                             </span>
//                                         )}
//                                     </div>
//                                     <span className="card-date">{new Date(a.applied_at).toLocaleDateString()}</span>
//                                 </div>
//
//                                 {expandedAppId === a.id && (
//                                     <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
//                                         {a.status === "approved" ? (
//                                             <ApprovedDetails a={a} en={en} />
//                                         ) : !hasAnyMessage ? (
//                                             <div style={{ fontSize: 12, color: "var(--slate)", fontStyle: "italic" }}>
//                                                 ⏳ {en ? "Your application is under review. No updates yet." : "Sinusuri ang iyong aplikasyon. Wala pang update."}
//                                             </div>
//                                         ) : (
//                                             <div>
//                                                 <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: "var(--navy)", marginBottom: 8 }}>
//                                                     🏛️ {en ? "Messages from Agency" : "Mga Mensahe mula sa Ahensya"}
//                                                 </div>
//                                                 {[...a.application_messages].sort((x, y) => new Date(y.created_at) - new Date(x.created_at)).map((msg, i) => (
//                                                     <div key={msg.id || i} style={{
//                                                         background: "var(--jade-bg)",
//                                                         border: "1px solid var(--jade)",
//                                                         borderRadius: "var(--r-sm)",
//                                                         padding: "10px 12px",
//                                                         marginBottom: 8,
//                                                         fontSize: 13,
//                                                         color: "var(--navy)",
//                                                         lineHeight: 1.6
//                                                     }}>
//                                                         <div style={{ fontSize: 10, color: "var(--jade)", fontWeight: 600, marginBottom: 4 }}>
//                                                             🏛️ {en ? "Agency" : "Ahensya"} · {new Date(msg.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
//                                                         </div>
//                                                         {msg.message}
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                         )}
//                                         {a.status === "rejected" && a.rejection_fields && (
//                                             <div style={{ marginTop: 8, background: "var(--brick-bg)", border: "1px solid var(--brick)", borderRadius: "var(--r-sm)", padding: "8px 10px", fontSize: 11, color: "var(--navy)" }}>
//                                                 ❌ {en ? `Rejected. Please correct: ${a.rejection_fields}` : `Tinanggihan. Pakitama: ${a.rejection_fields}`}
//                                             </div>
//                                         )}
//                                     </div>
//                                 )}
//
//                                 <div style={{ marginTop: 10 }}>
//                                     <button className="btn sm navy-o" onClick={() => onNav("helpcenter", a.id)}>
//                                         💬 {en ? "Need Help?" : "Kailangan ng Tulong?"}
//                                     </button>
//                                 </div>
//                             </div>
//                         </div>
//                     )
//                 })}
//             </div>
//         </div>
//     )
// }

// ─── SUBSIDIES ────────────────────────────────────────────────────────────────
function Subsidies({ en, onNav, apps, allAppointments, driverId, showToast, refreshApps, preselectedAppId, showTutorial, setShowTutorial }) {
    const [detailApp, setDetailApp] = useState(null)
    const [tutStep, setTutStep] = useState(0)

    // 1. Force-lock all scrollable containers
    useEffect(() => {
        if (showTutorial) document.body.classList.add('lock-scroll');
        else document.body.classList.remove('lock-scroll');
        return () => document.body.classList.remove('lock-scroll');
    }, [showTutorial]);

    // 2. Smooth auto-scroll to the highlighted step
    useEffect(() => {
        if (showTutorial) {
            const element = document.getElementById(`tut-step-${tutStep}`);
            if (element) {
                element.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
        }
    }, [tutStep, showTutorial]);

    // Reset tutorial step when it's closed
    useEffect(() => {
        if (!showTutorial) setTutStep(0)
    }, [showTutorial])

    // Fixed mock data just for the tutorial
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
                pointerEvents: "none", // Prevent clicks while in tutorial
                background: bgType === 'navy' ? "var(--navy)" : "#fff",
                borderRadius: "var(--r)",
                transition: "all 0.3s ease",
            }
        }
        return {transition: "all 0.3s ease"}
    }

    // Inline GuideBox Component
    function GuideBox({stepIndex}) {
        if (!showTutorial || tutStep !== stepIndex) return null
        return (
            <div style={{
                position: "relative", zIndex: 1000,
                background: "var(--navy)", borderRadius: "var(--r)", padding: "16px",
                margin: "10px 0 20px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                pointerEvents: "auto", // Allows clicking inside the box
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

    // Add this hook to open the specific application when navigated via a notification
    useEffect(() => {
        if (preselectedAppId && apps.length > 0) {
            const targetApp = apps.find(a => a.id === preselectedAppId)
            if (targetApp) {
                setDetailApp(targetApp)
                onNav("subsidies", null) // Clear the ID so the back button continues to work correctly
            }
        }
    }, [preselectedAppId, apps])

    useEffect(() => {
        const interval = setInterval(() => {
            refreshApps()
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    // Prevent tutorial from opening while viewing a specific subsidy detail
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

    // If tutorial is showing, display the mock data instead of real data
    const displayApps = showTutorial ? mockApps : apps;

    return (
        <div>
            {/* ── TUTORIAL BACKDROP (Spotlight Only) ── */}
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
                    const pillStatus = a.status === "approved" ? "approved"
                        : a.status === "rejected" ? "rejected"
                            : hasNewMessage ? "response_received"
                                : hasAnyMessage ? "has_response"
                                    : "under_review"

                    // Inject specific IDs only when tutorial is running
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
                                onClick={async () => {
                                    if (showTutorial) return; // Disable clicking real cards while tutorial is running
                                    setDetailApp(a)
                                    if (hasNewMessage) {
                                        await supabase.from("applications").update({driver_seen_latest: true}).eq("id", a.id)
                                        await refreshApps()
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

function Apply({
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
            <div style={{
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

// ─── APPOINTMENT ──────────────────────────────────────────────────────────────
    function Appointment({en, appointment}) {
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

// ─── NOTIFICATIONS (UPDATES ENGINE REAL-TIME COUPLING) ──────────────────────
    function Notifications({en, apps, appointment, driver, openEvents, onOpenModal}) {
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

    function ConcernThread({concerns, en}) {
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

    function HelpCenter({en, apps, driverId, showToast, onNav, preselectedAppId, showTutorial, setShowTutorial}) {
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

        // --- TUTORIAL LOGIC (covers the initial application-picker screen only) ---
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

        // Close the tutorial automatically once the driver picks an application and moves deeper into the flow
        useEffect(() => {
            if (selectedApp && showTutorial) setShowTutorial(false)
        }, [selectedApp])

        const tutSteps = [
            {
                en: "Welcome to the Help Center. Pick which subsidy application your question is about to get started.",
                fil: "Maligayang pagdating sa Help Center. Piliin kung aling aplikasyon ng subsidy ang tungkol sa iyong tanong para magsimula."
            },
            {
                en: "Already sent a concern before? Tap 'My Concerns' to see all your past questions and their replies in one place.",
                fil: "May naipadala ka na bang alalahanin dati? I-tap ang 'My Concerns' para makita ang lahat ng dati mong tanong at ang mga tugon dito."
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
            return {transition: "all 0.3s ease"}
        }

        // Renders the guide text + Skip/Next directly below whichever section is currently highlighted,
        // so it's always in the normal page flow and can never overlap or hide behind anything.
        function GuideBox({stepIndex}) {
            if (!showTutorial || tutStep !== stepIndex) return null
            return (
                <div style={{
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
                    <div className="ph">
                        <h1>{en ? "Help Center" : "Help Center"}</h1>
                        <p>{en ? "What do you need help with?" : "Saan ka kailangan ng tulong?"}</p>
                    </div>
                    <div className="pad">
                        <span className="link"
                              onClick={() => setSelectedApp(null)}>← {en ? "Choose a different application" : "Pumili ng ibang aplikasyon"}</span>
                        <div className="spacer"/>
                        <ContextHeader/>
                        <div className="spacer"/>
                        {categories.map(c => (
                            <div
                                key={c.key}
                                className="arow"
                                style={{
                                    cursor: "pointer",
                                    ...(c.key === "grievance" ? {
                                        borderLeft: "3px solid var(--brick)",
                                        background: "var(--brick-bg)"
                                    } : {})
                                }}
                                onClick={() => {
                                    if (c.key === "timing") {
                                        setCategory(c);
                                        setSubQuestion({key: "timing_answer", label: c.label});
                                        loadConcerns(selectedApp.id, c.label)
                                    } else {
                                        setCategory(c);
                                        if (c.key === "grievance") loadConcerns(selectedApp.id, c.label)
                                    }
                                }}
                            >
                                <div className="arow-name"
                                     style={{color: c.key === "grievance" ? "var(--brick)" : undefined}}>
                                    {c.key === "grievance" ? "⚑ " : ""}{c.label}
                                </div>
                                <div style={{color: "var(--slate)"}}>›</div>
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

function EditProfile({ en, driverId, driver, showToast, onDone, showTutorial, setShowTutorial }) {
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
            <div style={{ position: "relative", zIndex: 1000, background: "var(--navy)", borderRadius: "var(--r)", padding: "16px", margin: "10px 0 20px 0", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", pointerEvents: "auto", border: "1px solid rgba(255,255,255,0.1)" }}>
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

    function AdminReplyInline({grievance, en, showToast, onDone}) {
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

    function AdminGrievanceChat({grievance, en, showToast, onBack, onDone}) {
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

// ─── ADMIN PANEL (SPLIT-SCREEN VALIDATION MODULE ATTACHED) ───────────────────
function AdminPanel({ en, showToast }) {
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

    const rejectionOptions = ["Last Name", "First Name", "Middle Name", "Extension Name", "Sex", "Date of Birth", "Region", "Province", "City/Municipality", "Barangay", "Mobile Number", "Denomination", "Case Number", "Operator's Name", "Plate Number", "Chassis Number", "Driver's License No.", "E-wallet Type", "E-wallet Number"]

    // Calculate today's date formatted as YYYY-MM-DD for the date constraints
    const todayStr = new Date().toISOString().split("T")[0];

    useEffect(() => {
        loadAll()
        const interval = setInterval(() => {
            loadAll()
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    async function loadAll() {
        const [{ data: evts }, { data: apps }, { data: drivers }, { data: approved }, { data: unverified }, { data: griev }] = await Promise.all([
            supabase.from("payout_events").select("*").order("event_date", { ascending: false }),
            supabase.from("applications").select("*, drivers(full_name, license_number), payout_events(program_name, program_agency, venue, event_date, time_start, time_end), application_messages(id, message, created_at)").eq("status", "pending"),
            supabase.from("drivers").select("id"),
            supabase.from("applications").select("id").eq("status", "approved"),
            supabase.from("drivers").select("*").eq("verification_status", "unverified"),
            supabase.from("grievances").select("*, drivers(full_name, mobile), applications(payout_events(program_name, program_agency)), grievance_messages(id, message, sent_by, created_at)").eq("is_draft", false).order("created_at", { ascending: false }),
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
        setEventForm(p => ({ ...p, [field]: val }))
    }

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
        const { data } = await supabase
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
                        <div key={t.key} className={`atile ${section === t.key ? "active-tile" : ""}`}
                             onClick={() => setSection(t.key)}>
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
                                <input className="fi" value={eventForm.program_name}
                                       onChange={e => updateForm("program_name", e.target.value)} />
                            </div>
                            <div className="two-col">
                                <div className="fg"><label className="fl">Agency</label><input className="fi"
                                                                                               value={eventForm.program_agency}
                                                                                               onChange={e => updateForm("program_agency", e.target.value)} />
                                </div>
                                <div className="fg"><label className="fl">Amount</label><input className="fi"
                                                                                               value={eventForm.program_amount}
                                                                                               onChange={e => updateForm("program_amount", e.target.value.replace(/[^0-9.]/g, ''))} />
                                </div>
                            </div>
                            <div className="fg"><label className="fl">Venue *</label><input className="fi"
                                                                                            value={eventForm.venue}
                                                                                            onChange={e => updateForm("venue", e.target.value)} />
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Qualified Denominations" : "Kwalipikadong Denominasyon"}</label>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 4 }}>
                                    {["MPUJ", "TPUJ", "MUVE", "TUVE", "MPUB", "PUB", "Mini-Bus", "School Transport", "Taxi"].map(d => (
                                        <label key={d} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", color: "var(--navy)" }}>
                                            <input type="checkbox"
                                                   checked={eventForm.qualified_denominations.includes(d)}
                                                   onChange={e => {
                                                       setEventForm(p => ({
                                                           ...p,
                                                           qualified_denominations: e.target.checked ? [...p.qualified_denominations, d] : p.qualified_denominations.filter(x => x !== d)
                                                       }))
                                                   }} />
                                            {d}
                                        </label>
                                    ))}
                                </div>
                                <div className="fh">{en ? "Leave all unchecked to allow any denomination to apply." : "Iwanang walang tsek para payagan ang lahat ng denominasyon na mag-apply."}</div>
                            </div>
                            <div className="two-col">
                                <div className="fg"><label className="fl">{en ? "Payout Date *" : "Petsa ng Payout *"}</label><input
                                    className="fi" type="date" value={eventForm.event_date}
                                    min={todayStr}
                                    onChange={e => updateForm("event_date", e.target.value)} /></div>
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Application Deadline (Date and Time) *" : "Deadline ng Aplikasyon (Petsa at Oras) *"}</label>
                                <input className="fi" type="datetime-local" value={eventForm.application_deadline}
                                       onChange={e => updateForm("application_deadline", e.target.value)} />
                                <div className="fh">{en ? "Drivers can no longer apply for this subsidy after this date and time." : "Hindi na makakapag-apply ang mga driver pagkatapos ng petsa at oras na ito."}</div>
                            </div>
                            <div className="fg">
                                <label className="fl">{en ? "Description / Instructions for Drivers" : "Paglalarawan / Mga Tagubilin para sa mga Driver"}</label>
                                <textarea className="fta"
                                          placeholder={en ? "e.g. Bring original Driver's License and OR/CR. Wear proper attire." : "hal. Magdala ng orihinal na Driver's License at OR/CR. Magsuot ng tamang damit."}
                                          value={eventForm.description}
                                          onChange={e => updateForm("description", e.target.value)}
                                          style={{ minHeight: 80 }} />
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
                            <div className="empty">
                                <div>{en ? "No events yet." : "Wala pang event."}</div>
                            </div>
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
                                                ⚠️ {en ? "Deadline:" : "Deadline:"} {new Date(ev.application_deadline).toLocaleString("en-PH", {
                                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                                            })}
                                            </div>
                                        )}
                                        {ev.description && (
                                            <div className="arow-detail" style={{ fontStyle: "italic", color: "var(--slate)" }}>📋 {ev.description}</div>
                                        )}

                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 10, flexShrink: 0 }}>
                                        <button className="btn sm navy-o" onClick={() => downloadExcel(ev)}>⬇ {en ? "Export" : "I-export"}</button>
                                        <button className="btn sm outline" onClick={() => {
                                            setEditingEvent(ev);
                                            setEditForm({ ...ev })
                                        }}>✏️ {en ? "Edit" : "I-edit"}</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {editingEvent && (
                            <div className="modal-overlay" onClick={() => setEditingEvent(null)}>
                                <div className="modal-card" style={{ maxWidth: 500, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                                    <div className="modal-title">✏️ {en ? "Edit Event" : "I-edit ang Event"}</div>
                                    <form onSubmit={saveEdit}>
                                        <div className="fg"><label className="fl">{en ? "Program Name" : "Pangalan ng Program"}</label><input
                                            className="fi" value={editForm.program_name || ""}
                                            onChange={e => setEditForm(p => ({ ...p, program_name: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Agency" : "Ahensya"}</label><input className="fi"
                                                                                                                            value={editForm.program_agency || ""}
                                                                                                                            onChange={e => setEditForm(p => ({ ...p, program_agency: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Amount" : "Halaga"}</label><input
                                            className="fi" value={editForm.program_amount || ""}
                                            onChange={e => setEditForm(p => ({ ...p, program_amount: e.target.value.replace(/[^0-9.]/g, '') }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Venue" : "Venue"}</label><input className="fi"
                                                                                                                         value={editForm.venue || ""}
                                                                                                                         onChange={e => setEditForm(p => ({ ...p, venue: e.target.value }))} /></div>
                                        <div className="fg">
                                            <label className="fl">{en ? "Qualified Denominations" : "Kwalipikadong Denominasyon"}</label>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 4 }}>
                                                {["MPUJ", "TPUJ", "MUVE", "TUVE", "MPUB", "PUB", "Mini-Bus", "School Transport", "Taxi"].map(d => {
                                                    const selected = (editForm.qualified_denominations || "").split(",").map(s => s.trim()).filter(Boolean)
                                                    return (
                                                        <label key={d} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", color: "var(--navy)" }}>
                                                            <input type="checkbox" checked={selected.includes(d)}
                                                                   onChange={e => {
                                                                       const next = e.target.checked ? [...selected, d] : selected.filter(x => x !== d)
                                                                       setEditForm(p => ({ ...p, qualified_denominations: next.join(", ") }))
                                                                   }} />
                                                            {d}
                                                        </label>
                                                    )
                                                })}
                                            </div>
                                            <div className="fh">{en ? "Leave all unchecked to allow any denomination to apply." : "Iwanang walang tsek para payagan ang lahat ng denominasyon na mag-apply."}</div>
                                        </div>
                                        <div className="fg"><label className="fl">{en ? "Payout Date" : "Petsa ng Payout"}</label><input
                                            className="fi" type="date" value={editForm.event_date || ""}
                                            min={todayStr}
                                            onChange={e => setEditForm(p => ({ ...p, event_date: e.target.value }))} />
                                        </div>
                                        <div className="two-col">
                                            <div className="fg"><label className="fl">{en ? "Time Start" : "Oras ng Simula"}</label><input
                                                className="fi" type="time" value={editForm.time_start || ""}
                                                onChange={e => setEditForm(p => ({ ...p, time_start: e.target.value }))} /></div>
                                            <div className="fg"><label className="fl">{en ? "Time End" : "Oras ng Katapusan"}</label><input
                                                className="fi" type="time" value={editForm.time_end || ""}
                                                onChange={e => setEditForm(p => ({ ...p, time_end: e.target.value }))} /></div>
                                        </div>
                                        <div className="fg"><label className="fl">{en ? "Application Deadline" : "Deadline ng Aplikasyon"}</label><input
                                            className="fi" type="datetime-local"
                                            value={editForm.application_deadline ? editForm.application_deadline.slice(0, 16) : ""}
                                            onChange={e => setEditForm(p => ({ ...p, application_deadline: e.target.value }))} /></div>
                                        <div className="fg"><label className="fl">{en ? "Description / Instructions" : "Paglalarawan / Mga Tagubilin"}</label><textarea
                                            className="fta" value={editForm.description || ""}
                                            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                                            style={{ minHeight: 80 }} /></div>
                                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                            <button className="btn gold" type="submit" disabled={savingEdit}>{savingEdit ? "..." : (en ? "Save Changes" : "I-save ang mga Pagbabago")}</button>
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
                        <div className="asec-title">📋 {en ? "Pending Applications" : "Mga Nakabinbing Aplikasyon"}</div>
                        {pendingApps.length === 0 ? (
                            <div className="empty">
                                <div>{en ? "No pending applications." : "Walang nakabinbing aplikasyon."}</div>
                            </div>
                        ) : pendingApps.map(a => (
                            <div key={a.id} style={{ paddingBottom: 12, borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
                                <div className="arow" style={{ cursor: "default", border: "none", padding: 0 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="arow-name">{a.drivers?.full_name}</div>
                                        <div className="arow-detail">{a.drivers?.license_number}</div>
                                        <div className="arow-detail">{a.payout_events?.program_name} · {a.payout_events?.venue}</div>
                                        <div className="arow-detail">{new Date(a.applied_at).toLocaleDateString()}</div>
                                        {a.admin_message && (
                                            <div style={{ fontSize: 11, color: "var(--jade)", marginTop: 4 }}>
                                                ✓ {en ? "Reply sent" : "Naipadala ang tugon"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="btn-row" style={{ flexDirection: "column", gap: 4 }}>
                                        <button className="btn sm jade" onClick={() => setReplyingId(`approve_${a.id}`)}>✓ {en ? "Approve" : "Aprubahan"}</button>
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
                                    <div style={{ background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: 12, marginTop: 8 }}>
                                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--jade)" }}>
                                            ✉️ {en ? "Send a message to the driver:" : "Magpadala ng mensahe sa driver:"}
                                        </div>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                            <button className="btn sm outline" onClick={() => setReplyMessage(`Your application for ${a.payout_events?.program_name} has been received and is now under review. Please expect a result within 3–5 business days.`)}>
                                                📋 {en ? "Under Review" : "Under Review"}
                                            </button>
                                            <button className="btn sm outline" onClick={() => setReplyMessage(`Your application for ${a.payout_events?.program_name} requires additional information before it can be processed. Please update your details and resubmit.`)}>
                                                ⚠️ {en ? "Needs Correction" : "Needs Correction"}
                                            </button>
                                        </div>
                                        <textarea
                                            className="fta"
                                            style={{ minHeight: 80, fontSize: 12, marginBottom: 8 }}
                                            placeholder={en ? "Type your message to the driver..." : "I-type ang mensahe para sa driver..."}
                                            value={replyMessage}
                                            onChange={e => setReplyMessage(e.target.value)}
                                        />
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn sm jade" onClick={() => sendReply(a)} disabled={sendingReply}>
                                                {sendingReply ? "..." : (en ? "Send Reply" : "Ipadala")}
                                            </button>
                                            <button className="btn sm outline" onClick={() => { setReplyingId(null); setReplyMessage("") }}>
                                                {en ? "Cancel" : "Kanselahin"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Approval message panel */}
                                {replyingId === `approve_${a.id}` && (
                                    <div style={{ background: "var(--jade-bg)", border: "1px solid var(--jade)", borderRadius: "var(--r-sm)", padding: 12, marginTop: 8 }}>
                                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--jade)" }}>
                                            ✅ {en ? "Approval message for driver:" : "Mensahe ng pag-apruba para sa driver:"}
                                        </div>
                                        <textarea
                                            className="fta"
                                            style={{ minHeight: 80, fontSize: 12, marginBottom: 8 }}
                                            value={approvalMessages[a.id] !== undefined ? approvalMessages[a.id] : `Your application for ${a.payout_events?.program_name} has been approved. Please proceed to ${a.payout_events?.venue} on ${a.payout_events?.event_date} between ${a.payout_events?.time_start} and ${a.payout_events?.time_end}. Bring your Driver's License and reference code.`}
                                            onChange={e => setApprovalMessages(p => ({ ...p, [a.id]: e.target.value }))}
                                        />
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn sm jade" onClick={() => { approveApp(a); setReplyingId(null) }}>
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
                                    <div style={{ marginTop: 8, background: "var(--brick-bg)", border: "1px solid var(--brick)", borderRadius: "var(--r-sm)", padding: 12 }}>
                                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--brick)" }}>
                                            {en ? "Select incorrect fields:" : "Piliin ang mga maling field:"}
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                                            {rejectionOptions.map(opt => (
                                                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", color: "var(--navy)" }}>
                                                    <input type="checkbox" checked={rejectFields.includes(opt)} onChange={e => {
                                                        setRejectFields(prev => e.target.checked ? [...prev, opt] : prev.filter(f => f !== opt))
                                                    }} />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", color: "var(--navy)", fontWeight: 700, marginBottom: 10, borderTop: "1px solid var(--brick)", paddingTop: 8 }}>
                                            <input type="checkbox" checked={rejectOther} onChange={e => setRejectOther(e.target.checked)} />
                                            {en ? "Other (e.g. does not meet eligibility criteria — explain in notes)" : "Iba pa (hal. hindi kwalipikado — ipaliwanag sa notes)"}
                                        </label>
                                        {rejectOther && (
                                            <div style={{ fontSize: 11, color: "var(--brick)", marginBottom: 8, fontStyle: "italic" }}>
                                                ⚠️ {en ? "Checking \"Other\" means the driver will NOT be allowed to reapply for this subsidy." : "Ang pag-check ng \"Other\" ay nangangahulugang HINDI na papayagang mag-reapply ang driver para sa subsidy na ito."}
                                            </div>
                                        )}
                                        <div className="fg" style={{ marginBottom: 8 }}>
                                            <label className="fl" style={{ fontSize: 11 }}>{en ? "Additional notes for driver (optional)" : "Karagdagang tala para sa driver (opsyonal)"}</label>
                                            <textarea className="fta" style={{ minHeight: 60, fontSize: 12 }} placeholder={en ? "Add specific notes..." : "Magdagdag ng tala..."} value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} />
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn sm brick-o" onClick={() => confirmReject(a)}>{en ? "Confirm Reject" : "Kumpirmahin"}</button>
                                            <button className="btn sm outline" onClick={() => { setRejectingId(null); setRejectFields([]); setRejectOther(false); setRejectNotes("") }}>{en ? "Cancel" : "Kanselahin"}</button>
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
                                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📋 Declared Registration Metadata</div>
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

                                        <div style={{ marginTop: 12, padding: 10, background: "rgba(0,0,0,0.02)", borderRadius: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4, color: "var(--brick)" }}>Flag Discrepancy Reasons</div>
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                                                {rejectionOptions.map(opt => (
                                                    <label key={opt} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <input type="checkbox" checked={verifyRejectFields.includes(opt)} onChange={e => setVerifyRejectFields(p => e.target.checked ? [...p, opt] : p.filter(x => x !== opt))} />
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="fg" style={{ marginBottom: 8, marginTop: 8 }}>
                                                <label className="fl" style={{ fontSize: 11 }}>{en ? "Notes for driver (optional)" : "Tala para sa driver (opsyonal)"}</label>
                                                <textarea className="fta" style={{ minHeight: 60, fontSize: 12 }} placeholder={en ? "Add any notes visible to the driver..." : "Magdagdag ng tala na makikita ng driver..."} value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)} />
                                            </div>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                <button className="btn sm jade" style={{ flex: 1 }} onClick={() => verifyDriver(selectedDriver.id, verifyNotes)}>✓ {en ? "Verify" : "I-verify"}</button>
                                                <button className="btn sm brick-o" style={{ flex: 1 }} onClick={() => rejectDriver(selectedDriver)}>✕ {en ? "Reject" : "Itanggi"}</button>
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
                    const openGrievance = openGrievanceId ? grievances.find(g => g.id === openGrievanceId) : null
                    if (openGrievance) {
                        return (
                            <AdminGrievanceChat
                                grievance={openGrievance}
                                en={en}
                                showToast={showToast}
                                onBack={() => setOpenGrievanceId(null)}
                                onDone={loadAll}
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
                        <div key={g.id} className="arow" style={{ cursor: "pointer", alignItems: "flex-start" }} onClick={() => setOpenGrievanceId(g.id)}>
                            <div style={{ flex: 1 }}>
                                <div className="arow-name">{g.drivers?.full_name} · {g.drivers?.mobile}</div>
                                <div className="arow-detail">{g.concern_type}</div>
                                <div className="arow-detail" style={{ marginTop: 4, color: "var(--navy)" }}>{g.message}</div>
                                <div className="arow-detail">{new Date(g.created_at).toLocaleString()}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                                {(g.grievance_messages || []).some(m => m.sent_by === "admin") && (
                                    <span style={{ fontSize: 10, color: "var(--jade)" }}>✓ {en ? "Replied" : "Nasagot"}</span>
                                )}
                                {g.status === "resolved" && <span className="pill approved">{en ? "Resolved" : "Nalutas"}</span>}
                                <span style={{ fontSize: 11, color: "var(--slate)" }}>{en ? "View & Reply" : "Tingnan"} ›</span>
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
                                        <div key={name} style={{ marginBottom: 14 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6 }}>{name}</div>
                                            {grouped[name].map(renderRow)}
                                        </div>
                                    ))}
                                    {general.length > 0 && (
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 6 }}>{en ? "General Inquiries" : "Pangkalahatang Tanong"}</div>
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

// ─── ROOT CONTAINER ENGINE ───────────────────────────────────────────────────
    export default function App() {
        const [lang, setLang] = useState("fil")
        const [page, setPage] = useState(sessionStorage.getItem("uplift_page") || "signin")
        const [showTutorial, setShowTutorial] = useState(false)
        const [helpAppId, setHelpAppId] = useState(null)
        const [loggedIn, setLoggedIn] = useState(!!sessionStorage.getItem("uplift_session"))
        const [restoringSession, setRestoringSession] = useState(!!sessionStorage.getItem("uplift_session"))
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
                if (page === "admin") return <AdminPanel en={en} showToast={showToast}/>
                return <SignIn en={en} onNav={navigate} onLogin={handleLogin} showTutorial={showTutorial}
                               setShowTutorial={setShowTutorial}/>
            }
            if (page === "admin") return <AdminPanel en={en} showToast={showToast}/>
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
                    {/* ADD THE FLOATING BUTTON HERE */}
                    {loggedIn && (
                        <button className="admin-float-btn" onClick={() => navigate("admin")}>
                            <span>⚙️</span> {en ? "Admin" : "Admin"}
                        </button>
                    )}

                    <div className="topbar">
                        <div className="logo" onClick={() => setPage(loggedIn ? "dashboard" : "signin")}>UPLIFT <span>EO 110</span>
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
