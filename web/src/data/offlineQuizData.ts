export interface QuizOption {
  id: string;
  label: { mr: string; hi: string; en: string };
  icon: string;
  category: "solar_electric" | "agri_dairy" | "healthcare" | "digital" | "mechanical";
}

export interface QuizQuestion {
  id: number;
  title: { mr: string; hi: string; en: string };
  subtitle: { mr: string; hi: string; en: string };
  options: QuizOption[];
}

export const OFFLINE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    title: {
      mr: "तुम्हाला काय बनवायला किंवा दुरुस्त करायला आवडेल?",
      hi: "आपको क्या बनाना या ठीक करना पसंद है?",
      en: "What do you like building or fixing?"
    },
    subtitle: {
      mr: "तुमची आवडती वस्तू निवडा",
      hi: "अपनी पसंदीदा वस्तु चुनें",
      en: "Select your favorite activity"
    },
    options: [
      { id: "opt_1_solar", label: { mr: "सोलर पॅनेल व पंप", hi: "सोलर पैनल व पंप", en: "Solar Panels & Pumps" }, icon: "Sun", category: "solar_electric" },
      { id: "opt_1_farm", label: { mr: "झाडे व शेती अवजारे", hi: "पेड़ व कृषि उपकरण", en: "Farming & Plants" }, icon: "Sprout", category: "agri_dairy" },
      { id: "opt_1_bike", label: { mr: "मोटारसायकल व इंजिन", hi: "मोटरसाइकिल व इंजन", en: "Bikes & Engines" }, icon: "Wrench", category: "mechanical" },
      { id: "opt_1_comp", label: { mr: "संगणक व मोबाईल", hi: "कंप्यूटर व मोबाइल", en: "Computers & Mobile" }, icon: "Laptop", category: "digital" }
    ]
  },
  {
    id: 2,
    title: {
      mr: "तुम्हाला कोणत्या जागेवर काम करायला आवडेल?",
      hi: "आपको किस जगह पर काम करना पसंद है?",
      en: "Where would you prefer to work?"
    },
    subtitle: {
      mr: "कामाचे वातावरण निवडा",
      hi: "कार्यस्थल का माहौल चुनें",
      en: "Select work environment"
    },
    options: [
      { id: "opt_2_outdoor", label: { mr: "मोकळे शेत व निसर्ग", hi: "खुले खेत व प्रकृति", en: "Open Fields & Nature" }, icon: "Tractor", category: "agri_dairy" },
      { id: "opt_2_workshop", label: { mr: "वर्कशॉप व गॅरेज", hi: "वर्कशॉप व गैरेज", en: "Workshop & Garage" }, icon: "Hammer", category: "mechanical" },
      { id: "opt_2_clinic", label: { mr: "दवाखाना / आरोग्य केंद्र", hi: "अस्पताल / स्वास्थ्य केंद्र", en: "Clinic / Health Center" }, icon: "HeartPulse", category: "healthcare" },
      { id: "opt_2_site", label: { mr: "सोलर प्लांट व साईट", hi: "सोलर प्लांट व साइट", en: "Solar Plants & Sites" }, icon: "Zap", category: "solar_electric" }
    ]
  },
  {
    id: 3,
    title: {
      mr: "कोणते साधन तुमच्या हातात आवडेल?",
      hi: "कौन सा औजार आपके हाथ में अच्छा लगेगा?",
      en: "Which tool would you pick?"
    },
    subtitle: {
      mr: "तुमचे आवडते साधन",
      hi: "अपना पसंदीदा औजार चुनें",
      en: "Pick your preferred tool"
    },
    options: [
      { id: "opt_3_meter", label: { mr: "टेस्टर व मल्टीमीटर", hi: "टेस्टर व मल्टीमीटर", en: "Multimeter & Tester" }, icon: "Activity", category: "solar_electric" },
      { id: "opt_3_aid", label: { mr: "प्रथमोपचार किट", hi: "प्राथमिक उपचार किट", en: "First-Aid Kit" }, icon: "ShieldAlert", category: "healthcare" },
      { id: "opt_3_spanner", label: { mr: "पाना व रेंच", hi: "पाना व रिंच", en: "Spanner & Wrenches" }, icon: "Tool", category: "mechanical" },
      { id: "opt_3_screen", label: { mr: "मोबाईल / टॅब्लेट", hi: "मोबाइल / टैबलेट", en: "Mobile / Tablet" }, icon: "Smartphone", category: "digital" }
    ]
  },
  {
    id: 4,
    title: {
      mr: "कोणती गोष्ट तुम्हाला सर्वात जास्त समाधान देते?",
      hi: "किस काम से आपको सबसे ज़्यादा खुशी मिलती है?",
      en: "What brings you the greatest satisfaction?"
    },
    subtitle: {
      mr: "तुमचा उद्देश",
      hi: "अपनी प्रेरणा चुनें",
      en: "Choose your inspiration"
    },
    options: [
      { id: "opt_4_heal", label: { mr: "आजारी व्यक्तीला मदत करणे", hi: "मरीज़ की मदद करना", en: "Helping Sick People" }, icon: "Heart", category: "healthcare" },
      { id: "opt_4_power", label: { mr: "गावात वीज/पाणी पोहोचवणे", hi: "गाँव में बिजली/पानी पहुँचाना", en: "Powering Village Pumps" }, icon: "Lightbulb", category: "solar_electric" },
      { id: "opt_4_grow", label: { mr: "चांगले पीक व दूध उत्पादन", hi: "अच्छी फसल व दूध उत्पादन", en: "Healthy Crops & Milk" }, icon: "Leaf", category: "agri_dairy" },
      { id: "opt_4_code", label: { mr: "ऑनलाइन कामे पूर्ण करणे", hi: "ऑनलाइन कार्य निपटाना", en: "Digital Services" }, icon: "CheckCircle", category: "digital" }
    ]
  },
  {
    id: 5,
    title: {
      mr: "तुमचा सध्याचा वर्ग कोणता आहे?",
      hi: "आपकी वर्तमान कक्षा कौन सी है?",
      en: "What is your current grade/class?"
    },
    subtitle: {
      mr: "शिक्षणाचा टप्पा निवडा",
      hi: "शिक्षा का स्तर चुनें",
      en: "Select education level"
    },
    options: [
      { id: "opt_5_9", label: { mr: "९ वी", hi: "9वीं", en: "Std 9" }, icon: "Book", category: "solar_electric" },
      { id: "opt_5_10", label: { mr: "१० वी", hi: "10वीं", en: "Std 10" }, icon: "GraduationCap", category: "solar_electric" },
      { id: "opt_5_12", label: { mr: "११ वी / १२ वी", hi: "11वीं / 12वीं", en: "Std 11 / 12" }, icon: "Award", category: "solar_electric" },
      { id: "opt_5_iti", label: { mr: "आयटीआय / पदवी", hi: "आईटीआई / कॉलेज", en: "ITI / Degree" }, icon: "Briefcase", category: "mechanical" }
    ]
  },
  {
    id: 6,
    title: {
      mr: "तुमचा जिल्हा कोणता आहे?",
      hi: "आपका ज़िला कौन सा है?",
      en: "Which is your district?"
    },
    subtitle: {
      mr: "स्थानिक संधींसाठी",
      hi: "स्थानीय अवसरों के लिए",
      en: "For regional matching"
    },
    options: [
      { id: "opt_6_satara", label: { mr: "सातारा", hi: "सातारा", en: "Satara" }, icon: "MapPin", category: "solar_electric" },
      { id: "opt_6_pune", label: { mr: "पुणे", hi: "पुणे", en: "Pune" }, icon: "MapPin", category: "digital" },
      { id: "opt_6_nashik", label: { mr: "नाशिक", hi: "नासिक", en: "Nashik" }, icon: "MapPin", category: "agri_dairy" },
      { id: "opt_6_other", label: { mr: "इतर जिल्हा", hi: "अन्य ज़िला", en: "Other District" }, icon: "Compass", category: "mechanical" }
    ]
  },
  {
    id: 7,
    title: {
      mr: "कुटुंबाचा मुख्य व्यवसाय कोणता आहे?",
      hi: "परिवार का मुख्य व्यवसाय क्या है?",
      en: "What is your family's main occupation?"
    },
    subtitle: {
      mr: "पार्श्वभूमी",
      hi: "पृष्ठभूमि",
      en: "Context"
    },
    options: [
      { id: "opt_7_farm", label: { mr: "शेती व पशुपालन", hi: "खेती व डेयरी", en: "Farming & Dairy" }, icon: "Sprout", category: "agri_dairy" },
      { id: "opt_7_craft", label: { mr: "कारागिरी व मजुरी", hi: "कारीगरी व मजदूरी", en: "Crafts & Labor" }, icon: "Wrench", category: "mechanical" },
      { id: "opt_7_shop", label: { mr: "लहान दुकान / व्यवसाय", hi: "छोटी दुकान / व्यापार", en: "Small Shop / Trade" }, icon: "ShoppingBag", category: "digital" },
      { id: "opt_7_job", label: { mr: "शासकीय / खाजगी नोकरी", hi: "सरकारी / प्राइवेट नौकरी", en: "Government / Private Job" }, icon: "Building", category: "solar_electric" }
    ]
  },
  {
    id: 8,
    title: {
      mr: "तुम्ही शिक्षणासाठी किती लांब जाऊ शकता?",
      hi: "आप पढ़ाई के लिए कितनी दूर जा सकते हैं?",
      en: "How far can you travel for training?"
    },
    subtitle: {
      mr: "प्रवासाची तयारी",
      hi: "यात्रा की सुविधा",
      en: "Mobility preference"
    },
    options: [
      { id: "opt_8_local", label: { mr: "गावातच किंवा जवळ", hi: "गाँव में या पास", en: "Local Village / Nearby" }, icon: "Home", category: "agri_dairy" },
      { id: "opt_8_taluka", label: { mr: "तालुका / जिल्हा शहर", hi: "तहसील / ज़िला शहर", en: "Taluka / District Town" }, icon: "Compass", category: "solar_electric" },
      { id: "opt_8_city", label: { mr: "मोठ्या शहरात हॉस्टेलवर", hi: "बड़े शहर में हॉस्टल में", en: "Major City with Hostel" }, icon: "Navigation", category: "mechanical" },
      { id: "opt_8_online", label: { mr: "घरी बसून ऑनलाईन", hi: "घर बैठे ऑनलाइन", en: "Online from Home" }, icon: "Wifi", category: "digital" }
    ]
  }
];

