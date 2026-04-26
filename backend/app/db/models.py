"""SQLAlchemy ORM models matching the PostGIS schema in scripts/schema.sql."""
from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, CheckConstraint, Column, Float, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class StreetEdge(Base):
    __tablename__ = "street_edges"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_node = Column(BigInteger, nullable=False, index=True)
    target_node = Column(BigInteger, nullable=False, index=True)
    osm_id = Column(BigInteger)
    name = Column(String(200))
    length_m = Column(Float, nullable=False)
    climate_score = Column(Float, nullable=False)
    heat_score = Column(Float, nullable=False)
    flood_score = Column(Float, nullable=False)
    canopy_pct = Column(Float, nullable=False)
    geometry = Column(Geometry("LINESTRING", srid=4326), nullable=False)


class ClimateHVI(Base):
    __tablename__ = "climate_hvi"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nta_code = Column(String(10), nullable=False)
    nta_name = Column(String(100))
    hvi_rank = Column(Integer, nullable=False)
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)
    __table_args__ = (CheckConstraint("hvi_rank BETWEEN 1 AND 5"),)


class ClimateCanopy(Base):
    __tablename__ = "climate_canopy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    canopy_pct = Column(Float, nullable=False)
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)


class ClimateFlood(Base):
    __tablename__ = "climate_flood"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fld_zone = Column(String(10), nullable=False)
    risk_score = Column(Float, nullable=False)
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)
