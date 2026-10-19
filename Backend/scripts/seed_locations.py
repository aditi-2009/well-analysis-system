"""
scripts/seed_locations.py

Seed Maharashtra state/district/taluka/village hierarchy into database.
This is a one-time script (idempotent — safe to run multiple times).

Run:
    python scripts/seed_locations.py
"""

import logging

# from sqlalchemy.orm import Session

# from app.db.base import engine
from app.db.session import SessionLocal
from app.db.models.state import State
from app.db.models.district import District
from app.db.models.taluka import Taluka
from app.db.models.village import Village

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Maharashtra data: State → Districts → Talukas → Villages
MAHARASHTRA_DATA = {
    "state": {
        "name": "Maharashtra",
        "code": "MH",
    },
    "districts": [
        {
            "name": "Wardha",
            "code": "WD",
            "talukas": [
                {
                    "name": "Wardha",
                    "code": "WD-01",
                    "villages": [
                        {
                            "name": "Arvi",
                            "population": 5000,
                            "area_km2": 45.2,
                        },
                        {
                            "name": "Deoli",
                            "population": 3500,
                            "area_km2": 32.1,
                        },
                        {
                            "name": "Pulgaon",
                            "population": 4200,
                            "area_km2": 38.5,
                        },
                    ],
                },
                {
                    "name": "Hinganghat",
                    "code": "WD-02",
                    "villages": [
                        {
                            "name": "Hinganghat",
                            "population": 6000,
                            "area_km2": 50.0,
                        },
                        {
                            "name": "Karanja",
                            "population": 2500,
                            "area_km2": 25.0,
                        },
                    ],
                },
                {
                    "name": "Ashti",
                    "code": "WD-03",
                    "villages": [
                        {
                            "name": "Ashti",
                            "population": 4000,
                            "area_km2": 42.0,
                        },
                    ],
                },
            ],
        },
        {
            "name": "Nagpur",
            "code": "NG",
            "talukas": [
                {
                    "name": "Nagpur",
                    "code": "NG-01",
                    "villages": [
                        {
                            "name": "Nagpur City",
                            "population": 100000,
                            "area_km2": 220.0,
                        },
                    ],
                },
                {
                    "name": "Saoner",
                    "code": "NG-02",
                    "villages": [
                        {
                            "name": "Saoner",
                            "population": 8000,
                            "area_km2": 65.0,
                        },
                    ],
                },
            ],
        },
        {
            "name": "Yavatmal",
            "code": "YV",
            "talukas": [
                {
                    "name": "Yavatmal",
                    "code": "YV-01",
                    "villages": [
                        {
                            "name": "Yavatmal",
                            "population": 12000,
                            "area_km2": 85.0,
                        },
                    ],
                },
            ],
        },
    ],
}


def seed_locations():
    """
    Idempotently seed location hierarchy.
    Safe to run multiple times — uses get_or_create pattern.
    """
    db = SessionLocal()

    try:
        # STEP 1: Create/get State
        state_name = MAHARASHTRA_DATA["state"]["name"]
        state = db.query(State).filter(State.name == state_name).first()

        if not state:
            state = State(
                name=state_name,
                code=MAHARASHTRA_DATA["state"]["code"],
            )
            db.add(state)
            db.commit()
            db.refresh(state)
            logger.info(f"Created State: {state.name} (id={state.id})")
        else:
            logger.info(f"State already exists: {state.name}")

        # STEP 2: Create/get Districts
        for district_data in MAHARASHTRA_DATA["districts"]:
            district_name = district_data["name"]
            district = db.query(District).filter(District.name == district_name).first()

            if not district:
                district = District(
                    name=district_name,
                    state_id=state.id,
                    code=district_data.get("code"),
                )
                db.add(district)
                db.commit()
                db.refresh(district)
                logger.info(f"Created District: {district.name} " f"(id={district.id})")
            else:
                logger.info(f"District already exists: {district.name}")

            # STEP 3: Create/get Talukas
            for taluka_data in district_data["talukas"]:
                taluka_name = taluka_data["name"]
                taluka = db.query(Taluka).filter(Taluka.name == taluka_name).first()

                if not taluka:
                    taluka = Taluka(
                        name=taluka_name,
                        district_id=district.id,
                        code=taluka_data.get("code"),
                    )
                    db.add(taluka)
                    db.commit()
                    db.refresh(taluka)
                    logger.info(f" Created Taluka: {taluka.name} " f"(id={taluka.id})")
                else:
                    logger.info(f" Taluka already exists: {taluka.name}")

                # STEP 4: Create/get Villages
                for village_data in taluka_data["villages"]:
                    village_name = village_data["name"]
                    village = (
                        db.query(Village).filter(Village.name == village_name).first()
                    )

                    if not village:
                        village = Village(
                            name=village_name,
                            taluka_id=taluka.id,
                            district_id=district.id,
                            state_id=state.id,
                            population=village_data.get("population"),
                            area_km2=village_data.get("area_km2"),
                        )
                        db.add(village)
                        db.commit()
                        db.refresh(village)
                        logger.info(
                            f" Created Village: {village.name} " f"(id={village.id})"
                        )
                    else:
                        logger.info(
                            f"      ⏭️  Village already exists: " f"{village.name}"
                        )

        logger.info("\n Seeding complete!")

    except Exception as e:
        logger.error(f"Seeding failed: {e}", exc_info=True)
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_locations()
