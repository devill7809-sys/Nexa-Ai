export type PendingCall = {
  userId: number;
  conversationId: number;
  toolCall: any;
};

const pendingToolCalls = new Map<string, PendingCall>();

export function setPendingCall(userId: number, conversationId: number, toolCall: any) {
  pendingToolCalls.set(`${userId}:${conversationId}`, { userId, conversationId, toolCall });
}

export function getPendingCall(userId: number, conversationId: number): PendingCall | undefined {
  return pendingToolCalls.get(`${userId}:${conversationId}`);
}

export function deletePendingCall(userId: number, conversationId: number) {
  pendingToolCalls.delete(`${userId}:${conversationId}`);
}
