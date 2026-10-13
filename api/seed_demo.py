"""
Disha Demo Data Seeder (/api/seed_demo.py)
Creates an end-to-end reproducible demo environment:
1. Demo Facilitator: [DEMO] सौ. सुनिता पाटील (Sunita Patil) - Phone 9822000000
2. Demo Cohort: [DEMO] इयत्ता १० वी - कौशल्य विकास बॅच (Join Code: DEMO10)
3. 3 Students at Different Stages:
   - Student 1: [DEMO] राहुल शिंदे (Exploration / Early Discovery - 0 days completed)
   - Student 2: [DEMO] स्नेहल पवार (Mid-way Pathway - 15 days completed, Has Recommendation)
   - Student 3: [DEMO] आकाश कांबळे (Advanced - 26 days completed, Enrolled in Skill Course)
4. Demo Training Module: [DEMO] सौर ऊर्जा व सोलर पंप दुरुस्ती (Solar Pump Maintenance)

All demo data is strictly prefixed with [DEMO] for transparent labelling.
"""

import sys
import json
from pathlib import Path
from datetime import datetime, timezone

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from api.app.database import SessionLocal, init_db
from api.app.models import (
    Facilitator, Cohort, CohortMember, Student,
    Pathway, Recommendation, TrainingModule, ModuleEnrollment
)

def utc_now():
    return datetime.now(timezone.utc)

