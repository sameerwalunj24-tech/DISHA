// Default grounded career pathway templates for Disha PWA offline mode
// Every resource_url is strictly either from opportunities.csv or null with needs_verification: true.

export interface MultiLingualText {
  mr: string;
  hi: string;
  en: string;
}

export interface PathwayStep {
  id: string;
  day: number;
  estimated_minutes: number;
  icon: string;
  title: MultiLingualText;
  description: MultiLingualText;
  practical_action?: MultiLingualText;
  resource_url: string | null;
  needs_verification: boolean;
}

export interface PathwayWeek {
  week_number: number;
  title: MultiLingualText;
  steps: PathwayStep[];
}

export interface PathwayMilestone {
  id: string;
  title: MultiLingualText;
  description: MultiLingualText;
  practical_action?: MultiLingualText;
  deadline?: string | null;
  resource_url: string | null;
  needs_verification: boolean;
  is_opportunity_milestone?: boolean;
  icon?: string;
}

export interface PathwayStageNext30Days {
  title: MultiLingualText;
  weeks: PathwayWeek[];
}

export interface PathwayStageMilestones {
  title: MultiLingualText;
  milestones: PathwayMilestone[];
}

export interface PathwayData {
  id: string;
  career_cluster: string;
  title: MultiLingualText;
  description: MultiLingualText;
  stages: {
    next_30_days: PathwayStageNext30Days;
    months_3_to_6: PathwayStageMilestones;
    years_1_to_2: PathwayStageMilestones;
  };
  vocational_alternative?: {
    id: string;
    title: MultiLingualText;
    description: MultiLingualText;
    resource_url: string | null;
    needs_verification: boolean;
  };
}

