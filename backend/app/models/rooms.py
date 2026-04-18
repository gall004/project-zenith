from pydantic import BaseModel

class TokenRequest(BaseModel):
    room_name: str
    participant_identity: str
    participant_name: str = "Participant"

class TokenResponseData(BaseModel):
    token: str
