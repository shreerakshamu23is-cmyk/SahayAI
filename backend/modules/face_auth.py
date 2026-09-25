from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, Text, ForeignKey
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    language = Column(String, default="english")
    face_encoding = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    raw_text = Column(Text, nullable=True)
    medicines_json = Column(Text, nullable=True)
    speech_text = Column(Text, nullable=True)
    block_hash = Column(String, nullable=True)
    scanned_at = Column(DateTime, default=datetime.now)

class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    document_type = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    block_hash = Column(String, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.now)

class BlockchainRecord(Base):
    __tablename__ = "blockchain_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    record_type = Column(String, default="prescription")
    record_id = Column(Integer, nullable=True)
    data_hash = Column(String, nullable=False)
    prev_hash = Column(String, nullable=False)
    block_hash = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.now)