def seed_demo_data(db=None):
    """Purges prior [DEMO] records and inserts standard demo environment."""
    own_session = False
    if db is None:
        init_db()
        db = SessionLocal()
        own_session = True

    try:
        # 1. Clean existing demo data
        demo_fac_ids = [f.id for f in db.query(Facilitator).filter(Facilitator.phone_number == "9822000000").all()]
        demo_cohort_ids = [c.id for c in db.query(Cohort).filter(Cohort.join_code == "DEMO10").all()]

        if demo_fac_ids or demo_cohort_ids:
            # Delete memberships, enrollments, recommendations
            db.query(ModuleEnrollment).filter(ModuleEnrollment.module_id == "demo-module-001").delete(synchronize_session=False)
            db.query(TrainingModule).filter(TrainingModule.id == "demo-module-001").delete(synchronize_session=False)
            db.query(Recommendation).filter(Recommendation.id.in_(["demo-rec-001", "demo-rec-002"])).delete(synchronize_session=False)
            db.query(CohortMember).filter(CohortMember.cohort_id.in_(demo_cohort_ids)).delete(synchronize_session=False)
            db.query(Pathway).filter(Pathway.student_id.in_(["demo-student-001", "demo-student-002", "demo-student-003"])).delete(synchronize_session=False)
            db.query(Student).filter(Student.id.in_(["demo-student-001", "demo-student-002", "demo-student-003"])).delete(synchronize_session=False)
            db.query(Cohort).filter(Cohort.id.in_(demo_cohort_ids)).delete(synchronize_session=False)
            db.query(Facilitator).filter(Facilitator.id.in_(demo_fac_ids)).delete(synchronize_session=False)
            db.commit()

        # 2. Insert Demo Facilitator
        facilitator = Facilitator(
            id="demo-fac-001",
            name="[DEMO] सौ. सुनिता पाटील (Sunita Patil)",
            phone_number="9822000000",
            organization="[DEMO] जि. प. हायस्कूल व कौशल्य केंद्र, बारामती",
            role="TEACHER",
            state="Maharashtra",
            district="Pune",
            preferred_language="mr",
            is_verified=True,
            created_at=utc_now()
        )
        db.add(facilitator)

        # 3. Insert Demo Cohort (DEMO10)
        cohort = Cohort(
            id="demo-cohort-001",
            facilitator_id="demo-fac-001",
            name="[DEMO] इयत्ता १० वी - कौशल्य विकास बॅच",
            description="[DEMO] ग्रामीण तंत्रज्ञान व उपजीविका मार्गदर्शन गट",
            join_code="DEMO10",
            created_at=utc_now()
        )
        db.add(cohort)

        # 4. Insert Student 1: Early Exploration (0 ticks)
        s1 = Student(
            id="demo-student-001",
            name="[DEMO] राहुल शिंदे (Rahul Shinde)",
            preferred_language="mr",
            grade=10,
            state="Maharashtra",
            district="Pune",
            gender="MALE",
            age_years=16,
            guardian_consent=True,
            interests=json.dumps(["solar", "mechanic", "farming"]),
            skills=json.dumps(["hands_on", "troubleshooting"]),
            aspirations=json.dumps(["iti_technician"]),
            facilitator_id="demo-fac-001",
            created_at=utc_now()
        )
        db.add(s1)

        cm1 = CohortMember(
            id="demo-cm-001",
            cohort_id="demo-cohort-001",
            student_id="demo-student-001",
            nickname="[DEMO] राहुल (१०-अ)",
            joined_at=utc_now()
        )
        db.add(cm1)

        p1_steps = [
            {"day": i, "title": f"दिवस {i}: मूलभूत माहिती", "is_completed": False}
            for i in range(1, 31)
        ]
        p1 = Pathway(
            id="demo-path-001",
            student_id="demo-student-001",
            title="[DEMO] सौर व कृषी तंत्रज्ञ करिअर मार्ग (Solar Career Path)",
            career_goal="सोलर तंत्रज्ञ व कृषी उपकरणे दुरुस्ती",
            is_vocational=True,
            micro_steps_json=json.dumps(p1_steps),
            competitive_exams_json=json.dumps(["ITI Entrance Examination"]),
            estimated_days=30,
            status="ACTIVE",
            created_at=utc_now()
        )
        db.add(p1)

        # 5. Insert Student 2: Mid-way Active (15 days ticked)
        s2 = Student(
            id="demo-student-002",
            name="[DEMO] स्नेहल पवार (Snehal Pawar)",
            preferred_language="mr",
            grade=12,
            state="Maharashtra",
            district="Pune",
            gender="FEMALE",
            age_years=17,
            guardian_consent=True,
            interests=json.dumps(["healthcare", "nursing", "veterinary"]),
            skills=json.dumps(["biology", "empathy", "record_keeping"]),
            aspirations=json.dumps(["anm_nursing", "dairy_supervisor"]),
            facilitator_id="demo-fac-001",
            created_at=utc_now()
        )
        db.add(s2)

        cm2 = CohortMember(
            id="demo-cm-002",
            cohort_id="demo-cohort-001",
            student_id="demo-student-002",
            nickname="[DEMO] स्नेहल (१२-ब)",
            joined_at=utc_now()
        )
        db.add(cm2)

        p2_steps = [
            {"day": i, "title": f"दिवस {i}: आरोग्य सहाय्यक अभ्यास", "is_completed": i <= 15}
            for i in range(1, 31)
        ]
        p2 = Pathway(
            id="demo-path-002",
            student_id="demo-student-002",
            title="[DEMO] ग्रामीण आरोग्य व दुग्ध तंत्रज्ञान (Healthcare & Dairy)",
            career_goal="आरोग्य सेविका व पशुवैद्यकीय सहाय्यक",
            is_vocational=True,
            micro_steps_json=json.dumps(p2_steps),
            competitive_exams_json=json.dumps(["Maharashtra ANM/GNM CET"]),
            estimated_days=30,
            status="ACTIVE",
            created_at=utc_now()
        )
        db.add(p2)

        # Recommendation for Student 2
        rec2 = Recommendation(
            id="demo-rec-002",
            facilitator_id="demo-fac-001",
            student_id="demo-student-002",
            opportunity_id="opp_dairy_nddb_vocational",
            opportunity_title="दुग्ध व्यवसाय व डेअरी फार्मिंग प्रशिक्षण (NDDB Dairy)",
            note="स्नेहल, तुझ्या जीवशास्त्राच्या आवडीनुसार हे प्रशिक्षण अत्यंत उपयुक्त आहे. अर्ज कर.",
            created_at=utc_now()
        )
        db.add(rec2)

        # 6. Insert Student 3: Advanced Stage (26 days ticked + Enrolled in Course)
        s3 = Student(
            id="demo-student-003",
            name="[DEMO] आकाश कांबळे (Akash Kamble)",
            preferred_language="mr",
            grade=11,
            state="Maharashtra",
            district="Pune",
            gender="MALE",
            age_years=18,
            guardian_consent=True,
            interests=json.dumps(["it", "electronics", "hardware"]),
            skills=json.dumps(["computer_repairs", "soldering", "networking"]),
            aspirations=json.dumps(["hardware_technician", "csc_center"]),
            facilitator_id="demo-fac-001",
            created_at=utc_now()
        )
        db.add(s3)

        cm3 = CohortMember(
            id="demo-cm-003",
            cohort_id="demo-cohort-001",
            student_id="demo-student-003",
            nickname="[DEMO] आकाश (११-क)",
            joined_at=utc_now()
        )
        db.add(cm3)

        p3_steps = [
            {"day": i, "title": f"दिवस {i}: हार्डवेअर प्रात्यक्षिक", "is_completed": i <= 26}
            for i in range(1, 31)
        ]
        p3 = Pathway(
            id="demo-path-003",
            student_id="demo-student-003",
            title="[DEMO] कॉम्प्युटर हार्डवेअर व डिजिटल सेवा (IT Hardware Path)",
            career_goal="संगणक हार्डवेअर तंत्रज्ञ व सीएससी चालक",
            is_vocational=True,
            micro_steps_json=json.dumps(p3_steps),
            competitive_exams_json=json.dumps(["MS-CIT", "ITI IT Hardware"]),
            estimated_days=30,
            status="ACTIVE",
            created_at=utc_now()
        )
        db.add(p3)

        # 7. Demo Training Module authored by demo facilitator
        module = TrainingModule(
            id="demo-module-001",
            facilitator_id="demo-fac-001",
            title="[DEMO] सौर ऊर्जा व सोलर पंप दुरुस्ती (Solar Pump Maintenance)",
            description="[DEMO] ग्रामीण भागात शेतीसाठी सोलर पंप बसवणे, वायरिंग आणि नियमित देखभाल प्रात्यक्षिक कोर्स.",
            language="mr",
            price_type="ONE_TIME",
            price_inr=200.0,
            steps_json=json.dumps([
                {
                    "step_number": 1,
                    "title": "सुरक्षा साधने व सोलर पॅनेल तपासणी",
                    "content": "सोलर प्लेट्सची स्वच्छता, अँगल ऍडजस्टमेंट आणि व्होल्टमीटर चाचणी.",
                    "practical_task": "मल्टीमीटरच्या सहाय्याने ओपन सर्किट व्होल्टेज मोजा."
                },
                {
                    "step_number": 2,
                    "title": "सोलर इन्व्हर्टर व कंट्रोलर वायरिंग",
                    "content": "एमसी४ कनेक्टर्स, डीसी एमसीबी आणि कंट्रोलर जोडणी पद्धत.",
                    "practical_task": "कंट्रोलरचे इंडिकेटर लाइट्स तपासून फॉल्ट ओळखा."
                },
                {
                    "step_number": 3,
                    "title": "सबमर्सिबल पंप जोडणी व फ्लो टेस्ट",
                    "content": "मोटर वाइंडिंग रेझिस्टन्स तपासणे व पाण्याचा प्रवाह मोजणे.",
                    "practical_task": "पंप सुरू करून प्रति मिनिट पाणी प्रवाह नोंदवा."
                }
            ]),
            is_published=True,
            created_at=utc_now()
        )
        db.add(module)

        # 8. Student 3 is enrolled in the training module (Mock Payment)
        enrollment = ModuleEnrollment(
            id="demo-enroll-001",
            module_id="demo-module-001",
            student_id="demo-student-003",
            amount_paid=200.0,
            platform_fee_inr=24.0,       # 12%
            facilitator_share_inr=176.0,  # 88%
            payment_status="PAID_MOCK",
            enrolled_at=utc_now()
        )
        db.add(enrollment)

        db.commit()

        return {
            "facilitator_id": facilitator.id,
            "facilitator_phone": facilitator.phone_number,
            "cohort_id": cohort.id,
            "join_code": cohort.join_code,
            "student_ids": [s1.id, s2.id, s3.id],
            "module_id": module.id
        }
    finally:
        if own_session:
            db.close()

def main():
    print("[SEED] Seeding Disha Demo Environment...")
    res = seed_demo_data()
    print("[OK] Demo environment successfully created!")
    print(f"Facilitator: {res['facilitator_phone']} (Join code: {res['join_code']})")
    print(f"Students: {res['student_ids']}")
    print(f"Course Module: {res['module_id']}")

if __name__ == "__main__":
    main()
