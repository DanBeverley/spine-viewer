import { dispatch } from "../dispatch";
import { IDENTIFIERS } from "../identifiers";

export const animationLoopChanged = (loop: boolean) => {
    dispatch({
        eventId: IDENTIFIERS.ANIMATION_LOOP_CHANGED,
        detail: { loop }
    });
};
