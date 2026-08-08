import events from "../../../events";
import { useSpineViewerStore } from "../../../store";
import PanelCheckbox from "../common/PanelCheckbox";
import AnimationButton from "../common/AnimationButton";
import ActionPanelContent from "../common/ActionPanelContent";
import "./Animations.css";


const Animations = () => {

    const { animations, loopAnimations, timeScale, setLoopAnimations, setTimeScale } = useSpineViewerStore(store => {
        return {
            animations: store.animations,
            loopAnimations: store.loopAnimations,
            timeScale: store.timeScale,
            setLoopAnimations: store.setLoopAnimations,
            setTimeScale: store.setTimeScale
        }
    });

    const handleLoopChange = (loop: boolean) => {
        setLoopAnimations(loop);
        events.dispatchers.animationLoopChanged(loop);
    };

    const handleTimeScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextTimeScale = Number(event.target.value);
        setTimeScale(nextTimeScale);
        events.dispatchers.animationTimeScaleChanged(nextTimeScale);
    };

    const handleAnimationClick = (animation: string) => {
        events.dispatchers.startAnimation({
            animation: animation,
            loop: loopAnimations
        });
    }

    return (
        <ActionPanelContent
            title="Animations"
        >
            <>
                <PanelCheckbox
                    onChange={e => handleLoopChange(e.target.checked)}
                    checked={loopAnimations}
                    label="Play looped animations"
                />

                <div className="animation-speed">
                    <div className="animation-speed__header">
                        <label htmlFor="animation-speed-slider">Speed</label>
                        <output htmlFor="animation-speed-slider">{timeScale.toFixed(1)}×</output>
                    </div>
                    <input
                        id="animation-speed-slider"
                        className="animation-speed__slider"
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={timeScale}
                        onChange={handleTimeScaleChange}
                        aria-label="Animation speed"
                    />
                </div>

                {animations.map(animation => {
                    return (<AnimationButton key={animation} label={animation} onClick={() => handleAnimationClick(animation)} />)
                })}
            </>
        </ActionPanelContent>
    )
}

export default Animations;
