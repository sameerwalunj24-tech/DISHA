import re
from typing import Dict, Any, List
from api.app.ai.base import BaseLLMAdapter
from api.app.ai.schemas import StructuredProfile

class MockLLMAdapter(BaseLLMAdapter):
    @property
    def provider_name(self) -> str:
        return "mock"

    async def extract_profile(self, answers: Dict[str, Any]) -> StructuredProfile:
        """
        Deterministic multilingual keyword parser for rural profiling.
        Works across Marathi, Hindi, and English without any external network call.
        """
        combined_text = " ".join(str(v) for v in answers.values()).lower()
        
        # 1. Grade detection
        grade_val = 10
        grade_raw = str(answers.get("q_grade", answers.get("grade", ""))).lower()
        if "९" in grade_raw or "9" in grade_raw:
            grade_val = 9
        elif "११" in grade_raw or "11" in grade_raw:
            grade_val = 11
        elif "१२" in grade_raw or "12" in grade_raw:
            grade_val = 12
        elif "आयटीआय" in grade_raw or "iti" in grade_raw or "डिप्लोमा" in grade_raw or "diploma" in grade_raw:
            grade_val = 12
        elif "कॉलेज" in grade_raw or "पदवी" in grade_raw or "स्नातक" in grade_raw or "degree" in grade_raw or "college" in grade_raw:
            grade_val = 14
        elif "१०" in grade_raw or "10" in grade_raw:
            grade_val = 10

        # 2. Location detection
        district_val = "Satara"
        loc_raw = str(answers.get("q_location", answers.get("state_district", "")))
        known_districts = ["Satara", "सातारा", "Pune", "पुणे", "Nashik", "नाशिक", 
                           "Kolhapur", "कोल्हापूर", "Sambhajinagar", "संभाजीनगर", "Sangli", "सांगली"]
        for d in known_districts:
            if d.lower() in loc_raw.lower():
                district_val = d
                break

        # 3. Interest & Practical Skills Keyword Mapping
        interests: List[str] = []
        skills: List[str] = []
        aspirations: List[str] = []
        is_vocational = True

        # Solar & Electric
        if any(w in combined_text for w in ["सोलर", "solar", "पंप", "pump", "विद्युत", "वीज", "इलेक्ट्रिक", "electric", "wiring", "यंत्र"]):
            interests.append("Solar & Renewable Energy")
            skills.append("Solar PV & Pump Assembly")
            aspirations.append("Certified Solar Pump Technician")

        # Farming & Dairy
        if any(w in combined_text for w in ["शेती", "farming", "कृषी", "agriculture", "दूध", "dairy", "दुग्ध", "पशुपालन", "झाडे"]):
            interests.append("Modern Agriculture & Dairy")
            skills.append("Organic Farm Management & Animal Husbandry")
            aspirations.append("Agri-Entrepreneur / Dairy Producer")

        # Healthcare & Nursing
        if any(w in combined_text for w in ["आरोग्य", "health", "नर्स", "nurse", "दवाखाना", "hospital", "मदत"]):
            interests.append("Community Healthcare")
            skills.append("First Aid & Paramedic Assistance")
            aspirations.append("Community Health Worker (ASHA/ANM)")

        # Mechanics & Transport & ITI
        if any(w in combined_text for w in ["मोटार", "वाहने", "गॅरेज", "दुरुस्ती", "mechanic", "गाडी", "ड्रायव्हिंग", "रेल्वे", "railway"]):
            interests.append("Mechanical Systems & Automotive")
            skills.append("Vehicle Engine Diagnostics")
            aspirations.append("Railway / State Transport Apprentice")

        # Computers & Digital
        if any(w in combined_text for w in ["संगणक", "computer", "फोन", "मोबाईल", "mobile", "डेटा", "data", "ऑनलाइन"]):
            interests.append("Digital Services & Computing")
            skills.append("Basic IT & Online Services Management")
            aspirations.append("Village CSC Operator / Banking Correspondent")

        # Fallback defaults if no specific keywords hit
        if not interests:
            interests = ["Vocational Skills & Local Livelihoods"]
            skills = ["Practical Workshop & Hand Tools"]
            aspirations = ["Technical Apprentice & Skilled Technician"]

        # 4. Mobility preference
        mobility_raw = str(answers.get("q_mobility", answers.get("mobility", ""))).lower()
        mobility = "DISTRICT"
        if any(w in mobility_raw for w in ["गाव", "गाँव", "घर", "village", "local", "जवळ"]):
            mobility = "LOCAL"
        elif any(w in mobility_raw for w in ["पुणे", "मुंबई", "कुठेही", "state", "city", "anywhere"]):
            mobility = "STATE_WIDE"

        # 5. Family context
        fam_raw = str(answers.get("q_family_work", answers.get("family_work", "Agriculture & Local Crafts")))

        return StructuredProfile(
            grade_level=grade_val,
            state="Maharashtra",
            district=district_val,
            primary_interests=interests[:3],
            practical_skills=skills[:3],
            career_aspirations=aspirations[:2],
            is_vocational_recommended=is_vocational,
            mobility_preference=mobility,
            family_livelihood_context=fam_raw,
            confidence_score=0.92
        )
