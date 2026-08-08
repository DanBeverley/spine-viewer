import { HandleFunction } from "../../types";
import { handle } from "../handle";
import { IDENTIFIERS } from "../identifiers";
import { remove } from "../remove";

export const onAnimationLoopChanged = (cb: HandleFunction<boolean>) => {
    const loopListener = (evt: CustomEvent<{ loop: boolean }>) => {
        cb(evt.detail.loop);
    };

    handle({
        eventId: IDENTIFIERS.ANIMATION_LOOP_CHANGED,
        callback: loopListener
    });

    return () => {
        remove({
            eventId: IDENTIFIERS.ANIMATION_LOOP_CHANGED,
            handler: loopListener
        });
    };
};
