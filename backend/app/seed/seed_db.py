from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.db.session import engine, Base, SessionLocal
from app.models.user import User, Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageStatus, MessageReaction
from app.core.security import get_password_hash

def seed():
    print("Dropping tables and rebuilding database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        print("Seeding Users...")
        users_data = [
            {"phone": "+91 9000000004", "username": "divya", "display_name": "Divya Sharma", "bio": "Security first. 🔐", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Divya"},
            {"phone": "+91 9000000003", "username": "kevin", "display_name": "Kevin Thomas", "bio": "Let's encrypt everything!", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin"},
            {"phone": "+3333333333", "username": "ram", "display_name": "Ram Kumar", "bio": "Writing code in Python 🐍", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ram"},
            {"phone": "+91 9000000002", "username": "priya", "display_name": "Priya Patel", "bio": "Signal is awesome.", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"},
            {"phone": "+91 9000000005", "username": "rahul", "display_name": "Rahul Singh", "bio": "Zustand + React Query = 🚀", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"},
            {"phone": "+6666666666", "username": "sneha", "display_name": "Sneha Reddy", "bio": "Focus on the goal.", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha"},
            {"phone": "+91 9000000001", "username": "amit", "display_name": "Amit Desai", "bio": "First compiler designer! 💻", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit"}
        ]
        
        users = []
        password_h = get_password_hash("password123")
        for u in users_data:
            user = User(
                phone=u["phone"],
                username=u["username"],
                display_name=u["display_name"],
                bio=u["bio"],
                avatar_url=u["avatar"],
                password_hash=password_h
            )
            db.add(user)
            users.append(user)
            
        db.commit()
        for u in users:
            db.refresh(u)
            
        divya, kevin, ram, priya, rahul, sneha, amit = users
        
        print("Seeding Contacts...")
        contacts_to_create = [
            (divya, kevin), (divya, ram), (divya, priya), (divya, rahul),
            (kevin, divya), (kevin, ram), (kevin, rahul),
            (ram, divya), (ram, kevin), (ram, priya),
            (divya, sneha), (kevin, amit)
        ]
        for owner, contact_user in contacts_to_create:
            contact = Contact(user_id=owner.id, contact_user_id=contact_user.id, is_blocked=False)
            db.add(contact)
        db.commit()
        
        print("Seeding Group Conversations...")
        groups_data = [
            {"name": "Development Team", "desc": "Design discussions for our new application.", "creator": divya, "members": [divya, kevin, ram, rahul]},
            {"name": "Weekend Plans", "desc": "Hiking or beach this Saturday?", "creator": kevin, "members": [divya, kevin, priya]},
            {"name": "Signal Fans", "desc": "Privacy and cryptography discussion group.", "creator": ram, "members": [ram, priya, rahul]},
            {"name": "Family Chat", "desc": "Keep in touch with family.", "creator": divya, "members": [divya, priya]},
            {"name": "Book Club", "desc": "Reading list and meeting schedule.", "creator": rahul, "members": [divya, kevin, ram, priya, rahul]}
        ]
        
        conversations = []
        
        for g in groups_data:
            conv = Conversation(
                is_group=True,
                name=g["name"],
                description=g["desc"],
                avatar_url=f"https://api.dicebear.com/7.x/identicon/svg?seed={g['name'].replace(' ', '')}"
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
            
            db.add(ConversationMember(conversation_id=conv.id, user_id=g["creator"].id, is_admin=True))
            for m in g["members"]:
                if m.id != g["creator"].id:
                    db.add(ConversationMember(conversation_id=conv.id, user_id=m.id, is_admin=False))
                    
            db.commit()
            conversations.append(conv)
            
        print("Seeding 1-on-1 Conversations...")
        pairings = [
            (divya, kevin), (divya, ram), (divya, priya), (divya, rahul),
            (kevin, ram), (kevin, priya), (kevin, rahul),
            (ram, priya), (ram, rahul), (priya, rahul),
            (divya, sneha), (kevin, sneha), (ram, sneha),
            (priya, amit), (rahul, amit)
        ]
        
        for u1, u2 in pairings:
            conv = Conversation(is_group=False)
            db.add(conv)
            db.commit()
            db.refresh(conv)
            
            db.add(ConversationMember(conversation_id=conv.id, user_id=u1.id, is_admin=False))
            db.add(ConversationMember(conversation_id=conv.id, user_id=u2.id, is_admin=False))
            db.commit()
            conversations.append(conv)
            
        conversations = db.query(Conversation).all()
        
        print(f"Total conversations created: {len(conversations)} (5 groups + 15 direct)")
        
        print("Seeding Messages...")
        chats_pool = [
            "Hey! How's the project going?",
            "It's going great, just finished writing the backend routers.",
            "Awesome, did you integrate Socket.IO?",
            "Yes! Typing status and read receipts are working smoothly.",
            "Perfect. Let's make sure the styling looks exactly like the design.",
            "On it. I'm using Inter font and zinc colors for a slick dark mode.",
            "Can we add disappearing messages?",
            "Sure, it's already supported in the schema and endpoints.",
            "Great! I am seeding the database with test data.",
            "Outstanding. I will review the API routes shortly.",
            "Let me know if you run into any issues.",
            "Will do. Talk to you later!",
            "Any updates on the frontend integration?",
            "Yes, Next.js 15 is configured with TailwindCSS.",
            "Nice, let's make sure we use React Query for caching.",
            "Absolutely. It keeps client state perfectly in sync.",
            "What about image uploads?",
            "We have a /messages/upload endpoint that saves files locally.",
            "Cool! I'll test it out with some PNGs.",
            "Do we have unread count badges in the sidebar?",
            "Yes, they increment in real time when a new message arrives.",
            "Can group admins remove members?",
            "Yes, group admins have promote, demote, and remove rights.",
            "Excellent work. Let's wrap up this phase.",
            "I'm writing the README file now with setup instructions.",
            "Make sure to explain SQLite WAL mode.",
            "Good call. WAL is crucial for concurrent writes in SQLite.",
            "Also ensure we explain the encryption flow.",
            "Yes, I will explain the base64 protocol."
        ]
        
        message_count = 0
        base_time = datetime.now(timezone.utc) - timedelta(days=5)
        
        for idx, conv in enumerate(conversations):
            members = [m.user for m in conv.members]
            num_members = len(members)
            
            conv_time = base_time + timedelta(hours=idx * 4)
            
            for m_idx in range(15):
                sender = members[m_idx % num_members]
                text_pool_idx = (idx * 5 + m_idx) % len(chats_pool)
                text = chats_pool[text_pool_idx]
                
                msg_time = conv_time + timedelta(minutes=m_idx * 12)
                
                db_msg = Message(
                    conversation_id=conv.id,
                    sender_id=sender.id,
                    text=text,
                    message_type="text",
                    created_at=msg_time
                )
                db.add(db_msg)
                db.commit()
                db.refresh(db_msg)
                
                is_last_message = (m_idx == 14)
                
                for m in conv.members:
                    if m.user_id == sender.id:
                        status_rec = MessageStatus(
                            message_id=db_msg.id,
                            user_id=m.user_id,
                            status="read",
                            updated_at=msg_time
                        )
                        db.add(status_rec)
                    else:
                        if is_last_message and idx % 2 == 0:
                            status_val = "delivered" if idx % 4 == 0 else "sent"
                            status_rec = MessageStatus(
                                message_id=db_msg.id,
                                user_id=m.user_id,
                                status=status_val,
                                updated_at=msg_time + timedelta(seconds=15)
                            )
                        else:
                            status_rec = MessageStatus(
                                message_id=db_msg.id,
                                user_id=m.user_id,
                                status="read",
                                updated_at=msg_time + timedelta(minutes=2)
                            )
                        db.add(status_rec)
                        
                        # Randomly add some reactions
                        if not is_last_message and (m_idx + idx) % 5 == 0:
                            reaction_emoji = "👍" if m_idx % 2 == 0 else "❤️"
                            reaction = MessageReaction(
                                message_id=db_msg.id,
                                user_id=m.user_id,
                                emoji=reaction_emoji,
                                created_at=msg_time + timedelta(minutes=1)
                            )
                            db.add(reaction)
                
                message_count += 1
                
            conv.updated_at = msg_time
            db.commit()
            
        print(f"Successfully seeded {message_count} messages across all conversations!")
        print("Database seeding completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
