"""
db/repository/statistics_repository.py

Aggregation queries. Wells are linked to the hierarchy by NAME
(Well.village == Village.name). This is a stop-gap: the proper fix is
village_id foreign keys on Well, filled by a point-in-polygon step.
"""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.district import District
from app.db.models.prediction import Prediction
from app.db.models.taluka import Taluka
from app.db.models.village import Village
from app.db.models.well import Well


def _avg(value) -> float:
    return round(float(value or 0), 3)


class StatisticsRepository:
    @staticmethod
    def count_wells_by_village(db: Session) -> list[dict]:
        rows = (
            db.query(
                Village.id,
                Village.name,
                func.count(Well.id).label("well_count"),
                func.avg(Well.confidence).label("avg_confidence"),
            )
            .outerjoin(Well, Well.village == Village.name)
            .group_by(Village.id, Village.name)
            .order_by(Village.name)
            .all()
        )
        return [
            {
                "village_id": r.id,
                "village_name": r.name,
                "well_count": r.well_count,
                "avg_confidence": _avg(r.avg_confidence),
            }
            for r in rows
        ]

    @staticmethod
    def count_wells_by_taluka(db: Session) -> list[dict]:
        rows = (
            db.query(
                Taluka.id,
                Taluka.name,
                func.count(Well.id).label("well_count"),
                func.count(func.distinct(Village.id)).label("village_count"),
            )
            .outerjoin(Village, Village.taluka_id == Taluka.id)
            .outerjoin(Well, Well.village == Village.name)
            .group_by(Taluka.id, Taluka.name)
            .order_by(Taluka.name)
            .all()
        )
        return [
            {
                "taluka_id": r.id,
                "taluka_name": r.name,
                "well_count": r.well_count,
                "village_count": r.village_count,
            }
            for r in rows
        ]

    @staticmethod
    def count_wells_by_district(db: Session) -> list[dict]:
        rows = (
            db.query(
                District.id,
                District.name,
                func.count(Well.id).label("well_count"),
                func.count(func.distinct(Taluka.id)).label("taluka_count"),
            )
            .outerjoin(Taluka, Taluka.district_id == District.id)
            .outerjoin(Village, Village.taluka_id == Taluka.id)
            .outerjoin(Well, Well.village == Village.name)
            .group_by(District.id, District.name)
            .order_by(District.name)
            .all()
        )
        return [
            {
                "district_id": r.id,
                "district_name": r.name,
                "well_count": r.well_count,
                "taluka_count": r.taluka_count,
            }
            for r in rows
        ]

    @staticmethod
    def overall_statistics(db: Session) -> dict:
        total_wells = db.query(func.count(Well.id)).scalar() or 0
        total_runs = (
            db.query(func.count(Prediction.prediction_id))
            .filter(Prediction.status != "deleted")
            .scalar()
            or 0
        )
        avg_conf = db.query(func.avg(Well.confidence)).scalar()
        earliest = db.query(func.min(Well.detected_on)).scalar()
        latest = db.query(func.max(Well.detected_on)).scalar()

        return {
            "total_wells_detected": total_wells,
            "total_predictions_run": total_runs,
            "average_detection_confidence": _avg(avg_conf),
            "earliest_detection": earliest.isoformat() if earliest else None,
            "latest_detection": latest.isoformat() if latest else None,
        }
