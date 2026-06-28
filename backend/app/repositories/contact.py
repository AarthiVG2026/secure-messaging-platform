from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.user import Contact

def get_user_contacts(db: Session, user_id: str) -> List[Contact]:
    return db.query(Contact).filter(
        Contact.user_id == user_id
    ).options(joinedload(Contact.contact_user)).all()

def get_contact_by_users(db: Session, user_id: str, contact_user_id: str) -> Optional[Contact]:
    return db.query(Contact).filter(
        Contact.user_id == user_id,
        Contact.contact_user_id == contact_user_id
    ).first()

def add_contact(db: Session, user_id: str, contact_user_id: str, nickname: Optional[str] = None) -> Contact:
    db_contact = get_contact_by_users(db, user_id, contact_user_id)
    if not db_contact:
        db_contact = Contact(user_id=user_id, contact_user_id=contact_user_id, nickname=nickname)
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
    else:
        if nickname and db_contact.nickname != nickname:
            db_contact.nickname = nickname
            db.commit()
            db.refresh(db_contact)
    return db_contact

def delete_contact(db: Session, user_id: str, contact_user_id: str) -> bool:
    db_contact = get_contact_by_users(db, user_id, contact_user_id)
    if db_contact:
        db.delete(db_contact)
        db.commit()
        return True
    return False

def update_block_status(db: Session, user_id: str, contact_user_id: str, is_blocked: bool) -> Optional[Contact]:
    db_contact = get_contact_by_users(db, user_id, contact_user_id)
    if db_contact:
        db_contact.is_blocked = is_blocked
        db.commit()
        db.refresh(db_contact)
        return db_contact
    return None
