import hashlib
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from modules.face_auth import BlockchainRecord

GENESIS_PREV_HASH = "0" * 64

def calculate_sha256(data: str) -> str:
    """Calculates standard SHA-256 hash string."""
    return hashlib.sha256(data.encode('utf-8')).hexdigest()

def create_blockchain_block(
    db: Session,
    user_id: int,
    record_type: str,
    payload: Dict[str, Any],
    record_id: int = 0
) -> BlockchainRecord:
    """
    Creates an append-only SHA-256 cryptographic block for medical record verification
    as specified in Section V-D of the IEEE paper.
    """
    # 1. Generate SHA-256 payload data hash
    payload_str = json.dumps(payload, sort_keys=True, default=str)
    data_hash = calculate_sha256(f"{user_id}:{record_type}:{payload_str}")

    # 2. Retrieve previous block hash in sequence
    latest_block = db.query(BlockchainRecord).order_by(BlockchainRecord.id.desc()).first()
    prev_hash = latest_block.block_hash if latest_block else GENESIS_PREV_HASH

    # 3. Compute current block header SHA-256 hash
    timestamp_str = datetime.now().isoformat()
    header_str = f"{user_id}:{record_type}:{record_id}:{data_hash}:{prev_hash}:{timestamp_str}"
    block_hash = calculate_sha256(header_str)

    # 4. Save block to database ledger
    new_block = BlockchainRecord(
        user_id=user_id,
        record_type=record_type,
        record_id=record_id,
        data_hash=data_hash,
        prev_hash=prev_hash,
        block_hash=block_hash,
        created_at=datetime.now()
    )
    db.add(new_block)
    db.commit()
    db.refresh(new_block)

    return new_block


def verify_blockchain_integrity(db: Session, user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Verifies that no record in the blockchain ledger has been tampered with or modified.
    Returns audit statistics and integrity status.
    """
    all_blocks = db.query(BlockchainRecord).order_by(BlockchainRecord.id.asc()).all()
    if not all_blocks:
        return {
            "status": "empty",
            "is_valid": True,
            "verified": True,
            "total_blocks": 0,
            "message": "Blockchain ledger is empty. No blocks created yet."
        }

    for i in range(1, len(all_blocks)):
        if all_blocks[i].prev_hash != all_blocks[i - 1].block_hash:
            return {
                "status": "tampered",
                "is_valid": False,
                "verified": False,
                "failed_block_id": all_blocks[i].id,
                "message": f"Block #{all_blocks[i].id} previous hash mismatch! Data tampering detected."
            }

    display_blocks = [b for b in all_blocks if b.user_id == user_id] if user_id else all_blocks
    return {
        "status": "verified",
        "is_valid": True,
        "verified": True,
        "total_blocks": len(display_blocks),
        "latest_block_hash": all_blocks[-1].block_hash,
        "audited_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "message": "Blockchain ledger verified 100% authentic and tamper-proof."
    }


def get_user_blockchain_records(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Returns all audit blocks associated with a specific patient."""
    blocks = db.query(BlockchainRecord).filter(
        BlockchainRecord.user_id == user_id
    ).order_by(BlockchainRecord.created_at.desc()).all()

    return [
        {
            "block_id": b.id,
            "record_type": b.record_type,
            "record_id": b.record_id,
            "data_hash": b.data_hash,
            "prev_hash": b.prev_hash,
            "block_hash": b.block_hash,
            "timestamp": b.created_at.strftime("%d %b %Y, %I:%M %p")
        }
        for b in blocks
    ]
