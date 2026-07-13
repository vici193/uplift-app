

export const SECURITY_QUESTIONS = [
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

export function securityQuestionLabel(key, en) {
    if (!key) return ""
    const normalized = String(key).trim().toLowerCase()
    const found = SECURITY_QUESTIONS.find(q => q.key.toLowerCase() === normalized)
    if (found) return en ? found.en : found.fil
    return key
}

export function toProperCase(str) {
    if (!str) return str
    return str.trim().toLowerCase().replace(/\b\p{L}/gu, ch => ch.toUpperCase())
}

export function toProperCaseKeepAcronyms(str) {
    if (!str) return str
    return str.trim().split(/(\s+)/).map(word => {
        if (/^\s+$/.test(word)) return word
        const letters = word.replace(/[^A-Za-z]/g, "")
        const isAcronym = letters.length >= 2 && letters.length <= 6 && word === word.toUpperCase() && /[A-Z]/.test(word)
        if (isAcronym) return word
        return word.toLowerCase().replace(/\b\p{L}/gu, ch => ch.toUpperCase())
    }).join("")
}

export function formatMobileDisplay(v) {
    const clean = (v || "").replace(/[^0-9]/g, "").slice(0, 11)
    const p1 = clean.slice(0, 4), p2 = clean.slice(4, 7), p3 = clean.slice(7, 11)
    return [p1, p2, p3].filter(Boolean).join(" ")
}

export function cleanMobile(v) { return (v || "").replace(/[^0-9]/g, "") }

export function formatPlateNumber(v) {
    const clean = (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "")
    const letters = clean.replace(/[0-9]/g, "").slice(0, 3)
    const numbers = clean.replace(/[A-Z]/g, "").slice(0, 4)
    return numbers ? `${letters} ${numbers}` : letters
}

export function formatLicenseNumber(v) {
    const clean = (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11)
    const seg1 = clean.slice(0, 3), seg2 = clean.slice(3, 5), seg3 = clean.slice(5, 11)
    return [seg1, seg2, seg3].filter(Boolean).join("-")
}

export function formatCaseNumber(v) {
    const clean = (v || "").replace(/[^0-9]/g, "").slice(0, 8)
    const seg1 = clean.slice(0, 4), seg2 = clean.slice(4, 8)
    return [seg1, seg2].filter(Boolean).join("-")
}

export const DENOMINATION_DL_CODE_HINT = {
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

export function dlCodeHint(denomination, en) {
    const found = DENOMINATION_DL_CODE_HINT[denomination]
    if (!found) return en ? "Format: C01-XX-XXXXXX" : "Format: C01-XX-XXXXXX"
    return en ? found.en : found.fil
}

export const DENOMINATION_DL_CODE_SHORT = {
    "MPUJ": "B1", "TPUJ": "B1", "MUVE": "B1", "TUVE": "B1",
    "MPUB": "D", "PUB": "D",
    "Mini-Bus": "B1 or D", "School Transport": "B1 or D",
    "Taxi": "B or B1",
}

export function licenseNumberPlaceholder(denomination) {
    const code = DENOMINATION_DL_CODE_SHORT[denomination]
    const letter = code ? code[0] : "C"
    return `${letter}01-XX-XXXXXX`
}

export const PH_REGIONS = [
    "NCR", "CAR", "Region I – Ilocos Region", "Region II – Cagayan Valley", "Region III – Central Luzon", "Region IV-A – CALABARZON", "MIMAROPA", "Region V – Bicol Region", "Region VI – Western Visayas", "Region VII – Central Visayas", "Region VIII – Eastern Visayas", "Region IX – Zamboanga Peninsula", "Region X – Northern Mindanao", "Region XI – Davao Region", "Region XII – SOCCSKSARGEN", "Region XIII – Caraga", "BARMM",
]

export const PH_PROVINCES_BY_REGION = {
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

export const PH_CITIES_BY_PROVINCE = {
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

export const css = `
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
  overflow-x: hidden;
  overflow-y: auto;
  touch-action: pan-y;
}

/* Pin every tutorial guide box to the bottom of the screen — always visible
   regardless of scroll position or how long the highlighted content is */
.guide-box {
  position: fixed !important;
  left: 50% !important;
  bottom: 16px !important;
  top: auto !important;
  transform: translateX(-50%) !important;
  width: calc(100% - 32px) !important;
  max-width: 440px !important;
  margin: 0 !important;
  z-index: 1001 !important;
  max-height: 40vh;
  overflow-y: auto;
}
@media (max-width: 480px) {
  .guide-box {
    padding: 10px !important;
    bottom: 10px !important;
  }
  .guide-box > div:first-child {
    font-size: 10px !important;
    margin-bottom: 4px !important;
  }
  .guide-box > div:nth-child(2) {
    font-size: 11.5px !important;
    line-height: 1.4 !important;
    margin-bottom: 8px !important;
  }
  .guide-box .btn.sm {
    padding: 5px 10px !important;
    font-size: 10.5px !important;
  }
}
`
