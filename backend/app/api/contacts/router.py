from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.contact import ContactAdd, ContactBlock, ContactResponse
from app.repositories import user as user_repo
from app.repositories import contact as contact_repo

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("", response_model=List[ContactResponse])
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return contact_repo.get_user_contacts(db, current_user.id)

@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_new_contact(
    contact_in: ContactAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find contact user by username or phone
    target_user = user_repo.get_user_by_identifier(db, contact_in.identifier)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with specified phone or username."
        )
        
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add yourself as a contact."
        )
        
    # Check if already contact
    existing = contact_repo.get_contact_by_users(db, current_user.id, target_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This contact already exists."
        )
        
    # Add contact
    contact = contact_repo.add_contact(db, current_user.id, target_user.id, contact_in.nickname)
    # Re-fetch with loaded relationship
    return contact_repo.get_contact_by_users(db, current_user.id, target_user.id)

@router.post("/demo-import", status_code=status.HTTP_200_OK)
def import_demo_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    demo_phones = ["+91 9000000001", "+91 9000000002", "+91 9000000003", "+91 9000000004", "+91 9000000005"]
    imported_count = 0
    for phone in demo_phones:
        user = user_repo.get_user_by_identifier(db, phone)
        if user and user.id != current_user.id:
            existing = contact_repo.get_contact_by_users(db, current_user.id, user.id)
            if not existing:
                contact_repo.add_contact(db, current_user.id, user.id)
                imported_count += 1
    return {"detail": f"Successfully imported {imported_count} demo contacts."}

@router.delete("/{contact_user_id}", status_code=status.HTTP_200_OK)
def delete_contact(
    contact_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = contact_repo.delete_contact(db, current_user.id, contact_user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact connection not found."
        )
    return {"detail": "Contact removed successfully."}

@router.post("/block", response_model=ContactResponse)
def block_contact(
    block_in: ContactBlock,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contact = contact_repo.update_block_status(db, current_user.id, block_in.contact_user_id, block_in.is_blocked)
    if not contact:
        # Create a contact reference to block them even if not in contact list
        contact = contact_repo.add_contact(db, current_user.id, block_in.contact_user_id)
        contact = contact_repo.update_block_status(db, current_user.id, block_in.contact_user_id, block_in.is_blocked)
    return contact
