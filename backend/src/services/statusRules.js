export const ROLE_ALLOWED_STATUS = {
    담당자: ["읽음", "진행중", "완료보고"],
    지시자: ["보완요청", "결재완료"],
};

export function assertStatusAllowed(writerRole, nextStatus) {
    const allowed = ROLE_ALLOWED_STATUS[writerRole];

    if (!allowed || !allowed.includes(nextStatus)) {
        const msg = `${writerRole}는 상태(${nextStatus})로 변경할 수 없습니다.`;
        const err = new Error(msg);
        err.code = "INVALID_ID_STATUS_TRANSITION";
        throw err;
    }
}

