import { HandleFunction } from "../../types";
import { handle } from "../handle";
import { IDENTIFIERS } from "../identifiers";
import { remove } from "../remove";

export const onAnimationTimeScaleChanged = (cb: HandleFunction<number>) => {
    const timeScaleListener = (evt: CustomEvent<{ timeScale: number }>) => {
        cb(evt.detail.timeScale);
    };

    handle({
        eventId: IDENTIFIERS.ANIMATION_TIME_SCALE_CHANGED,
        callback: timeScaleListener
    });

    return () => {
        remove({
            eventId: IDENTIFIERS.ANIMATION_TIME_SCALE_CHANGED,
            handler: timeScaleListener
        });
    };
};
