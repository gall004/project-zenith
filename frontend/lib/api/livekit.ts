export interface LiveKitTokenResponseData {
  token: string;
}

export interface StandardResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  meta: {
    timestamp: string;
    request_id: string;
  };
}

export async function fetchLiveKitToken(roomName: string, participantIdentity: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/rooms/tokens`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      room_name: roomName,
      participant_identity: participantIdentity,
      participant_name: "GECX User"
    })
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch LiveKit token. HTTP Status: ${res.status}`);
  }
  
  const payload = (await res.json()) as StandardResponse<LiveKitTokenResponseData>;
  if (payload.error || !payload.data) {
    throw new Error(payload.error?.message || "Unknown API Error");
  }
  
  return payload.data.token;
}
