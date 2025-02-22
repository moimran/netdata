from sqlmodel import Session, select
from typing import Generic, TypeVar, Type, List, Optional
from .models import (
    Region, SiteGroup, Site, Location, VRF, RIR,
    Aggregate, Role, Prefix, IPRange, IPAddress
)

ModelType = TypeVar("ModelType")

class CRUDBase(Generic[ModelType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def get_all(self, session: Session, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return session.exec(select(self.model).offset(skip).limit(limit)).all()

    def get_by_id(self, session: Session, id: int) -> Optional[ModelType]:
        return session.get(self.model, id)

    def create(self, session: Session, obj_in: ModelType) -> ModelType:
        session.add(obj_in)
        session.commit()
        session.refresh(obj_in)
        return obj_in

    def update(self, session: Session, db_obj: ModelType, obj_in: ModelType) -> ModelType:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            if hasattr(db_obj, field):
                setattr(db_obj, field, update_data[field])
        session.add(db_obj)
        session.commit()
        session.refresh(db_obj)
        return db_obj

    def delete(self, session: Session, db_obj: ModelType) -> None:
        session.delete(db_obj)
        session.commit()

# Create CRUD instances for all models
region = CRUDBase(Region)
site_group = CRUDBase(SiteGroup)
site = CRUDBase(Site)
location = CRUDBase(Location)
vrf = CRUDBase(VRF)
rir = CRUDBase(RIR)
aggregate = CRUDBase(Aggregate)
role = CRUDBase(Role)
prefix = CRUDBase(Prefix)
ip_range = CRUDBase(IPRange)
ip_address = CRUDBase(IPAddress)