export function buildProfileFromQuizAnswers(answers: Record<number, QuizOption>, lang: "mr" | "hi" | "en") {
  const counts: Record<string, number> = {
    solar_electric: 0,
    agri_dairy: 0,
    healthcare: 0,
    digital: 0,
    mechanical: 0
  };

  Object.values(answers).forEach((opt) => {
    if (counts[opt.category] !== undefined) {
      counts[opt.category] += 1;
    }
  });

  // Find top category
  let topCat = "solar_electric";
  let maxCount = -1;
  for (const [cat, cnt] of Object.entries(counts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      topCat = cat;
    }
  }

  // Profile presets based on dominant category
  const presets: Record<string, any> = {
    solar_electric: {
      interests: ["सोलर पंप व ऊर्जा", "विद्युत उपकरण दुरुस्ती"],
      skills: ["सोलर पॅनेल इन्स्टॉलेशन", "वायरिंग व मल्टीमीटर चाचणी"],
      aspirations: ["प्रमाणित सोलर पंप तंत्रज्ञ", "विद्युत सहाय्यक"],
      is_vocational: true
    },
    agri_dairy: {
      interests: ["आधुनिक शेती व सिंचन", "दुग्ध व्यवसाय व प्रक्रिया"],
      skills: ["सेंद्रिय शेती व्यवस्थापन", "डेयरी उपकरण हाताळणी"],
      aspirations: ["कृषी उद्योजक", "डेयरी फार्म मॅनेजर"],
      is_vocational: true
    },
    healthcare: {
      interests: ["आरोग्य सेवा व औषधोपचार", "रुग्ण सहाय्य"],
      skills: ["प्राथमिक उपचार व तपासणी", "आरोग्य केंद्र सहाय्यक"],
      aspirations: ["आरोग्य सेवक (ASHA/ANM)", "पॅरामेडिकल तंत्रज्ञ"],
      is_vocational: true
    },
    mechanical: {
      interests: ["वाहने व यंत्र दुरुस्ती", "औद्योगिक मेकॅनिक"],
      skills: ["इंजिन दुरुस्ती व सर्विसिंग", "वर्कशॉप टूल्स हाताळणी"],
      aspirations: ["रेल्वे / एसटी महामंडळ शिकाऊ उमेदवार", "ऑटोमोबाईल मेकॅनिक"],
      is_vocational: true
    },
    digital: {
      interests: ["संगणक व ऑनलाईन सेवा", "डिजिटल बँकिंग"],
      skills: ["डेटा ऑपरेटर", "ऑनलाइन पोर्टल कामकाज"],
      aspirations: ["आपले सरकार केंद्र चालक", "बँक मित्र (BC)"],
      is_vocational: true
    }
  };

  const selectedPreset = presets[topCat] || presets.solar_electric;

  // Grade detection from Q5
  let grade = 10;
  if (answers[5]?.id === "opt_5_9") grade = 9;
  if (answers[5]?.id === "opt_5_12") grade = 12;
  if (answers[5]?.id === "opt_5_iti") grade = 14;

  // District from Q6
  let district = "Satara";
  if (answers[6]?.id === "opt_6_pune") district = "Pune";
  if (answers[6]?.id === "opt_6_nashik") district = "Nashik";

  // Mobility from Q8
  let mobility = "DISTRICT";
  if (answers[8]?.id === "opt_8_local") mobility = "LOCAL";
  if (answers[8]?.id === "opt_8_city") mobility = "STATE_WIDE";

  return {
    grade_level: grade,
    state: "Maharashtra",
    district,
    primary_interests: selectedPreset.interests,
    practical_skills: selectedPreset.skills,
    career_aspirations: selectedPreset.aspirations,
    is_vocational_recommended: selectedPreset.is_vocational,
    mobility_preference: mobility,
    family_livelihood_context: answers[7]?.label[lang] || "Agriculture & Crafts"
  };
}
