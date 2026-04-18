from typing import Generic, TypeVar, Optional
from pydantic import BaseModel, Field
import datetime
import uuid

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str

class ResponseMeta(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class StandardResponse(BaseModel, Generic[T]):
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