export const DEFAULT_OFFLINE_PATHWAYS: Record<string, PathwayData> = {
  electrical_solar: {
    id: "electrical_solar",
    career_cluster: "electrical_solar",
    title: {
      mr: "सौर ऊर्जा व ग्रामीण विद्युत तंत्रज्ञ (Solar & Electrical Technician)",
      hi: "सौर ऊर्जा और ग्रामीण विद्युत तकनीशियन (Solar & Electrical Technician)",
      en: "Solar Energy & Rural Electrical Technician"
    },
    description: {
      mr: "सौर पॅनेल बसवणे, घरगुती वायरिंग आणि इलेक्ट्रिक मोटर दुरुस्तीचे प्रत्यक्ष कौशल्य.",
      hi: "सोलर पैनल इंस्टॉलेशन, घरेलू वायरिंग और विद्युत मोटर मरम्मत का व्यावहारिक कौशल।",
      en: "Hands-on skills in solar panel installation, domestic wiring, and electric motor maintenance."
    },
    stages: {
      next_30_days: {
        title: {
          mr: "पुढील ३० दिवस (दररोज १५ मिनिटे सराव)",
          hi: "अगले ३० दिन (प्रतिदिन १५ मिनट अभ्यास)",
          en: "Next 30 Days (~15 mins daily practical steps)"
        },
        weeks: [
          {
            week_number: 1,
            title: {
              mr: "आठवडा १ - विद्युत सुरक्षा आणि मूलभूत साधने",
              hi: "सप्ताह १ - विद्युत सुरक्षा और बुनियादी उपकरण",
              en: "Week 1 - Electrical Safety & Basic Tools"
            },
            steps: [
              {
                id: "es_w1_s1",
                day: 1,
                estimated_minutes: 15,
                icon: "Shield",
                title: { mr: "सुरक्षा नियम व खबरदारी", hi: "सुरक्षा नियम और सावधानियां", en: "Safety Rules & Precautions" },
                description: { mr: "विजेचे काम करताना रबरी चप्पल वापरणे आणि मेन स्विच बंद ठेवणे समजून घ्या.", hi: "बिजली का काम करते समय रबर की चप्पल और मुख्य स्विच बंद करने के नियम समझें।", en: "Understand safety essentials like rubber-soled footwear and turning off main switches." },
                practical_action: { mr: "घरातील मेन स्विच आणि फ्यूज बोर्ड कुठे आहे ते तपासा.", hi: "घर का मुख्य स्विच और फ्यूज बोर्ड कहाँ है, देखें।", en: "Locate the main switchboard and fuse box in your home." },
                resource_url: null,
                needs_verification: true
              },
              {
                id: "es_w1_s2",
                day: 3,
                estimated_minutes: 15,
                icon: "Wrench",
                title: { mr: "टेस्टर आणि स्क्रू ड्रायव्हरचा योग्य वापर", hi: "टेस्टर और स्क्रू ड्राइवर का सही उपयोग", en: "Using Line Testers & Screwdrivers" },
                description: { mr: "फेज टेस्टरमधील निऑन दिवा कसा जळतो आणि विद्युत प्रवाह कसा ओळखायचा ते जाणून घ्या.", hi: "फेज टेस्टर की नीयन बत्ती कैसे जलती है और बिजली का प्रवाह कैसे जांचें, जानें।", en: "Learn how a neon phase tester detects live voltage safely." },
                practical_action: { mr: "मोठ्यांच्या उपस्थितीत टेस्टरने सॉकेटचा लाईव्ह पिन तपासा.", hi: "बड़ों की मौजूदगी में टेस्टर से सॉकेट का लाइव पिन जांचें।", en: "Check a dead and live wall socket using a tester under elder supervision." },
                resource_url: null,
                needs_verification: true
              },
              {
                id: "es_w1_s3",
                day: 5,
                estimated_minutes: 15,
                icon: "Zap",
                title: { mr: "वायरचे प्रकार आणि इन्सुलेशन", hi: "तारों के प्रकार और इन्सुलेशन", en: "Wire Gauges & Insulation Basics" },
                description: { mr: "कॉपर आणि ॲल्युमिनियम वायरमधील फरक आणि वायर स्ट्रिपर वापरणे.", hi: "तांबे और एल्युमिनियम तार में अंतर तथा वायर स्ट्रिपर का उपयोग।", en: "Understand copper vs aluminum conductors and basic wire stripping." },
                practical_action: { mr: "जुनी निरुपयोगी वायर सोलून तिचा गेज हाताने तपासून पहा.", hi: "किसी पुराने बेकार तार का इंसुलेशन छीलकर जांचें।", en: "Practice stripping a piece of scrap insulated wire cleanly." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 2,
            title: {
              mr: "आठवडा २ - सौर ऊर्जेची मूलतत्त्वे",
              hi: "सप्ताह २ - सौर ऊर्जा के बुनियादी सिद्धांत",
              en: "Week 2 - Solar Energy Fundamentals"
            },
            steps: [
              {
                id: "es_w2_s1",
                day: 8,
                estimated_minutes: 15,
                icon: "Sun",
                title: { mr: "सोलर पॅनेल कसे कार्य करते?", hi: "सोलर पैनल कैसे काम करता है?", en: "How Solar Panels Work" },
                description: { mr: "सूर्यप्रकाशापासून डीसी वीज कशी तयार होते आणि बॅटरी कशी चार्ज होते ते शिका.", hi: "धूप से डीसी बिजली कैसे बनती है और बैटरी कैसे चार्ज होती है, समझें।", en: "Understand photovoltaic conversion from sunlight to DC electricity." },
                practical_action: { mr: "गावातील सोलर दिवा किंवा शेतातील सोलर पंप जवळून पहा.", hi: "गांव की सोलर स्ट्रीट लाइट या खेत का सोलर पंप ध्यान से देखें।", en: "Inspect a local solar street lamp or farm solar pump installation." },
                resource_url: null,
                needs_verification: true
              },
              {
                id: "es_w2_s2",
                day: 11,
                estimated_minutes: 15,
                icon: "BatteryCharging",
                title: { mr: "इन्व्हर्टर आणि बॅटरी कनेक्शन", hi: "इन्वर्टर और बैटरी कनेक्शन", en: "Inverters & Battery Connections" },
                description: { mr: "डीसी ते एसी प्रवाह कसा बदलला जातो आणि बॅटरीचे पाणी कसे तपासतात.", hi: "डीसी से एसी करंट कैसे बदलता है और बैटरी का पानी कैसे जांचें।", en: "Learn how inverters convert DC to AC and basic battery water maintenance." },
                practical_action: { mr: "घरातील किंवा शेजारील इन्व्हर्टरचे व्होल्टेज इंडिकेटर तपासा.", hi: "घर या पड़ोस के इन्वर्टर का चार्ज इंडिकेटर देखें।", en: "Check the charge indicator lights on an inverter or battery unit." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 3,
            title: {
              mr: "आठवडा ३ - शेती पंप व मोटर सुरक्षितता",
              hi: "सप्ताह ३ - कृषि पंप और मोटर सुरक्षा",
              en: "Week 3 - Farm Pumps & Motor Basics"
            },
            steps: [
              {
                id: "es_w3_s1",
                day: 15,
                estimated_minutes: 15,
                icon: "Gauge",
                title: { mr: "सबमर्सिबल पंप आणि स्टार्टर", hi: "सबमर्सिबल पंप और स्टार्टर", en: "Submersible Pumps & Starters" },
                description: { mr: "शेतातील ३-फेज मोटर स्टार्टर आणि रिलेचे कार्य समजून घ्या.", hi: "खेत के ३-फेज स्टार्टर और रिले का काम समझें।", en: "Learn how 3-phase motor starters and thermal overload relays protect pumps." },
                practical_action: { mr: "शेतातील स्टार्टर बॉक्सचे हिरवे आणि लाल बटण आणि फ्यूज तपासा.", hi: "खेत के स्टार्टर बॉक्स के बटन और फ्यूज का निरीक्षण करें।", en: "Observe the start/stop mechanism and fuse wire in a farm starter box." },
                resource_url: null,
                needs_verification: true
              },
              {
                id: "es_w3_s2",
                day: 18,
                estimated_minutes: 15,
                icon: "CheckCircle",
                title: { mr: "अर्थिंग (Earthing) का महत्त्वाची आहे?", hi: "अर्थिंग (Earthing) क्यों ज़रूरी है?", en: "Why Proper Earthing Matters" },
                description: { mr: "विद्युत शॉकपासून संरक्षण करण्यासाठी अर्थिंग खड्डा आणि मीठ-कोळशाचा वापर.", hi: "बिजली के झटके से बचाव के लिए अर्थिंग गड्ढा और नमक-कोयले का उपयोग।", en: "Understand earthing pits, salt-charcoal mixtures, and shock prevention." },
                practical_action: { mr: "तुमच्या घराची किंवा पंपाची अर्थिंग वायर जमिनीत घट्ट जोडलेली आहे का ते पहा.", hi: "घर या मोटर की अर्थिंग तार जमीन में ठीक से जुड़ी है या नहीं, देखें।", en: "Check if your pump or house earthing lead is firmly grounded." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 4,
            title: {
              mr: "आठवडा ४ - सरकारी योजना आणि करिअर दिशा",
              hi: "सप्ताह ४ - सरकारी योजनाएं और करियर दिशा",
              en: "Week 4 - Schemes & Career Direction"
            },
            steps: [
              {
                id: "es_w4_s1",
                day: 22,
                estimated_minutes: 15,
                icon: "FileText",
                title: { mr: "स्किल इंडिया आणि पीएम सूर्य घर योजना", hi: "स्किल इंडिया और पीएम सूर्य घर योजना", en: "Skill India & PM Surya Ghar Scheme" },
                description: { mr: "रूफटॉप सोलर इन्स्टॉलेशनसाठी सरकारकडून दिले जाणारे मोफत प्रशिक्षण व अनुदान.", hi: "रूफटॉप सोलर स्थापना के लिए सरकार द्वारा दिए जाने वाले मुफ्त प्रशिक्षण और सब्सिडी।", en: "Explore government training subsidies for rooftop solar installations." },
                practical_action: { mr: "आधार कार्ड व १० वी मार्कशीट तयार ठेवा.", hi: "आधार कार्ड और १०वीं की मार्कशीट तैयार रखें।", en: "Gather your Aadhaar card and 10th mark sheet for apprenticeship registration." },
                resource_url: "https://www.apprenticeshipindia.gov.in",
                needs_verification: false
              },
              {
                id: "es_w4_s2",
                day: 28,
                estimated_minutes: 15,
                icon: "Award",
                title: { mr: "जवळच्या ITI / PMKK केंद्राला भेट", hi: "नज़दीकी ITI / PMKK केंद्र की यात्रा", en: "Visit Nearest ITI / PMKK Training Center" },
                description: { mr: "वायरमन किंवा इलेक्ट्रिशियन ट्रेडमधील प्रवेश प्रक्रिया समजून घेणे.", hi: "वायरमैन या इलेक्ट्रीशियन ट्रेड में प्रवेश प्रक्रिया समझें।", en: "Learn how to enroll in a wireman or solar PV certificate course." },
                practical_action: { mr: "स्थानिक इलेक्ट्रिशियन किंवा शिक्षकांशी ३० मिनिटे चर्चा करा.", hi: "स्थानीय इलेक्ट्रीशियन या शिक्षक से ३० मिनट चर्चा करें।", en: "Have a 30-minute interview with a local electrician or ITI teacher." },
                resource_url: "https://www.nsdcindia.org",
                needs_verification: false
              }
            ]
          }
        ]
      },
      months_3_to_6: {
        title: {
          mr: "३ ते ६ महिने - कौशल्य प्रमाणपत्र आणि शिकाऊ उमेदवारी",
          hi: "३ से ६ महीने - कौशल प्रमाणन और शिक्षुता",
          en: "3-6 Months - Skill Certification & Apprenticeship"
        },
        milestones: [
          {
            id: "es_m3_1",
            title: { mr: "राष्ट्रीय शिकाऊ उमेदवारी (NAPS) नोंदणी", hi: "राष्ट्रीय शिक्षुता प्रोत्साहन (NAPS) पंजीकरण", en: "Register for NAPS Solar PV Apprenticeship" },
            description: { mr: "महिन्याला ₹८,००० विद्यावेतनासह १ वर्षाचे प्रत्यक्ष कामावरील प्रशिक्षण.", hi: "₹८,०००/माह स्टाइपेंड के साथ १ वर्ष का कार्यस्थल प्रशिक्षण।", en: "1-year on-the-job training with Rs 8,000/month stipend and certificate." },
            practical_action: { mr: "अप्रेंटिसशिप पोर्टलवर प्रोफाइल तयार करा.", hi: "अप्रेंटिसशिप पोर्टल पर प्रोफाइल बनाएं।", en: "Create learner profile on the official Apprenticeship India portal." },
            resource_url: "https://www.apprenticeshipindia.gov.in",
            needs_verification: false,
            deadline: "2026-12-31",
            is_opportunity_milestone: true
          }
        ]
      },
      years_1_to_2: {
        title: {
          mr: "१ ते २ वर्षे - स्वतंत्र ग्रामीण उद्योजक",
          hi: "१ से २ वर्ष - स्वतंत्र ग्रामीण उद्यमी",
          en: "1-2 Years - Independent Rural Entrepreneur"
        },
        milestones: [
          {
            id: "es_y1_1",
            title: { mr: "पीएम विश्वकर्मा किंवा मुद्रा कर्ज योजना", hi: "पीएम विश्वकर्मा या मुद्रा ऋण योजना", en: "PM Vishwakarma / MUDRA Tool Loan" },
            description: { mr: "स्वतःचे सोलर व इलेक्ट्रिकल सेवा केंद्र सुरू करण्यासाठी विनातारण कर्ज.", hi: "अपना सोलर एवं इलेक्ट्रिकल सेवा केंद्र शुरू करने हेतु बिना गारंटी ऋण।", en: "Collateral-free micro-credit to set up a village solar repair shop." },
            resource_url: "https://pmvishwakarma.gov.in",
            needs_verification: false
          }
        ]
      }
    },
    vocational_alternative: {
      id: "alt_rural_pump_mechanic",
      title: { mr: "कृषी डिझेल व सोलर पंप दुरुस्ती तंत्रज्ञ", hi: "कृषि डीजल एवं सोलर पंप मरम्मत तकनीशियन", en: "Rural Agricultural Pump & Small Engine Mechanic" },
      description: { mr: "शेतातील डिझेल इंजिन, स्प्रिंकलर आणि तुषार सिंचन यंत्रणेची देखभाल व दुरुस्ती.", hi: "खेतों के डीजल इंजन, स्प्रिंकलर और ड्रिप सिंचाई प्रणाली की मरम्मत और देखभाल।", en: "Repair small farm engines, diesel generators, and drip/sprinkler water pumps." },
      resource_url: null,
      needs_verification: true
    }
  },
  agriculture_dairy: {
    id: "agriculture_dairy",
    career_cluster: "agriculture_dairy",
    title: {
      mr: "सेंद्रिय शेती व आधुनिक दुग्धव्यवसाय (Organic Farming & Modern Dairy)",
      hi: "जैविक खेती और आधुनिक डेयरी व्यवसाय (Organic Farming & Modern Dairy)",
      en: "Organic Farming & Modern Dairy Entrepreneurship"
    },
    description: {
      mr: "माती परीक्षण, सेंद्रिय खते, गोपालन, आधुनिक दुग्ध संकलन आणि नाबार्ड योजनांचे मार्गदर्शन.",
      hi: "मृदा परीक्षण, जैविक खाद, पशुपालन, आधुनिक दूध संकलन और नाबार्ड योजनाओं का मार्गदर्शन।",
      en: "Soil health testing, natural composting, livestock nutrition, automated milk collection, and NABARD schemes."
    },
    stages: {
      next_30_days: {
        title: {
          mr: "पुढील ३० दिवस (दररोज १५ मिनिटे सराव)",
          hi: "अगले ३० दिन (प्रतिदिन १५ मिनट अभ्यास)",
          en: "Next 30 Days (~15 mins daily practical steps)"
        },
        weeks: [
          {
            week_number: 1,
            title: { mr: "आठवडा १ - मातीचे आरोग्य आणि सेंद्रिय खत", hi: "सप्ताह १ - मिट्टी की सेहत और जैविक खाद", en: "Week 1 - Soil Health & Composting" },
            steps: [
              {
                id: "ad_w1_s1",
                day: 1,
                estimated_minutes: 15,
                icon: "Sprout",
                title: { mr: "मातीचे नमुने कसे गोळा करावेत?", hi: "मिट्टी का नमूना कैसे लें?", en: "How to Collect Soil Samples" },
                description: { mr: "शेताच्या वेगवेगळ्या कोपऱ्यांतून 'V' आकाराचा खड्डा करून माती गोळा करण्याची पद्धत.", hi: "खेत के विभिन्न कोनों से 'V' आकार का गड्ढा बनाकर मिट्टी एकत्र करने की विधि।", en: "Learn the standard 'V' shape depth sampling technique across farm plots." },
                practical_action: { mr: "शेतातून १ किलो मातीचा नमुना गोळा करून सावलीत वाळवा.", hi: "खेत से १ किलो मिट्टी का नमूना लेकर छाया में सुखाएं।", en: "Collect a 1 kg composite soil sample and shade-dry it on clean paper." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 2,
            title: { mr: "आठवडा २ - दुग्धव्यवसाय आणि पशु आहार", hi: "सप्ताह २ - डेयरी व्यवसाय और पशु आहार", en: "Week 2 - Dairy & Animal Nutrition" },
            steps: [
              {
                id: "ad_w2_s1",
                day: 8,
                estimated_minutes: 15,
                icon: "Heart",
                title: { mr: "जनावरांचे संतुलित पोषण आणि सायलेज", hi: "पशुओं का संतुलित आहार और साइलेज", en: "Balanced Cattle Feed & Silage" },
                description: { mr: "दुभत्या जनावरांसाठी हिरवा चारा, सुका चारा आणि मिनरल मिक्स्चरचे योग्य प्रमाण.", hi: "दुधारू पशुओं के लिए हरा चारा, सूखा चारा और मिनरल मिक्सचर का सही अनुपात।", en: "Understand dry matter intake, green fodder silage, and mineral supplement rations." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 3,
            title: { mr: "आठवडा ३ - दूध संकलन आणि फॅट/SNF चाचणी", hi: "सप्ताह ३ - दूध संकलन और फैट/SNF जांच", en: "Week 3 - Milk Testing & FAT/SNF Measurement" },
            steps: [
              {
                id: "ad_w3_s1",
                day: 16,
                estimated_minutes: 15,
                icon: "Droplet",
                title: { mr: "इलेक्ट्रॉनिक मिल्क टेस्टर कसे चालते?", hi: "इलेक्ट्रॉनिक मिल्क टेस्टर कैसे काम करता है?", en: "How Electronic Milk Analyzers Work" },
                description: { mr: "दुधातील फॅट आणि एसएनएफ (SNF) चे मोजमाप करून योग्य दर कसा मिळतो ते शिका.", hi: "दूध में फैट और एसएनएफ की जांच से सही मूल्य कैसे तय होता है, समझें।", en: "Understand ultrasonic milk testing for FAT and Solids-Not-Fat (SNF) pricing." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 4,
            title: { mr: "आठवडा ४ - नाबार्ड व कृषी योजना", hi: "सप्ताह ४ - नाबार्ड और कृषि योजनाएं", en: "Week 4 - NABARD & Agriculture Schemes" },
            steps: [
              {
                id: "ad_w4_s1",
                day: 23,
                estimated_minutes: 15,
                icon: "Award",
                title: { mr: "नाबार्ड ग्रामीण कृषी फेलोशिप व अनुदान", hi: "नाबार्ड ग्रामीण कृषि फेलोशिप और अनुदान", en: "NABARD Agri-Entrepreneurship Fellowship" },
                description: { mr: "तरुण शेतकऱ्यांना आधुनिक कृषी प्रकल्पासाठी मिळणारे मासिक विद्यावेतन आणि मार्गदर्शन.", hi: "युवा किसानों को आधुनिक कृषि प्रोजेक्ट हेतु मासिक स्टाइपेंड और मार्गदर्शन।", en: "Learn about NABARD rural youth fellowships providing stipends for farm starts." },
                resource_url: "https://www.nabard.org",
                needs_verification: false
              }
            ]
          }
        ]
      },
      months_3_to_6: {
        title: { mr: "३ ते ६ महिने - प्रत्यक्ष प्रकल्प आणि गट शेती", hi: "३ से ६ महीने - व्यावहारिक प्रोजेक्ट और समूह खेती", en: "3-6 Months - Pilot Project & Farmer Producer Group" },
        milestones: [
          {
            id: "ad_m3_1",
            title: { mr: "नाबार्ड कृषी-उद्योजकता फेलोशिप अर्ज", hi: "नाबार्ड कृषि-उद्यमिता फेलोशिप आवेदन", en: "Apply for NABARD Rural Agri Fellowship" },
            description: { mr: "दरमहा ₹१५,००० विद्यावेतनासह ३० दिवसांचे प्रत्यक्ष शेती फेलोशिप प्रशिक्षण.", hi: "₹१५,०००/माह स्टाइपेंड के साथ ३० दिन की व्यावहारिक कृषि फेलोशिप।", en: "Apply for 30-day field fellowship with Rs 15,000/month stipend and mentor support." },
            resource_url: "https://www.nabard.org",
            needs_verification: false,
            deadline: "2026-12-15",
            is_opportunity_milestone: true
          }
        ]
      },
      years_1_to_2: {
        title: { mr: "१ ते २ वर्षे - मूल्यवर्धन आणि स्वतःचा ब्रँड", hi: "१ से २ वर्ष - मूल्य संवर्धन और अपना ब्रांड", en: "1-2 Years - Value Addition & Rural Brand" },
        milestones: [
          {
            id: "ad_y1_1",
            title: { mr: "दूध प्रक्रिया किंवा सेंद्रिय शेतमाल थेट विक्री", hi: "दुग्ध प्रसंस्करण या जैविक उत्पाद सीधे बिक्री", en: "Milk Processing (Paneer/Ghee) or Direct Organic Retail" },
            description: { mr: "कच्च्या दुधाऐवजी पनीर, खवा, तूप किंवा सेंद्रिय भाजीपाला थेट शहरात पाठवणे.", hi: "कच्चे दूध के स्थान पर पनीर, खोया, घी या जैविक सब्जियां सीधे शहरों में बेचना।", en: "Produce value-added dairy products like ghee/paneer to double profit margins." },
            resource_url: null,
            needs_verification: true
          }
        ]
      }
    },
    vocational_alternative: {
      id: "alt_dairy_mechanization",
      title: { mr: "स्वयंचलित दूध काढणी यंत्र व शीतकरण तंत्रज्ञ", hi: "स्वचालित मिल्किंग मशीन एवं चिलिंग प्लांट तकनीशियन", en: "Automated Milking Machine & Bulk Milk Cooler Technician" },
      description: { mr: "गावातील डेअरी केंद्रांमधील बीएमसी (BMC) चिलर आणि मिल्किंग मशिन्सची देखभाल.", hi: "गांव के बल्क मिल्क कूलर और मिल्किंग मशीनों की तकनीकी देखभाल व सर्विसिंग।", en: "Technical servicing of bulk milk cooling tanks and vacuum milking machines in rural clusters." },
      resource_url: null,
      needs_verification: true
    }
  },
  healthcare: {
    id: "healthcare",
    career_cluster: "healthcare",
    title: {
      mr: "ग्रामीण आरोग्य व पॅरामेडिकल सेवा (Community Healthcare & Paramedic)",
      hi: "ग्रामीण स्वास्थ्य और पैरामेडिकल सेवाएं (Community Healthcare & Paramedic)",
      en: "Community Healthcare & Paramedical Services"
    },
    description: {
      mr: "प्रथमोपचार, प्राथमिक आरोग्य केंद्र (PHC), आशा/ANM सहाय्यक आणि रुग्णालय सहाय्यक कौशल्ये.",
      hi: "प्राथमिक उपचार, प्राथमिक स्वास्थ्य केंद्र (PHC), आशा/एएनएम सहायक और अस्पताल सहायक कौशल।",
      en: "First aid, vital signs monitoring, PHC coordination, ASHA/ANM bridging, and general duty nursing assistance."
    },
    stages: {
      next_30_days: {
        title: { mr: "पुढील ३० दिवस (दररोज १५ मिनिटे सराव)", hi: "अगले ३० दिन (प्रतिदिन १५ मिनट अभ्यास)", en: "Next 30 Days (~15 mins daily practical steps)" },
        weeks: [
          {
            week_number: 1,
            title: { mr: "आठवडा १ - प्रथमोपचार आणि जीवनरक्षक मूलतत्त्वे", hi: "सप्ताह १ - प्राथमिक उपचार और जीवनरक्षक बुनियादी सिद्धांत", en: "Week 1 - First Aid & Vital Signs" },
            steps: [
              {
                id: "hc_w1_s1",
                day: 1,
                estimated_minutes: 15,
                icon: "Heart",
                title: { mr: "नाडीचे ठोके आणि श्वास मोजणे", hi: "नाड़ी की गति और सांस मापना", en: "Measuring Pulse & Respiratory Rate" },
                description: { mr: "हाताच्या मनगटावर बोटे ठेवून एका मिनिटात नाडीचे ठोके अचूक मोजण्याची पद्धत.", hi: "कलाई पर उंगली रखकर एक मिनट में नाड़ी की धड़कन सही से गिनने का तरीका।", en: "Learn how to palpate the radial pulse and calculate heart beats per minute." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 2,
            title: { mr: "आठवडा २ - जखम बांधणे व स्वच्छता", hi: "सप्ताह २ - घाव की पट्टी और स्वच्छता", en: "Week 2 - Wound Bandaging & Hygiene" },
            steps: [
              {
                id: "hc_w2_s1",
                day: 8,
                estimated_minutes: 15,
                icon: "Shield",
                title: { mr: "जखम धुणे आणि अँटिसेप्टिकचा वापर", hi: "घाव धोना और एंटीसेप्टिक का उपयोग", en: "Wound Cleaning & Antiseptic Care" },
                description: { mr: "कट किंवा जखम झाल्यावर साबण-पाण्याने स्वच्छ करणे आणि मलम लावण्याची खबरदारी.", hi: "कटने या छिलने पर साबुन-पानी से सफाई और एंटीसेप्टिक लगाने का सही तरीका।", en: "Learn sterile wound washing techniques and how to avoid infection." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 3,
            title: { mr: "आठवडा ३ - प्राथमिक आरोग्य केंद्र यंत्रणा", hi: "सप्ताह ३ - प्राथमिक स्वास्थ्य केंद्र प्रणाली", en: "Week 3 - Primary Health Centre Structure" },
            steps: [
              {
                id: "hc_w3_s1",
                day: 17,
                estimated_minutes: 15,
                icon: "Compass",
                title: { mr: "आशा आणि आरोग्यसेविकांचे कार्य", hi: "आशा और स्वास्थ्य कार्यकर्ताओं का कार्य", en: "Role of ASHA & Community Health Officers" },
                description: { mr: "गरोदर मातांचे लसीकरण, बालकांचे वजन आणि पोषण अभियानातील गाव पातळीवरील जबाबदाऱ्या.", hi: "गर्भवती माताओं का टीकाकरण, बच्चों का वजन और पोषण अभियान में जिम्मेदारियां।", en: "Understand maternal health tracking, child immunization days, and nutrition monitoring." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 4,
            title: { mr: "आठवडा ४ - सरकारी योजना आणि करिअर संधी", hi: "सप्ताह ४ - सरकारी योजनाएं और करियर अवसर", en: "Week 4 - Government Grants & Nursing Admissions" },
            steps: [
              {
                id: "hc_w4_s1",
                day: 24,
                estimated_minutes: 15,
                icon: "Award",
                title: { mr: "राष्ट्रीय आरोग्य अभियान (NHM) अनुदान", hi: "राष्ट्रीय स्वास्थ्य मिशन (NHM) अनुदान", en: "National Health Mission Bridging Grant" },
                description: { mr: "१० वी व १२ वी नंतर महिला व ग्रामीण तरुणांसाठी मोफत पॅरामेडिकल प्रशिक्षण व विद्यावेतन.", hi: "१०वीं और १२वीं के बाद निःशुल्क पैरामेडिकल प्रशिक्षण एवं स्टाइपेंड योजना।", en: "Explore government healthcare assistant subsidies and district hospital training." },
                resource_url: "https://nhm.gov.in",
                needs_verification: false
              }
            ]
          }
        ]
      },
      months_3_to_6: {
        title: { mr: "३ ते ६ महिने - ४५ दिवसांचे रुग्णालय प्रशिक्षण", hi: "३ से ६ महीने - ४५ दिनों का अस्पताल प्रशिक्षण", en: "3-6 Months - 45-Day Hospital Internship" },
        milestones: [
          {
            id: "hc_m3_1",
            title: { mr: "एनएचएम पॅरामेडिक / आशा ब्रिजिंग कोर्स", hi: "एनएचएम पैरामेडिक / आशा ब्रिजिंग कोर्स", en: "NHM Community Paramedic Training Module" },
            description: { mr: "मोफत पॅरामेडिक प्रशिक्षण आणि जिल्हा सामान्य रुग्णालयात प्रत्यक्ष अनुभव.", hi: "निःशुल्क पैरामेडिक प्रशिक्षण और जिला अस्पताल में व्यावहारिक अनुभव।", en: "Complete certified healthcare assistant training with district hospital placement." },
            resource_url: "https://nhm.gov.in",
            needs_verification: false,
            deadline: "2026-12-20",
            is_opportunity_milestone: true
          }
        ]
      },
      years_1_to_2: {
        title: { mr: "१ ते २ वर्षे - नोंदणीकृत आरोग्य परिचारिका", hi: "१ से २ वर्ष - पंजीकृत स्वास्थ्य परिचारिका", en: "1-2 Years - Registered Health Worker" },
        milestones: [
          {
            id: "hc_y1_1",
            title: { mr: "DMLT किंवा ANM पूर्ण करणे", hi: "डीएमएलटी या एएनएम पूर्ण करना", en: "Complete DMLT or ANM Diploma" },
            description: { mr: "रक्त तपासणी किंवा प्राथमिक आरोग्य केंद्रात कायमस्वरूपी नियुक्ती.", hi: "रक्त जांच या प्राथमिक स्वास्थ्य केंद्र में नियुक्ति।", en: "Qualify as certified lab technician for rural pathology and diagnostic centers." },
            resource_url: null,
            needs_verification: true
          }
        ]
      }
    },
    vocational_alternative: {
      id: "alt_pharmacy_assistant",
      title: { mr: "ग्रामीण औषधालय व मेडिकल स्टोअर सहाय्यक", hi: "ग्रामीण दवाखाना एवं मेडिकल स्टोर सहायक", en: "Rural Pharmacy Dispensing Assistant" },
      description: { mr: "औषधांची साठवणूक, एक्स्पायरी तारीख व्यवस्थापन आणि संगणकीय बिलिंगचे प्रत्यक्ष काम.", hi: "दवाओं का रखरखाव, एक्सपायरी तारीख प्रबंधन और कंप्यूटर बिलिंग का कार्य।", en: "Manage medicine inventory, expiration tracking, and digital billing at rural medical stores." },
      resource_url: null,
      needs_verification: true
    }
  },
  it_digital: {
    id: "it_digital",
    career_cluster: "it_digital",
    title: {
      mr: "ग्रामीण डिजिटल सेवा व बँकिंग प्रतिनिधी (Digital Banking & IT Services)",
      hi: "ग्रामीण डिजिटल सेवाएं और बैंकिंग प्रतिनिधि (Digital Banking & IT Services)",
      en: "Rural Digital Services & Banking Correspondent"
    },
    description: {
      mr: "सामान्य सेवा केंद्र (CSC), आधार/पॅन नोंदणी, डीबीटी बँकिंग, एमएस ऑफिस आणि स्मार्टफोन दुरुस्ती.",
      hi: "जन सेवा केंद्र (CSC), आधार/पैन सेवा, डीबीटी बैंकिंग, एमएस ऑफिस और स्मार्टफोन मरम्मत।",
      en: "Common Service Centre (CSC) operations, DBT banking correspondent terminal, office software, and mobile hardware."
    },
    stages: {
      next_30_days: {
        title: { mr: "पुढील ३० दिवस (दररोज १५ मिनिटे सराव)", hi: "अगले ३० दिन (प्रतिदिन १५ मिनट अभ्यास)", en: "Next 30 Days (~15 mins daily practical steps)" },
        weeks: [
          {
            week_number: 1,
            title: { mr: "आठवडा १ - संगणक व इंटरनेट साक्षरता", hi: "सप्ताह १ - कंप्यूटर और इंटरनेट साक्षरता", en: "Week 1 - Computer & Internet Essentials" },
            steps: [
              {
                id: "it_w1_s1",
                day: 1,
                estimated_minutes: 15,
                icon: "Monitor",
                title: { mr: "टायपिंग गती आणि मराठी/इंग्रजी कीबोर्ड", hi: "टाइपिंग स्पीड और हिंदी/अंग्रेजी कीबोर्ड", en: "Keyboard Skills & Regional Language Typing" },
                description: { mr: "बोटांचे योग्य स्थान आणि गुगल इनपुट टूल्सने मराठी/हिंदी टायपिंग.", hi: "उंगलियों की सही स्थिति और इनपुट टूल्स द्वारा हिंदी/मराठी में तेज़ टाइपिंग।", en: "Learn home row key placement and phonetic regional language keyboard tools." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 2,
            title: { mr: "आठवडा २ - डिजिटल सरकारी सेवा व नागरिक पोर्टल", hi: "सप्ताह २ - डिजिटल सरकारी सेवाएं और नागरिक पोर्टल", en: "Week 2 - Digital Citizen Portals" },
            steps: [
              {
                id: "it_w2_s1",
                day: 8,
                estimated_minutes: 15,
                icon: "Shield",
                title: { mr: "आधार, पॅन आणि डिजिलॉकरचे कामकाज", hi: "आधार, पैन और डिजिलॉकर की कार्यप्रणाली", en: "Aadhaar, PAN & DigiLocker Workflows" },
                description: { mr: "ई-केवायसी, ओटीपी पडताळणी आणि डिजिलॉकरमध्ये कागदपत्रे सुरक्षित ठेवणे.", hi: "ई-केवाईसी, ओटीपी सत्यापन और डिजिलॉकर में दस्तावेज़ सुरक्षित रखने की प्रक्रिया।", en: "Understand e-KYC verification, OTP safety, and paperless digital document vaults." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 3,
            title: { mr: "आठवडा ३ - सूक्ष्म बँकिंग आणि डीबीटी यंत्रणा", hi: "सप्ताह ३ - माइक्रो बैंकिंग और डीबीटी प्रणाली", en: "Week 3 - Micro-Banking & DBT Mechanisms" },
            steps: [
              {
                id: "it_w3_s1",
                day: 16,
                estimated_minutes: 15,
                icon: "DollarSign",
                title: { mr: "बँक मित्र (BC) आणि आधार सक्षम पेमेंट (AePS)", hi: "बैंक मित्र (BC) और आधार सक्षम भुगतान (AePS)", en: "Business Correspondent & AePS Basics" },
                description: { mr: "बोटाच्या ठशाने बँकेतून पैसे काढणे आणि निवृत्तीवेतन वाटप.", hi: "अंगूठे के निशान से बायोमेट्रिक पैसे निकालना और पेंशन वितरण का कार्य।", en: "Learn biometric micro-ATM cash withdrawals and government direct benefit transfers." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 4,
            title: { mr: "आठवडा ४ - सर्टिफिकेशन आणि प्रशिक्षण योजना", hi: "सप्ताह ४ - प्रमाणन और प्रशिक्षण योजनाएं", en: "Week 4 - Certification & Training Schemes" },
            steps: [
              {
                id: "it_w4_s1",
                day: 23,
                estimated_minutes: 15,
                icon: "Award",
                title: { mr: "इंडियन बँक्स असोसिएशन (IBA) प्रशिक्षण", hi: "इंडियन बैंक्स एसोसिएशन (IBA) प्रशिक्षण", en: "Indian Banks Association BC Trainee Program" },
                description: { mr: "बँक प्रतिनिधी बनण्यासाठी लागणारे मोफत टॅब्लेट, मायक्रो-एटीएम आणि मानधन.", hi: "बैंक प्रतिनिधि बनने हेतु निःशुल्क टैबलेट, पीओएस टर्मिनल और मासिक मानदेय।", en: "Explore training guidelines and bank branch sponsorship for village correspondents." },
                resource_url: "https://www.iba.org.in",
                needs_verification: false
              }
            ]
          }
        ]
      },
      months_3_to_6: {
        title: { mr: "३ ते ६ महिने - सीएससी / बँक मित्र नोंदणी", hi: "३ से ६ महीने - सीएससी / बैंक मित्र पंजीकरण", en: "3-6 Months - Certified CSC & Bank Mitra Setup" },
        milestones: [
          {
            id: "it_m3_1",
            title: { mr: "IIBF बँक मित्र परीक्षा उत्तीर्ण करणे", hi: "IIBF बैंक मित्र परीक्षा उत्तीर्ण करना", en: "Pass IIBF Business Correspondent Certification" },
            description: { mr: "इंडियन इन्स्टिट्यूट ऑफ बँकिंग अँड फायनान्सची अधिकृत परीक्षा देऊन प्रमाणपत्र मिळवणे.", hi: "इंडियन इंस्टीट्यूट ऑफ बैंकिंग एंड फाइनेंस की आधिकारिक परीक्षा पास करना।", en: "Clear the official national IIBF BC certification required by all public sector banks." },
            resource_url: null,
            needs_verification: true
          }
        ]
      },
      years_1_to_2: {
        title: { mr: "१ ते २ वर्षे - संपूर्ण डिजिटल सेवा केंद्र", hi: "१ से २ वर्ष - पूर्ण डिजिटल सेवा केंद्र", en: "1-2 Years - Full-Fledged Village Digital Seva Kendra" },
        milestones: [
          {
            id: "it_y1_1",
            title: { mr: "स्वतःचे गाव पातळीवरील 'आपले सरकार' केंद्र", hi: "अपना गांव स्तरीय 'आपले सरकार' केंद्र", en: "Launch Independent Village Digital Seva Kendra" },
            description: { mr: "प्रिंटर, लॅपटॉप आणि बायोमेट्रिक स्कॅनरसह सर्व शासकीय दाखले व ऑनलाइन फॉर्म सेवा.", hi: "प्रिंटर, लैपटॉप और बायोमेट्रिक स्कैनर के साथ सभी सरकारी प्रमाण पत्र सेवा।", en: "Operate a profitable rural center providing 40+ government certificate and application services." },
            resource_url: null,
            needs_verification: true
          }
        ]
      }
    },
    vocational_alternative: {
      id: "alt_mobile_hardware_repair",
      title: { mr: "स्मार्टफोन स्क्रीन व मदरबोर्ड दुरुस्ती तंत्रज्ञ", hi: "स्मार्टफोन स्क्रीन एवं मदरबोर्ड रिपेयर तकनीशियन", en: "Smartphone Hardware & Component Level Repair Technician" },
      description: { mr: "फुटलेली स्क्रीन बदलणे, चार्जिंग जॅक सोल्डरिंग आणि बॅटरी बदलण्याचे प्रत्यक्ष कौशल्य.", hi: "टूटी स्क्रीन बदलना, चार्जिंग जैक सोल्डरिंग और बैटरी रिप्लेसमेंट का काम।", en: "Hands-on micro-soldering, broken display replacement, and battery diagnostics for rural phones." },
      resource_url: null,
      needs_verification: true
    }
  },
  general_explore: {
    id: "general_explore",
    career_cluster: "general_explore",
    title: {
      mr: "समग्र करिअर शोध व कौशल्य विकास (General Career Exploration)",
      hi: "समग्र करियर खोज और कौशल विकास (General Career Exploration)",
      en: "General Career Exploration & Skill Building"
    },
    description: {
      mr: "विविध व्यावसायिक क्षेत्रे, सरकारी शिष्यवृत्ती, व्यावहारिक कौशल्ये आणि भविष्यातील संधींचा शोध.",
      hi: "विभिन्न व्यावसायिक क्षेत्र, सरकारी छात्रवृत्ति, व्यावहारिक कौशल और भविष्य के अवसरों की खोज।",
      en: "Discover diverse vocational trades, state scholarships, hands-on skills, and rural livelihood pathways."
    },
    stages: {
      next_30_days: {
        title: { mr: "पुढील ३० दिवस (दररोज १५ मिनिटे सराव)", hi: "अगले ३० दिन (प्रतिदिन १५ मिनट अभ्यास)", en: "Next 30 Days (~15 mins daily practical steps)" },
        weeks: [
          {
            week_number: 1,
            title: { mr: "आठवडा १ - स्वतःच्या आवडी आणि क्षमतांची ओळख", hi: "सप्ताह १ - अपनी रुचियों और क्षमताओं की पहचान", en: "Week 1 - Self-Assessment & Strength Discovery" },
            steps: [
              {
                id: "ge_w1_s1",
                day: 1,
                estimated_minutes: 15,
                icon: "Compass",
                title: { mr: "माझी आवड: हाताने काम की संगणक?", hi: "मेरी रुचि: हाथों से काम या कंप्यूटर?", en: "Hands-on vs Analytical Preferences" },
                description: { mr: "तुम्हाला अवजारे हाताळायला आवडतात, लोकांशी बोलायला की विचार करून प्रश्न सोडवायला?", hi: "आपको उपकरण संभालना पसंद है, लोगों से बात करना या कंप्यूटर पर काम करना?", en: "Reflect on whether you thrive in practical trade work, public interaction, or analytical tasks." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 2,
            title: { mr: "आठवडा २ - शालेय शिक्षणानंतरचे विविध पर्याय", hi: "सप्ताह २ - स्कूली शिक्षा के बाद विभिन्न विकल्प", en: "Week 2 - Post-School Pathways" },
            steps: [
              {
                id: "ge_w2_s1",
                day: 8,
                estimated_minutes: 15,
                icon: "Award",
                title: { mr: "१० वी / १२ वी नंतरचे ३ मुख्य मार्ग", hi: "१०वीं / १२वीं के बाद के ३ मुख्य रास्ते", en: "3 Clear Routes After 10th / 12th" },
                description: { mr: "१) ITI आणि कौशल्य प्रमाणपत्र, २) ३ वर्षांचा तंत्रनिकेतन डिप्लोमा, ३) पारंपरिक पदवी.", hi: "१) आईटीआई और कौशल प्रमाणन, २) ३-वर्षीय पॉलिटेक्निक डिप्लोमा, ३) पारंपरिक डिग्री।", en: "Understand trade diplomas vs polytechnic engineering vs degree colleges." },
                resource_url: null,
                needs_verification: true
              }
            ]
          },
          {
            week_number: 3,
            title: { mr: "आठवडा ३ - सरकारी शिष्यवृत्ती व आर्थिक सहाय्य", hi: "सप्ताह ३ - सरकारी छात्रवृत्ति और वित्तीय सहायता", en: "Week 3 - Government Scholarships & Financial Aid" },
            steps: [
              {
                id: "ge_w3_s1",
                day: 17,
                estimated_minutes: 15,
                icon: "Award",
                title: { mr: "राष्ट्रीय शिष्यवृत्ती पोर्टल (NSP) ची माहिती", hi: "राष्ट्रीय छात्रवृत्ति पोर्टल (NSP) की जानकारी", en: "National Scholarship Portal (NSP) Schemes" },
                description: { mr: "९ वी ते १२ वीच्या विद्यार्थ्यांसाठी NMMSS आणि इतर केंद्रीय शिष्यवृत्ती.", hi: "९वीं से १२वीं के छात्रों के लिए NMMSS और अन्य केंद्रीय छात्रवृत्तियां।", en: "Learn how NMMSS provides Rs 12,000/year to rural secondary school students." },
                resource_url: "https://scholarships.gov.in",
                needs_verification: false
              }
            ]
          },
          {
            week_number: 4,
            title: { mr: "आठवडा ४ - वैयक्तिक उद्दिष्ट आणि कृती आराखडा", hi: "सप्ताह ४ - व्यक्तिगत लक्ष्य और कार्य योजना", en: "Week 4 - Action Plan & Goal Commitment" },
            steps: [
              {
                id: "ge_w4_s1",
                day: 25,
                estimated_minutes: 15,
                icon: "Target",
                title: { mr: "पुढील ६ महिन्यांचे एक मुख्य ध्येय ठरवा", hi: "अगले ६ महीने का एक मुख्य लक्ष्य तय करें", en: "Set One Primary 6-Month Objective" },
                description: { mr: "एका विशिष्ट कौशल्यात पारंगत होणे किंवा शिष्यवृत्ती परीक्षेची तयारी करणे.", hi: "किसी विशिष्ट हुनर में निपुण होना या किसी छात्रवृत्ति परीक्षा की तैयारी।", en: "Choose one trade certification or competitive exam to focus effort upon." },
                resource_url: null,
                needs_verification: true
              }
            ]
          }
        ]
      },
      months_3_to_6: {
        title: { mr: "३ ते ६ महिने - निवडलेल्या क्षेत्रातील अभ्यास", hi: "३ से ६ महीने - चुने गए क्षेत्र का अभ्यास", en: "3-6 Months - Structured Learning" },
        milestones: [
          {
            id: "ge_m3_1",
            title: { mr: "शिष्यवृत्ती किंवा प्रवेश परीक्षेचा अर्ज भरणे", hi: "छात्रवृत्ति या प्रवेश परीक्षा का आवेदन भरना", en: "Submit Scholarship or Entrance Application" },
            description: { mr: "योग्य तारखेच्या आत शाळा किंवा महा-ई-सेवा केंद्रातून अर्ज सादर करणे.", hi: "नियत तारीख से पूर्व स्कूल या महा-ई-सेवा केंद्र से फॉर्म जमा करना।", en: "Submit official application with verified documents before cutoff dates." },
            resource_url: "https://scholarships.gov.in",
            needs_verification: false,
            deadline: "2026-11-15",
            is_opportunity_milestone: true
          }
        ]
      },
      years_1_to_2: {
        title: { mr: "१ ते २ वर्षे - पदविका / शिकाऊ उमेदवारी पूर्ण करणे", hi: "१ से २ वर्ष - डिप्लोमा / शिक्षुता पूर्ण करना", en: "1-2 Years - Certification & Apprenticeship" },
        milestones: [
          {
            id: "ge_y1_1",
            title: { mr: "राष्ट्रीय कौशल्य पात्रता (NSQF) प्रमाणपत्र", hi: "राष्ट्रीय कौशल योग्यता (NSQF) प्रमाणन", en: "NSQF-Aligned Skill Certification" },
            description: { mr: "केंद्र सरकारच्या कौशल्य विकास मंत्रालयाचे अधिकृत स्तर-४ किंवा स्तर-५ प्रमाणपत्र.", hi: "कौशल विकास मंत्रालय का स्तर-४ या स्तर-५ का अधिकृत प्रमाणपत्र।", en: "Graduate with NSQF Level-4 industry-recognized credentials." },
            resource_url: "https://www.nsdcindia.org",
            needs_verification: false
          }
        ]
      }
    },
    vocational_alternative: {
      id: "alt_pm_vishwakarma_craft",
      title: { mr: "पीएम विश्वकर्मा पारंपरिक कारागीर व तंत्रज्ञान", hi: "पीएम विश्वकर्मा पारंपरिक शिल्पकार एवं कारीगरी", en: "PM Vishwakarma Traditional Craft & Modern Tools" },
      description: { mr: "सुतारकाम, वेल्डिंग, लोहारकाम किंवा चर्मोद्योगातील आधुनिक टूलकिट आणि कर्ज सहाय्य.", hi: "बढ़ईगीरी, वेल्डिंग, लोहारगिरी या शिल्पकार्य में आधुनिक टूलकिट और ऋण सुविधा।", en: "Modern power-tool training and collateral-free enterprise loan for artisanal trades." },
      resource_url: "https://pmvishwakarma.gov.in",
      needs_verification: false
    }
  }
};
