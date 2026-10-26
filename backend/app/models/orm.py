"""
SQLAlchemy models for PRISM.

Schema mirrors the architecture in the pitch deck: datasets -> observations,
investigations -> hypotheses -> evidence_items, with every evidence item
pointing back at the dataset it came from so every claim stays traceable to
a source record.
"""
from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    publisher = Column(String, nullable=False)
    licence = Column(String, nullable=False)
    coverage = Column(String, nullable=False)
    cadence = Column(String, nullable=False)
    status = Column(String, nullable=False, default="planned")  # connected | planned
    record_count = Column(Integer, default=0)
    description = Column(Text, default="")
    is_synthetic = Column(Integer, default=1)  # 1 = demo/synthetic, 0 = real ingested data

    observations = relationship("Observation", back_populates="dataset")


class Observation(Base):
    """A single reading, shaped like a real CPCB/IMD/WRIS record."""

    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String, ForeignKey("datasets.id"))
    station_id = Column(String, nullable=False)
    station_name = Column(String, nullable=False)
    parameter = Column(String, nullable=False)  # e.g. "AQI", "rainfall_mm", "discharge_cumecs"
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_synthetic = Column(Integer, default=1)

    dataset = relationship("Dataset", back_populates="observations")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    location = Column(String, nullable=False)
    opened_from = Column(String, nullable=False)
    status_note = Column(String, nullable=False)

    hypotheses = relationship("Hypothesis", back_populates="investigation")


class Hypothesis(Base):
    __tablename__ = "hypotheses"

    id = Column(String, primary_key=True)
    investigation_id = Column(String, ForeignKey("investigations.id"))
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    assumptions = Column(Text, default="[]")  # JSON-encoded list
    recommended_check = Column(Text, default="")

    investigation = relationship("Investigation", back_populates="hypotheses")
    evidence = relationship("EvidenceItem", back_populates="hypothesis")


class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(String, primary_key=True)
    hypothesis_id = Column(String, ForeignKey("hypotheses.id"))
    dataset_id = Column(String, ForeignKey("datasets.id"))
    text = Column(Text, nullable=False)
    stance = Column(String, nullable=False)  # supports | contradicts | gap

    hypothesis = relationship("Hypothesis", back_populates="evidence")
