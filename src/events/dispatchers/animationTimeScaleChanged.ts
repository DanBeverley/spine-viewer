import { dispatch } from "../dispatch";
import { IDENTIFIERS } from "../identifiers";

export const animationTimeScaleChanged = (timeScale: number) => {
    dispatch({
        eventId: IDENTIFIERS.ANIMATION_TIME_SCALE_CHANGED,
        detail: { timeScale }
    });
};
