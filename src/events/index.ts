import { destroyPixiApp } from "./dispatchers/destroyPixiApp";
import { filesLoaded } from "./dispatchers/filesLoaded";
import { setMixin } from "./dispatchers/setMixin";
import { setCanvasBackground } from "./dispatchers/setCanvasBackground";
import { setupPose } from "./dispatchers/setupPose";
import { skinChange } from "./dispatchers/skinChange";
import { spineCreated } from "./dispatchers/spineCreated";
import { startAnimation } from "./dispatchers/startAnimation";
import { timelinePlay } from "./dispatchers/timelinePlay";
import { onDestroyPixiApp } from "./handlers/onDestroyPixiApp";
import { onFilesLoaded } from "./handlers/onFilesLoaded";
import { onSetMixin } from "./handlers/onSetMixin";
import { onSetCanvasBackground } from "./handlers/onSetCanvasBackground";
import { onSetupPose } from "./handlers/onSetupPose";
import { onSkinChange } from "./handlers/onSkinChange";
import { onSpineCreated } from "./handlers/onSpineCreated";
import { onStartAnimation } from "./handlers/onStartAnimation";
import { onTimelinePlay } from "./handlers/onTimelinePlay";
import { spineEvent } from "./dispatchers/spineEvent";
import { onSpineEvent } from "./handlers/onSpineEvent";
import { remove } from "./remove";

const dispatchers = {
    destroyPixiApp,
    filesLoaded,
    setMixin,
    setCanvasBackground,
    setupPose,
    skinChange,
    spineCreated,
    startAnimation,
    timelinePlay,
    spineEvent
};

const handlers = {
    onDestroyPixiApp,
    onFilesLoaded,
    onSetMixin,
    onSetCanvasBackground,
    onSetupPose,
    onSkinChange,
    onSpineCreated,
    onStartAnimation,
    onTimelinePlay,
    onSpineEvent
};

export default {
    dispatchers,
    handlers,
};














